/**
 * Created by alexey2baranov on 08.12.16.
 *
 * Импорт идет 14 без индексов и 26 с индексами часов по 3-7 минуты на каждые 100тыс записей и
 * всего импортируется 25 млн строк
 */

var config = require(__dirname + '/../cfg/config.json')[process.env.NODE_ENV]
let log4js = require("log4js"),
    RowBenchmark= require("./util/benchmark/RowBanckmark"),
  models= require("./model")


log4js.configure(__dirname + '/../cfg/log.json', {
    reloadSecs: 60,
    cwd: __dirname + "/.."
});

let rowBenchmark= new RowBenchmark();

(async function () {
  await rowBenchmark.insertIntoZemlaBenchmark()
})();


