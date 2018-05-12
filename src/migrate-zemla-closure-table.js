/**
 * Created by alexey2baranov on 08.12.16.
 *
 * Импорт идет 14 без индексов и 26 с индексами часов по 3-7 минуты на каждые 100тыс записей и
 * всего импортируется 25 млн строк
 */

const config = require(__dirname + '/../cfg')
let log4js = require("log4js"),
    ClosureTreeMigrater= require("./util/migration/zemla/ClosureTreeMigrater");

log4js.configure(__dirname + '/../cfg/log.js', {
    reloadSecs: 60,
    cwd: __dirname + "/.."
});

let closureTableMigrater= new ClosureTreeMigrater();

(async function () {
  await closureTableMigrater.migrate();
})();


