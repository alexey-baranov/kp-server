/**
 * Created by alexey2baranov on 08.12.16.
 *
 * Импорт идет 14 без индексов и 26 с индексами часов по 3-7 минуты на каждые 100тыс записей и
 * всего импортируется 25 млн строк
 */

var config = require(__dirname + '/../cfg/config.json')[process.env.NODE_ENV]
let log4js = require("log4js"),
    FIASImporter= require("./util/import/Russia/zemla/FIASImporter");

log4js.configure(__dirname + '/../cfg/log.json', {
    reloadSecs: 60,
    cwd: __dirname + "/.."
});

let fiasImporter= new FIASImporter();

(async function () {
    await fiasImporter.import(__dirname + '/../fias/AS_ADDROBJ_20170206_a422afe9-5bb0-4c04-8a41-afe620b67913.XML', __dirname + '/../fias/AS_HOUSE_20170206_90d94473-3d6c-481c-9206-f4b6a42ab9d1.XML');
})();


