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
    // await fiasImporter.import(__dirname + '/../fias/AS_ADDROBJ_20170305_05242212-9cbb-4910-a9dc-03b86da3cb13.XML', __dirname + '/../fias/AS_HOUSE_20170305_cf62cc8e-6cb9-4b8c-8338-0765c06d134b.XML');
  await fiasImporter.setupParentsAndPaths();
})();


