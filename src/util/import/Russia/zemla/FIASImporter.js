/**
 * Created by alexey2baranov on 09.12.16.
 */
let _ = require("lodash")
let sax = require("sax");
let fs = require("fs");
let log4js = require("log4js");
var Client = require('pg-native');
var config = require(__dirname + '/../../../../../cfg/config.json')[process.env.NODE_ENV];

/**
 * https://fias.nalog.ru/Updates.aspx
 * импортируется 25 млн строк
 *

 * Часть адресов (AOGUID: 'a68a172f-cefc-496b-b070-38887a6e6a82',) на момент парсинья еще не имеют пропарсеных родителей из-за неправильного порядка записей в XML
 * поэтому в таблицу земель добавляется колонка PARENTGUID и после полной загрузки по этой колонке назначаются родители
 *
 * Дома встречаются два раза
 * 0123c5ec-3f20-46e8-9e55-2d66acf6976b - эта пролетает по полю STARTDATE=2021 год
 * 43cbf44f-3c30-4656-98ac-839f49e12dee
 * 2831d031-8ea7-4ff1-82df-50693cc94320
 * 3a47fb65-ee60-40a3-a9d9-67edfc750d94
 * 3d61e55d-be48-4c9e-b434-a3ac668b78e7
 * 4ffc802f-117b-4e22-acb9-1b8fa70bca44
 * 546023ce-d9a8-432b-a2bc-61e1b6da2101
 * 5d7f234f-fcd0-452e-a345-ec2e1d4aebfc
 *
 * уровни адресых объектов IFNS
 -1 - Русь
 0- Россия
 1 – уровень региона
 2 – уровень автономного округа (устаревшее)
 3 – уровень района
 35 – уровень городских и сельских поселений
 4 – уровень города
 5 – уровень внутригородской территории (устаревшее)
 6 – уровень населенного пункта
 65 – планировочная структура
 7 – уровень улицы
 75 – земельный участок
 8 – здания, сооружения, объекта незавершенного строительства
 9 – уровень помещения в пределах здания, сооружения
 90 – уровень дополнительных территорий (устаревшее)
 91 – уровень объектов на дополнительных территориях (устаревшее)

 99 (FIASImporter.HOUSE_LEVEL) - псевдоуровень (я сам ввел) для домов и пр. строений
 */
class FIASImporter {
  constructor() {
    this.logger = log4js.getLogger("FIASImporter");

    this.client = new Client();
    this.client.connectSync(`postgresql://${config.username}:${config.password}@${config.host}:5432/${config.database}`);

    this.client.prepareSync('insert-zemla',
      `insert into "Zemla" ("AOGUID", "PARENTGUID", "SHORTNAME", name, level, path, created_at, updated_at, parent_id, country_id) 
                values ($1::character varying(255), $2::character varying(255), $3::character varying(255), $4::character varying(255), $5::integer, $6::text, $7::timestamp with time zone, $8::timestamp with time zone, $9::bigint, $10::bigint)
                returning id`, 10);
  }

  /**
   * возвращает идентификатор России
   */
  getRUSSIA() {
    let result = this.client.querySync(`select * from "Zemla" where name='Россия' and parent_id=101`);
    if (!result.length) {
      throw new Error("Не найдена Россия");
    }
    else if (result.length > 1) {
      throw new Error("Более одной записи БД подходит под Россию");
    }
    return parseInt(result[0].id);
  }

  /**
   * Импортирует данные из БД ФИАС
   * @param ADDROBJPath
   * @param HOUSEPath
   */
  async import(ADDROBJPath, HOUSEPath) {
    await this.importAddresses(ADDROBJPath);
    await this.importHouses(HOUSEPath);
    await this.setupParentsAndPaths();
    await this.validate()
  }

