/**
 * Created by alexey2baranov on 09.12.16.
 */
let _ = require("lodash")
let fs = require("fs");
let log4js = require("log4js");
var config = require(__dirname + '/../../../../../cfg')
const models= require("../../../../model")
let expat = require('node-expat')

/**
 * https://fias.nalog.ru/Updates.aspx
 * импортируется 25 млн строк
 *
 * Импорт идет 2,5 часа на адреса без индексов по 4 сек на каждую тыс записей
 * и 24 часа на дома по 4 сек на каждую тыс записей
 * Всего импортируется 25 млн строк
 * !!!На NODE_ENV=development импортируется в 5 раз медленнее!!!
 *
 * Часть адресов (AOGUID: 'a68a172f-cefc-496b-b070-38887a6e6a82',) на момент парсинья еще не имеют пропарсеных родителей из-за неправильного порядка записей в XML
 * поэтому в таблицу земель добавляется колонка PARENTGUID и после полной загрузки по этой колонке назначаются родители
 *
 * Дома встречаются два раза
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
  }

  /**
   * возвращает идентификатор России
   */
  async getRUSSIA() {
    let Russia = await this.getRussia()
    return parseInt(Russia.id);
  }

  async getRussia() {
    if (!FIASImporter.Russia) {
      let result = await models.Zemla.findOne({
        where: {
          parent_id: 1001,
          name: "Россия"
        }
      })
      if (!result) {
        throw new Error("Не найдена Россия");
      }
      FIASImporter.Russia= result
    }
    return FIASImporter.Russia
  }

  /**
   * Импортирует данные из БД ФИАС
   * @param ADDROBJPath
   * @param HOUSEPath
   */
  async import(ADDROBJPath, HOUSEPath) {
    // await this.importAddresses(ADDROBJPath)
    // await this.importHouses(HOUSEPath)
    await this.setupParents()
    await this.validate()
  }

  /**
   * Импортирует адреса из файла с указанным путем
   * @param RUSSIA
   * @param path
   * @return {Promise}
   */
  async importAddresses(path) {
    let logger = this.logger,
      RUSSIA = await this.getRUSSIA(),
      parser = new expat.Parser('UTF-8'),
      creatings = [], // сохраняемые в данный момент земели
      totalCount=0,
      errorsCount=0

    logger.debug("загрузка адресов...");

    await new Promise((res, rej) => {
      parser.on("error", err => {
        rej(err)
      })
      parser.on("startElement", (name, attrs) => {
        if (name == 'Object' && attrs.LIVESTATUS == 1) {
          totalCount++

          let eachCreating = models.Zemla.create({
            AOGUID: attrs.AOGUID,
            PARENTGUID: attrs.PARENTGUID ? attrs.PARENTGUID : null,
            SHORTNAME: attrs.SHORTNAME,
            name: attrs.OFFNAME,
            level: attrs.AOLEVEL,
            parent_id: null,
            country_id: RUSSIA
          })
            .catch(err => {
              logger.error(attrs, err)
              errorsCount++
            })
            .finally(() => {
              creatings.splice(creatings.indexOf(eachCreating), 1)
              if (creatings < 10 && stream.isPaused()) {
                stream.resume()
              }
            })
          creatings.push(eachCreating)

          if (creatings.length > 15 && !stream.isPaused()) {
            stream.pause()
          }

          if (totalCount % 1000 == 0) {
            logger.info("totalCount:", totalCount, ", errorsCount:", errorsCount)
          }
        }
      })

      parser.on("endElement", (name) => {
        if (name == 'AddressObjects') {
          Promise.all(creatings)
            .then(()=>{
              logger.debug("загрузка адресов завершена. totalCount:", totalCount, ", errorsCount:", errorsCount)
              res(totalCount)
            })
        }
      })

      let stream = fs.createReadStream(path)
      stream.pipe(parser)
    })
  }

  /**
   *
   * @param path
   */
  async importHouses(path) {
    /**
     * дома загружаются после этого
     * @type {boolean}
     */
    let logger = this.logger,
      RUSSIA = await this.getRUSSIA(),
      parser = new expat.Parser('UTF-8'),
      creatings = [], // сохраняемые в данный момент земели
      totalCount=0,
      errorsCount=0,
      NOW= new Date().toISOString()

    logger.debug("загрузка адресов...");

    await new Promise((res, rej) => {
      parser.on("error", err => {
        rej(err)
      })

      parser.on("startElement", (name, attrs) => {
        if (name == 'House' && attrs.STARTDATE < NOW && NOW < attrs.ENDDATE) {
          totalCount++

          if (!(attrs.HOUSENUM || attrs.STRUCNUM || attrs.BUILDNUM)) {
            logger.warn("HOUSENUM and STRUCNUM and BUILDNUM are empty", json.stringify(attrs))
            errorsCount++
            return
          }

          let eachCreating = models.Zemla.create({
            AOGUID: attrs.HOUSEGUID,
            PARENTGUID: attrs.AOGUID ? attrs.AOGUID : null,
            SHORTNAME: attrs.HOUSENUM ? "д" : (attrs.STRUCNUM ? "стр" : "корп"),
            name: attrs.HOUSENUM || attrs.STRUCNUM || attrs.BUILDNUM,
            level: FIASImporter.HOUSE_LEVEL,
            parent_id: null,
            country_id: RUSSIA
          })
            .catch(err => {
              logger.error(attrs, err)
              errorsCount++
            })
            .finally(() => {
              creatings.splice(creatings.indexOf(eachCreating), 1)
              if (creatings < 10 && stream.isPaused()) {
                stream.resume()
              }
            })

          creatings.push(eachCreating)

          if (creatings.length > 15 && !stream.isPaused()) {
            stream.pause()
          }

          if (totalCount % 1000 == 0) {
            logger.info("totalCount:", totalCount, ", errorsCount:", errorsCount)
          }
        }
      })

      parser.on("endElement", (name) => {
        if (name == 'Houses') {
          Promise.all(creatings)
            .then(()=>{
              logger.debug("загрузка адресов завершена. totalCount:", totalCount, ", errorsCount:", errorsCount)
              res(totalCount)
            })
        }
      })

      let stream = fs.createReadStream(path)
      stream.pipe(parser)
    })
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
        if (node.name == 'House' && node.attrs.ENDDATE > NOW) {
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
        if (node.name == 'House' && GUID.indexOf(node.attrs.HOUSEGUID) != -1) {
          if (!result.has(node.attrs.HOUSEGUID)) {
            result.set(node.attrs.HOUSEGUID, [])
          }
          result.get(node.attrs.HOUSEGUID).push(node)
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

  /**
   * устанавливает родителя всем его дочкам
   * рекурсивный метод быстрее потому что требует однократной загрузки каждой ноды
   *
   * @param parent
   * @returns {Promise<void>}
   */
  async setupParentsRecurs(parent){
    //найти деток
    let childs = await models.Zemla.findAll({
      where:{
        PARENTGUID: parent.AOGUID,
        country_id: await this.getRUSSIA(),
      }
    })

    //присвоить всем деткам себя
    await Promise.all(childs.map(eachChild=>eachChild.setParent2(parent)))

    //если totalCount перевалил через следующую тысячу вывожу его
    let modBefore= FIASImporter.totalCount % 1000
    FIASImporter.totalCount+= childs.length
    if (FIASImporter.totalCount % 1000 < modBefore) {
      this.logger.info("totalCount:", FIASImporter.totalCount-FIASImporter.totalCount % 1000)
    }

    //повторить тоже самое для всех деток
    for(let eachChild of childs){
      //дома пропускаем, потому что у них нет дочек
      if (eachChild.level== FIASImporter.HOUSE_LEVEL){
        return
      }
      await this.setupParentsRecurs(eachChild)
    }
  }

  async setupParents() {
    let Russia = await this.getRussia()
    FIASImporter.totalCount=0

    this.logger.debug("updating region's parents...")

    //регионы (level=1) настраиваются отдельно, потому что у них нет PARENTGUID
    let regions = await models.Zemla.findAll({
      where:{
        country_id: Russia.id,
        level: 1
      }
    })


      for(let eachRegion of regions) {
        await eachRegion.setParent2(Russia)
        await this.setupParentsRecurs(eachRegion)
      }

      this.logger.debug("updating parents done");
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
        )
    `)

    result = +result[0].count
    if (result) {
      throw new Error("Some Zemli not parented. Total errors: " + result)
    }
  }
}

FIASImporter.HOUSE_LEVEL = 99

/**
 * общее количество обработанных нод
 * @type {number}
 */
FIASImporter.totalCount = 0

module.exports = FIASImporter


















