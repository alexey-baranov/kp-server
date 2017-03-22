/**
 * Created by alexey2baranov on 12.03.17.
 */

let fs = require("fs");
let log4js = require("log4js");
var Client = require('pg-native');
var config = require(__dirname + '/../../../cfg/config.json')[process.env.NODE_ENV];

class RowBanckmark {
  constructor() {
    this.logger = log4js.getLogger(this.constructor.name);

    this.client = new Client();
    this.client.connectSync(`postgresql://${config.username}:${config.password}@${config.host}:5432/${config.database}`);
  }

  /**
   * возвращает последний id
   */
  getMaxZEMLA() {
    let result = this.client.querySync(`select max(id) from "Zemla"`);
    if (result[0].id) {
      return parseInt(result[0].id);
    }
    else {
      return null
    }
  }

  async benchmark(work, name) {
    let start = new Date()
    this.logger.debug(`Начало замера [${name}]`)
    await work()
    this.logger.debug(`Конец замера [${name}]. Результат:`, Math.round((new Date().getTime() - start.getTime()) / 1000), "сек")
  }

  async insertIntoZemlaBenchmark() {
    this.logger.info("max(Zemla.id) = ", this.getMaxZEMLA())
    this.benchmark(() => {
      this.client.prepareSync('insert-zemla',
        `insert into "Zemla" ("AOGUID", "PARENTGUID", "SHORTNAME", name, level, path, created_at, updated_at, parent_id, country_id) 
                values ($1::character varying(255), $2::character varying(255), $3::character varying(255), $4::character varying(255), $5::integer, $6::text, $7::timestamp with time zone, $8::timestamp with time zone, $9::bigint, $10::bigint)
                returning id`, 10)
      let NOW = new Date().toISOString()

      for (let n = 0; n < 100000; n++) {
        this.client.executeSync("insert-zemla", [n, null, "SHORTNAME", "OFNAME", 99, '-', NOW, NOW, null, null]);
      }
    }, "insertIntoZemlaBenchmark 100k rows")
  }
}

module.exports = RowBanckmark
