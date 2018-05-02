/**
 * Created by alexey2baranov on 08.12.16.
 *
 * Импорт идет 14 без индексов и 26 с индексами часов по 3-7 минуты на каждые 100тыс записей и
 * всего импортируется 25 млн строк
 */

var config = require(__dirname + '/../cfg')
let log4js = require("log4js"),
    FIASImporter= require("./util/import/Russia/zemla/FIASImporter");

log4js.configure(__dirname + '/../cfg/log.json', {
    reloadSecs: 60,
    cwd: __dirname + "/.."
});

let fiasImporter= new FIASImporter();

(async function () {
  await fiasImporter.import(__dirname + '/../fias/AS_ADDROBJ_20180426_659a8aed-0bf6-4492-b93f-501ccd0dba98.XML', __dirname + '/../fias/AS_HOUSE_20180426_d54d5982-aed5-40e5-af5e-d5b3c98f0768.XML');
  // await fiasImporter.setupParentsAndPaths();
})();


