/**
 * Created by alexey2baranov on 08.12.16.
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
    await fiasImporter.getHouseRowsByGUID("0123c5ec-3f20-46e8-9e55-2d66acf6976b", __dirname + '/../fias/AS_HOUSE_20161206_3a5fd8b7-66c0-48c5-acb0-48f9117ff727.XML');
})();