  /**
   * Импортирует адреса из файла с указанным путем
   * @param RUSSIA
   * @param path
   * @return {Promise}
   */
  importAddresses(path) {
    let logger = this.logger,
      NOW = new Date().toISOString(),
      rowsCount = 0,
      RUSSIA = this.getRUSSIA();

    return new Promise((res, rej) => {
      logger.debug("загрузка адресов...");
      var saxStream = sax.createStream(true);
      saxStream.on("error", e => {
        rej(e);
      });
      saxStream.on("opentag", node => {
        try {
          if (node.name == 'Object' && node.attributes.LIVESTATUS == 1) {
            this.client.executeSync("insert-zemla", [node.attributes.AOGUID, node.attributes.PARENTGUID ? node.attributes.PARENTGUID : null, node.attributes.SHORTNAME, node.attributes.OFFNAME, node.attributes.AOLEVEL, '-', NOW, NOW, RUSSIA, RUSSIA]);
            rowsCount++;
            if (rowsCount % 100000 == 0) {
              logger.debug("total rows: ", rowsCount);
            }
          }

        }
        catch (er) {
          logger.error(node, er);
        }
      });

      saxStream.on("end", function () {
        logger.debug("загрузка адресов завершена. ИТОГО:", rowsCount);
        res(rowsCount);
      });

      fs.createReadStream(path)
        .pipe(saxStream);
    });
  }

  /**
   *
   * @param path
   */
  async importHouses(path) {
    let logger = this.logger,
      NOW = new Date().toISOString(),
      rowsCount = 0,
      RUSSIA = this.getRUSSIA();

    /**
     * дома загружаются после этого
     * @type {boolean}
     */
    let lastImportedDomGUID/* = "d3c00fe6-301c-4b3b-bff0-9934e064e006"*/,
      isLastImportedDomFound = false

    return new Promise((res, rej) => {
      logger.debug("загрузка домов...");
      var saxStream = sax.createStream(true);
      saxStream.on("error", e => {
        rej(e);
      });
      saxStream.on("opentag", node => {
        try {
          if (node.name == 'House' && node.attributes.STARTDATE < NOW && NOW < node.attributes.ENDDATE) {
            if (lastImportedDomGUID && isLastImportedDomFound) {
              this.client.executeSync("insert-zemla", [node.attributes.HOUSEGUID, node.attributes.AOGUID, null, node.attributes.HOUSENUM, FIASImporter.HOUSE_LEVEL, '-', NOW, NOW, RUSSIA, RUSSIA]);
            }
            else if (node.attributes.HOUSEGUID == lastImportedDomGUID) {
              isLastImportedDomFound = true
              logger.debug("Last Imported Dom Found")
            }

            rowsCount++;
            if (rowsCount % 100000 == 0) {
              logger.debug("total rows: ", rowsCount);
            }
          }
        }
        catch (er) {
          logger.error(node, er);
        }
      });

      saxStream.on("end", function () {
        logger.debug("загрузка домов завершена. ИТОГО:", rowsCount);
        res(rowsCount);
      });

      fs.createReadStream(path)
        .pipe(saxStream);
    });
  }

  async getHouseCount(path) {
    let logger = this.logger,
      NOW = new Date().toISOString(),
      rowsCount = 0;

    return new Promise((res, rej) => {
      logger.debug("Подсчет домов...");
      var saxStream = sax.createStream(true);
      saxStream.on("error", e => {
        rej(e);
      });
      saxStream.on("opentag", node => {
        if (node.name == 'House' && node.attributes.ENDDATE > NOW) {
          rowsCount++;
          if (rowsCount % 100000 == 0) {
            logger.debug("total rows: ", rowsCount);
          }
        }
      });

      saxStream.on("end", function () {
        logger.debug("Подсчет домов завершен. ИТОГО:", rowsCount);
        res(rowsCount);
      });

      fs.createReadStream(path)
        .pipe(saxStream);
    });
  }

  async getHouseRowsByGUID(path, GUID) {
    let logger = this.logger,
      NOW = new Date().toISOString(),
      rowsCount = 0,
      result = new Map();

    if (!_.isArray(GUID)) {
      GUID = [GUID]
    }

    return new Promise((res, rej) => {
      logger.debug(`Поиск домов HOUSEGUID=${GUID}...`)
      var saxStream = sax.createStream(true)
      saxStream.on("error", e => {
        rej(e);
      })
      saxStream.on("opentag", node => {
        if (node.name == 'House' && GUID.indexOf(node.attributes.HOUSEGUID) != -1) {
          if (!result.has(node.attributes.HOUSEGUID)) {
            result.set(node.attributes.HOUSEGUID, [])
          }
          result.get(node.attributes.HOUSEGUID).push(node)
          logger.debug(node)
        }
      })

      saxStream.on("end", function () {
        logger.debug("Поиск строк завершен");
        res(result);
      })

      fs.createReadStream(path)
        .pipe(saxStream);
    });
  }

