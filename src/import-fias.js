/**
 * Created by alexey2baranov on 08.12.16.
 *
 * Импорт идет 14 без индексов и 26 с индексами часов по 3-7 минуты на каждые 100тыс записей и
 * всего импортируется 25 млн строк
 */

var config = require(__dirname + '/../cfg/config.json')[process.env.NODE_ENV || 'dev'];
let log4js = require("log4js"),
    FIASImporter= require("./util/import/Russia/zemla/FIASImporter");

log4js.configure(__dirname + '/../cfg/log.json', {
    reloadSecs: 60,
    cwd: __dirname + "/.."
});

let fiasImporter= new FIASImporter();

(async function () {
    await fiasImporter.import(__dirname + '/../fias/AS_ADDROBJ_20161206_9e4a91d4-bda6-4779-9443-4ee3357dbf86.XML', __dirname + '/../fias/AS_HOUSE_20161206_3a5fd8b7-66c0-48c5-acb0-48f9117ff727.XML');
})();


