/**
 * Created by alexey2baranov on 09.12.16.
 */
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
    // await this.importAddresses(ADDROBJPath);
    // await this.importHouses(HOUSEPath);
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

    return new Promise((res, rej) => {
      logger.debug("загрузка домов...");
      var saxStream = sax.createStream(true);
      saxStream.on("error", e => {
        rej(e);
      });
      saxStream.on("opentag", node => {
        try {
          if (node.name == 'House' && node.attributes.STARTDATE < NOW && NOW < node.attributes.ENDDATE) {
            this.client.executeSync("insert-zemla", [node.attributes.HOUSEGUID, node.attributes.AOGUID, null, node.attributes.HOUSENUM, FIASImporter.HOUSE_LEVEL, '-', NOW, NOW, RUSSIA, RUSSIA]);
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

  async getHouseRowsByGUID(GUID, path) {
    let logger = this.logger,
      NOW = new Date().toISOString(),
      rowsCount = 0,
      result = [];

    return new Promise((res, rej) => {
      logger.debug(`Поиск строк HOUSEGUID=${GUID}...`);
      var saxStream = sax.createStream(true);
      saxStream.on("error", e => {
        rej(e);
      });
      saxStream.on("opentag", node => {
        if (node.name == 'House' && node.attributes.HOUSEGUID == GUID) {
          result.push(node);
          logger.debug(node);
        }
      });

      saxStream.on("end", function () {
        logger.debug("Поиск строк завершен");
        res(result);
      });

      fs.createReadStream(path)
        .pipe(saxStream);
    });
  }

  setupParentsAndPaths() {
    let RUSSIA = this.getRUSSIA();

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
      break;
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

    //99 уровень (дома) не влезают в одну операцию поэтому дробим на 100 мелких
    let step = 10000,
      result = this.client.querySync(`select min(id) as "min", max(id) as "max" from "Zemla" where country_id=${RUSSIA} and level=99`)
    let from = Math.floor(parseInt(result[0].min)/1000000)*1000000
    let max = parseInt(result[0].max)

    from = 20900000
    this.logger.info("min: ", from, "max: ", max)

    while (from < max) {
      this.logger.info("indexing houses between ", from, " and ", from+step, "...")
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
             and z.id between ${from} and ${from+step}
        `)
      from+= step
    }


    this.logger.debug("updated parent_id, path");
  }

  validate(){
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

    result= result[0].count
    if (result){
      throw new Error("Some Zemli not parented. Total errors: "+result)
    }
  }
}

FIASImporter.HOUSE_LEVEL = 99;

module.exports = FIASImporter;