  setupParentsAndPaths() {
    let RUSSIA = this.getRUSSIA();

    if (0) {
      this.logger.debug("updating parent_id, path (level 1)...");

      //регионы настраиваются отдельно потому что у них нет PARENTGUID
      let count = this.client.querySync(`
            update
            "Zemla" z
            
            set
            parent_id= p.id,
            path= p.path||p.id||'/'
            
            from
            "Zemla" p
            
            where
            z.level=1
            and z.country_id=${RUSSIA}
            and p.id=${RUSSIA}
        `);


      //все остальные адреса настраиваются по PARENTGUID
      for (let eachLevel of [3, 4, 5, 6, 7, 65, 90, 91]) {
        this.logger.debug(`updating parent_id, path (level ${eachLevel})...`);

        this.client.querySync(`
            update 
            "Zemla" z
            
            set 
            parent_id= p.id,
            path= p.path||p.id||'/' 
            
            from 
            "Zemla" p
            
            where
             z.country_id=${RUSSIA}
             and z.level = ${eachLevel}
             and p."AOGUID"=z."PARENTGUID"
        `)
      }
    }

    //99 уровень (дома) не влезают в одну операцию поэтому дробим на 100 мелких
    let step = 10000,
      result = this.client.querySync(`select min(id) as "min", max(id) as "max" from "Zemla" where country_id=${RUSSIA} and level=99`)
    let from = Math.floor(parseInt(result[0].min) / 10000) * 10000
    let max = parseInt(result[0].max)

    this.logger.info("min: ", from, "max: ", max)


    from= 5590000
    while (from < max) {
      this.logger.info("indexing houses between ", from, " and ", from + step, "...")
      this.client.querySync(`
            update 
            "Zemla" z
            
            set 
            parent_id= p.id,
            path= p.path||p.id||'/' 
            
            from 
            "Zemla" p
            
            where
             z.country_id=${RUSSIA}            
             and z.level = ${FIASImporter.HOUSE_LEVEL}
             and p."AOGUID"=z."PARENTGUID"
             and z.id between ${from} and ${from + step}
        `)
      from += step
    }


    this.logger.debug("updated parent_id, path");
  }

  validate() {
    this.logger.info("validating...")
    let result = this.client.querySync(`
      select count(*) as count 
      from 
        "Zemla" 
      
      where 
        country_id=${this.getRUSSIA()} 
        and (
          parent_id is null 
          or path ='-'
        )
    `)

    result = +result[0].count
    if (result) {
      throw new Error("Some Zemli not parented. Total errors: " + result)
    }
  }
}

FIASImporter.HOUSE_LEVEL = 99;

module.exports = FIASImporter;

