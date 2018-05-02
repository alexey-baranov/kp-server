/**
 * Created by alexey2baranov on 09.12.16.
 */
let _ = require("lodash")
let log4js = require("log4js")
var config = require('../../../../cfg')

let model= require("../../../model")

/**
 * миграция materializedPath в Closure Tree
 * https://fias.nalog.ru/Updates.aspx
 * всего 25 млн строк
 *
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
class ClosureTreeMigrater {
  static get BATCH_SIZE(){
    return 1000
  }

  constructor() {
    this.log = log4js.getLogger("ClosureTreeMigrater")
    this.sequelize = require("../../../model").sequelize
  }

  /**
   * Импортирует данные из БД ФИАС
   * @param ADDROBJPath
   * @param HOUSEPath
   */
  async migrate() {
    await this.truncateZemlaTree()
    await this.createSelfSelfRows()
    await this.createBolsheMensheRows()
    await this.validate()
  }

  async truncateZemlaTree() {
    this.log.debug("truncateZemlaTree...")
    await this.sequelize.query(`truncate     "ZemlaTree"`)
    this.log.debug("truncateZemlaTree done")
  }

  /**
   * создает начальные строки (bolshe_id, menshe_id) (self_id, self_id)
   *
   * @return {Promise}
   */
  async createSelfSelfRows() {
    this.log.debug("createSelfSelfRows...")
    await this.sequelize.query(`
    delete from "ZemlaTree"; 
    
    INSERT INTO "ZemlaTree"(
            deep, created_at, updated_at, deleted_at, menshe_id, bolshe_id)
    select  0,    created_at, created_at, deleted_at, id,        id         from "Zemla" ;
    `)
    this.log.debug("createSelfSelfRows done")
  }

  async createBolsheMensheRows() {
    this.log.debug("createBolsheMensheRows...")
    let max = (await this.sequelize.query(`select max (id) from "ZemlaTree"`, {
      type: this.sequelize.Sequelize.QueryTypes.SELECT
    }))[0].max

    this.log.info("max id", max)
    let cur = 0
    while (cur <= max) {
      let zemli = await model.Zemla.findAll({
        where: {
          id: {
            $between: [cur, cur + ClosureTreeMigrater.BATCH_SIZE-1]
          },
          parent_id: {
            $not: null
          }
        }
      })
      for(let eachZemla of zemli){
        await eachZemla.setParent2(await eachZemla.getParent())
      }
      this.log.debug("cur", cur)
      cur+= ClosureTreeMigrater.BATCH_SIZE
    }

    this.log.debug("createBolsheMensheRows done")
  }

  async validate() {

  }
}



module.exports = ClosureTreeMigrater