let dublecates = [
  ["668fff0c-452a-4ca3-b968-ef487bb3c3cb", [
  {
    "name": "House",
    "attributes": {
      "HOUSEID": "8730ea68-b081-4ff6-a607-0dd514856d27",
      "HOUSEGUID": "668fff0c-452a-4ca3-b968-ef487bb3c3cb",
      "AOGUID": "8ca4ff42-7c61-4265-899a-f05637cea332",
      "STRUCNUM": "3",
      "STRSTATUS": "1",
      "ESTSTATUS": "0",
      "STATSTATUS": "0",
      "IFNSFL": "4825",
      "IFNSUL": "4825",
      "OKATO": "42401370000",
      "OKTMO": "42701000",
      "POSTALCODE": "398001",
      "STARTDATE": "2015-09-30",
      "ENDDATE": "2079-06-06",
      "UPDATEDATE": "2017-01-20",
      "COUNTER": "14",
      "DIVTYPE": "2"
    }, "isSelfClosing": true
  },
  {
    "name": "House",
    "attributes": {
      "HOUSEID": "8b8d2fb9-7b50-4f0a-b4b3-efa875983cb4",
      "HOUSEGUID": "668fff0c-452a-4ca3-b968-ef487bb3c3cb",
      "AOGUID": "8ca4ff42-7c61-4265-899a-f05637cea332",
      "STRUCNUM": "3",
      "STRSTATUS": "1",
      "ESTSTATUS": "0",
      "STATSTATUS": "0",
      "IFNSFL": "4827",
      "IFNSUL": "4827",
      "TERRIFNSFL": "4826",
      "TERRIFNSUL": "4826",
      "OKATO": "42401375000",
      "OKTMO": "42701000",
      "POSTALCODE": "398001",
      "STARTDATE": "2013-01-16",
      "ENDDATE": "2079-06-06",
      "UPDATEDATE": "2017-01-20",
      "COUNTER": "11",
      "DIVTYPE": "0"
    }, "isSelfClosing": true
  }]],
  ["4ffc802f-117b-4e22-acb9-1b8fa70bca44", [
    {
      "name": "House",
      "attributes": {
        "HOUSEID": "785cf719-7998-4ef3-9f9c-5ea0febaeed5",
        "HOUSEGUID": "4ffc802f-117b-4e22-acb9-1b8fa70bca44",
        "AOGUID": "b5625491-6396-435e-91b4-456f51523bc3",
        "HOUSENUM": "22",
        "STRSTATUS": "0",
        "ESTSTATUS": "3",
        "STATSTATUS": "0",
        "IFNSFL": "6949",
        "IFNSUL": "6949",
        "OKATO": "28247831001",
        "OKTMO": "28647431101",
        "POSTALCODE": "171418",
        "STARTDATE": "2014-01-10",
        "ENDDATE": "2079-06-06",
        "UPDATEDATE": "2016-11-14",
        "COUNTER": "25",
        "DIVTYPE": "0"
      }, "isSelfClosing": true
    }, {
      "name": "House",
      "attributes": {
        "HOUSEID": "24b42a07-d833-416a-9550-c5b15c9a7b1e",
        "HOUSEGUID": "4ffc802f-117b-4e22-acb9-1b8fa70bca44",
        "AOGUID": "b5625491-6396-435e-91b4-456f51523bc3",
        "HOUSENUM": "22кв1",
        "STRSTATUS": "0",
        "ESTSTATUS": "3",
        "STATSTATUS": "0",
        "IFNSFL": "6949",
        "IFNSUL": "6949",
        "OKATO": "28247831001",
        "OKTMO": "28647431101",
        "POSTALCODE": "171418",
        "STARTDATE": "2014-01-10",
        "ENDDATE": "2079-06-06",
        "UPDATEDATE": "2016-11-14",
        "COUNTER": "21",
        "NORMDOC": "bbbc48bc-437a-48af-9a72-82a693d278bc",
        "DIVTYPE": "0"
      }, "isSelfClosing": true
    }]],
  ["e77cf129-edf2-46db-9e04-21c3b1cb2d8c",
    [
      {
        "name": "House",
        "attributes": {
          "HOUSEID": "7f150da1-c8a2-486f-b766-31aa368b9b02",
          "HOUSEGUID": "e77cf129-edf2-46db-9e04-21c3b1cb2d8c",
          "AOGUID": "c7e8f58a-3f94-4a91-95e5-fdc9190f8de2",
          "HOUSENUM": "43",
          "STRSTATUS": "0",
          "ESTSTATUS": "2",
          "STATSTATUS": "0",
          "IFNSFL": "6686",
          "IFNSUL": "6686",
          "OKATO": "65401905001",
          "OKTMO": "65701000186",
          "POSTALCODE": "620907",
          "STARTDATE": "2016-02-11",
          "ENDDATE": "2079-06-06",
          "UPDATEDATE": "2016-11-10",
          "COUNTER": "61",
          "NORMDOC": "b716fd46-d09d-49a3-a913-a029b652a920",
          "DIVTYPE": "2"
        }, "isSelfClosing": true
      },
      {
        "name": "House",
        "attributes": {
          "HOUSEID": "15b258cb-072b-4fa9-83ad-f0af7cff9ec8",
          "HOUSEGUID": "e77cf129-edf2-46db-9e04-21c3b1cb2d8c",
          "AOGUID": "c7e8f58a-3f94-4a91-95e5-fdc9190f8de2",
          "HOUSENUM": "43",
          "STRSTATUS": "0",
          "ESTSTATUS": "3",
          "STATSTATUS": "0",
          "IFNSFL": "6686",
          "IFNSUL": "6686",
          "OKATO": "65401905001",
          "OKTMO": "65701000186",
          "POSTALCODE": "620907",
          "STARTDATE": "2014-01-04",
          "ENDDATE": "2079-06-06",
          "UPDATEDATE": "2016-11-10",
          "COUNTER": "11",
          "DIVTYPE": "0"
        }, "isSelfClosing": true
      }]], ["cf442162-ac4e-4ce2-a11e-28ad38bec7bb", [{
    "name": "House", "attributes": {
      "HOUSEID": "cf442162-ac4e-4ce2-a11e-28ad38bec7bb",
      "HOUSEGUID": "cf442162-ac4e-4ce2-a11e-28ad38bec7bb",
      "AOGUID": "c7e8f58a-3f94-4a91-95e5-fdc9190f8de2",
      "HOUSENUM": "1",
      "STRSTATUS": "0",
      "ESTSTATUS": "3",
      "STATSTATUS": "0",
      "IFNSFL": "6686",
      "IFNSUL": "6686",
      "OKATO": "65401905001",
      "OKTMO": "65701000",
      "POSTALCODE": "620907",
      "STARTDATE": "1900-01-01",
      "ENDDATE": "2014-01-04",
      "UPDATEDATE": "2012-03-06",
      "COUNTER": "15",
      "DIVTYPE": "0"
    }, "isSelfClosing": true
  }, {
    "name": "House", "attributes": {
      "HOUSEID": "024593fb-308b-47b7-9b5c-37e8feb780ba",
      "HOUSEGUID": "cf442162-ac4e-4ce2-a11e-28ad38bec7bb",
      "AOGUID": "c7e8f58a-3f94-4a91-95e5-fdc9190f8de2",
      "HOUSENUM": "1",
      "STRSTATUS": "0",
      "ESTSTATUS": "2",
      "STATSTATUS": "0",
      "IFNSFL": "6686",
      "IFNSUL": "6686",
      "OKATO": "65401905001",
      "OKTMO": "65701000186",
      "POSTALCODE": "620907",
      "STARTDATE": "2016-02-11",
      "ENDDATE": "2079-06-06",
      "UPDATEDATE": "2016-11-10",
      "COUNTER": "53",
      "NORMDOC": "2aa4208d-2ea9-481e-9871-c4fe237b7b97",
      "DIVTYPE": "2"
    }, "isSelfClosing": true
  }, {
    "name": "House", "attributes": {
      "HOUSEID": "ad6e2908-7228-4ba5-a5cd-da1b860b46ba",
      "HOUSEGUID": "cf442162-ac4e-4ce2-a11e-28ad38bec7bb",
      "AOGUID": "c7e8f58a-3f94-4a91-95e5-fdc9190f8de2",
      "HOUSENUM": "1",
      "STRSTATUS": "0",
      "ESTSTATUS": "3",
      "STATSTATUS": "0",
      "IFNSFL": "6686",
      "IFNSUL": "6686",
      "OKATO": "65401905001",
      "OKTMO": "65701000186",
      "POSTALCODE": "620907",
      "STARTDATE": "2014-01-04",
      "ENDDATE": "2079-06-06",
      "UPDATEDATE": "2016-11-10",
      "COUNTER": "15",
      "DIVTYPE": "0"
    }, "isSelfClosing": true
  }]], ["7ba3bb7f-d9f3-4c24-85ba-877c5b6ca16d", [{
    "name": "House", "attributes": {
      "HOUSEID": "7ba3bb7f-d9f3-4c24-85ba-877c5b6ca16d",
      "HOUSEGUID": "7ba3bb7f-d9f3-4c24-85ba-877c5b6ca16d",
      "AOGUID": "965065bd-1445-45e4-bff6-e40a966805ca",
      "HOUSENUM": "2",
      "STRSTATUS": "0",
      "ESTSTATUS": "2",
      "STATSTATUS": "0",
      "IFNSFL": "4177",
      "IFNSUL": "4177",
      "TERRIFNSFL": "4105",
      "TERRIFNSUL": "4105",
      "OKATO": "30402000000",
      "OKTMO": "30607101",
      "STARTDATE": "1900-01-01",
      "ENDDATE": "2011-12-13",
      "UPDATEDATE": "2012-02-20",
      "COUNTER": "7",
      "DIVTYPE": "0"
    }, "isSelfClosing": true
  }, {
    "name": "House", "attributes": {
      "HOUSEID": "bbf984c7-97ce-4f5a-86dd-b6aef178449c",
      "HOUSEGUID": "7ba3bb7f-d9f3-4c24-85ba-877c5b6ca16d",
      "AOGUID": "965065bd-1445-45e4-bff6-e40a966805ca",
      "HOUSENUM": "2",
      "STRSTATUS": "0",
      "ESTSTATUS": "2",
      "STATSTATUS": "0",
      "IFNSFL": "4177",
      "IFNSUL": "4177",
      "TERRIFNSFL": "4105",
      "TERRIFNSUL": "4105",
      "OKATO": "30402000000",
      "OKTMO": "30607101",
      "POSTALCODE": "684000",
      "STARTDATE": "2011-12-13",
      "ENDDATE": "2079-06-06",
      "UPDATEDATE": "2017-01-17",
      "COUNTER": "305",
      "NORMDOC": "be36b29c-fb8a-43e2-9909-5137fce54c03",
      "DIVTYPE": "0"
    }, "isSelfClosing": true
  }, {
    "name": "House", "attributes": {
      "HOUSEID": "d03eea64-3978-444f-8c23-e6a72bfab72f",
      "HOUSEGUID": "7ba3bb7f-d9f3-4c24-85ba-877c5b6ca16d",
      "AOGUID": "965065bd-1445-45e4-bff6-e40a966805ca",
      "HOUSENUM": "2б",
      "STRSTATUS": "0",
      "ESTSTATUS": "2",
      "STATSTATUS": "17",
      "IFNSFL": "4177",
      "IFNSUL": "4177",
      "TERRIFNSFL": "4105",
      "TERRIFNSUL": "4105",
      "OKATO": "30402000000",
      "OKTMO": "30607101",
      "POSTALCODE": "684000",
      "STARTDATE": "2013-12-09",
      "ENDDATE": "2079-06-06",
      "UPDATEDATE": "2017-01-17",
      "COUNTER": "370",
      "NORMDOC": "2c3878a1-2f2d-49bb-bbf0-b5eb15edf9a7",
      "DIVTYPE": "0"
    }, "isSelfClosing": true
  }]], ["bc92d19b-7d71-440b-ae4b-96a8ecce7a72", [{
    "name": "House", "attributes": {
      "HOUSEID": "bc92d19b-7d71-440b-ae4b-96a8ecce7a72",
      "HOUSEGUID": "bc92d19b-7d71-440b-ae4b-96a8ecce7a72",
      "AOGUID": "c7e8f58a-3f94-4a91-95e5-fdc9190f8de2",
      "HOUSENUM": "3А",
      "STRSTATUS": "0",
      "ESTSTATUS": "3",
      "STATSTATUS": "0",
      "IFNSFL": "6686",
      "IFNSUL": "6686",
      "OKATO": "65401905001",
      "OKTMO": "65701000",
      "POSTALCODE": "620907",
      "STARTDATE": "1900-01-01",
      "ENDDATE": "2014-01-04",
      "UPDATEDATE": "2012-03-06",
      "COUNTER": "48",
      "DIVTYPE": "0"
    }, "isSelfClosing": true
  }, {
    "name": "House", "attributes": {
      "HOUSEID": "4d32a73f-a2eb-45ff-b8a7-b49d7b16721f",
      "HOUSEGUID": "bc92d19b-7d71-440b-ae4b-96a8ecce7a72",
      "AOGUID": "c7e8f58a-3f94-4a91-95e5-fdc9190f8de2",
      "HOUSENUM": "3А",
      "STRSTATUS": "0",
      "ESTSTATUS": "3",
      "STATSTATUS": "0",
      "IFNSFL": "6686",
      "IFNSUL": "6686",
      "OKATO": "65401905001",
      "OKTMO": "65701000186",
      "POSTALCODE": "620907",
      "STARTDATE": "2014-01-04",
      "ENDDATE": "2079-06-06",
      "UPDATEDATE": "2016-11-10",
      "COUNTER": "48",
      "DIVTYPE": "0"
    }, "isSelfClosing": true
  }, {
    "name": "House", "attributes": {
      "HOUSEID": "45ea8cb7-abce-431a-95b1-e38c9ea10bdc",
      "HOUSEGUID": "bc92d19b-7d71-440b-ae4b-96a8ecce7a72",
      "AOGUID": "c7e8f58a-3f94-4a91-95e5-fdc9190f8de2",
      "HOUSENUM": "3а",
      "STRSTATUS": "0",
      "ESTSTATUS": "2",
      "STATSTATUS": "0",
      "IFNSFL": "6686",
      "IFNSUL": "6686",
      "OKATO": "65401905001",
      "OKTMO": "65701000186",
      "POSTALCODE": "620907",
      "STARTDATE": "2016-02-11",
      "ENDDATE": "2079-06-06",
      "UPDATEDATE": "2016-11-10",
      "COUNTER": "68",
      "NORMDOC": "64f2faf1-0ab8-4008-b54a-f06933cdf333",
      "DIVTYPE": "2"
    }, "isSelfClosing": true
  }]], ["4cdf6040-0ad1-4592-9ba6-aab4a1e2d321", [{
    "name": "House", "attributes": {
      "HOUSEID": "289dcb21-eefc-4274-aeee-a5285ef9bf4c",
      "HOUSEGUID": "4cdf6040-0ad1-4592-9ba6-aab4a1e2d321",
      "AOGUID": "c7e8f58a-3f94-4a91-95e5-fdc9190f8de2",
      "HOUSENUM": "1А",
      "STRSTATUS": "0",
      "ESTSTATUS": "3",
      "STATSTATUS": "0",
      "IFNSFL": "6686",
      "IFNSUL": "6686",
      "OKATO": "65401905001",
      "OKTMO": "65701000186",
      "POSTALCODE": "620907",
      "STARTDATE": "2014-01-04",
      "ENDDATE": "2079-06-06",
      "UPDATEDATE": "2016-11-10",
      "COUNTER": "49",
      "DIVTYPE": "0"
    }, "isSelfClosing": true
  }, {
    "name": "House", "attributes": {
      "HOUSEID": "4cdf6040-0ad1-4592-9ba6-aab4a1e2d321",
      "HOUSEGUID": "4cdf6040-0ad1-4592-9ba6-aab4a1e2d321",
      "AOGUID": "c7e8f58a-3f94-4a91-95e5-fdc9190f8de2",
      "HOUSENUM": "1А",
      "STRSTATUS": "0",
      "ESTSTATUS": "3",
      "STATSTATUS": "0",
      "IFNSFL": "6686",
      "IFNSUL": "6686",
      "OKATO": "65401905001",
      "OKTMO": "65701000",
      "POSTALCODE": "620907",
      "STARTDATE": "1900-01-01",
      "ENDDATE": "2014-01-04",
      "UPDATEDATE": "2012-03-06",
      "COUNTER": "49",
      "DIVTYPE": "0"
    }, "isSelfClosing": true
  }, {
    "name": "House", "attributes": {
      "HOUSEID": "df21f9ea-fe19-4c87-8e66-b1c1213aa741",
      "HOUSEGUID": "4cdf6040-0ad1-4592-9ba6-aab4a1e2d321",
      "AOGUID": "c7e8f58a-3f94-4a91-95e5-fdc9190f8de2",
      "HOUSENUM": "1а",
      "STRSTATUS": "0",
      "ESTSTATUS": "2",
      "STATSTATUS": "0",
      "IFNSFL": "6686",
      "IFNSUL": "6686",
      "OKATO": "65401905001",
      "OKTMO": "65701000186",
      "POSTALCODE": "620907",
      "STARTDATE": "2016-02-11",
      "ENDDATE": "2079-06-06",
      "UPDATEDATE": "2016-11-10",
      "COUNTER": "66",
      "NORMDOC": "721d164c-9051-4925-bc72-43ce077ef493",
      "DIVTYPE": "1"
    }, "isSelfClosing": true
  }]]
]




















