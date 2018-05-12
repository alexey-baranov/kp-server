/**
 * Created by alexey2baranov on 08.12.16.
 *
 * 1. export NODE_ENV=developmentfast
 * 2. закомментировать часть Zemla#setParent2 - удаление строк из ZemlaTree
 * 3. npm run import-fias
 * 4. вернуть Zemla#setParent2 на место
 */

var config = require(__dirname + '/../cfg')
let models= require("./model")
let log4js = require("log4js"),
    FIASImporter= require("./util/import/Russia/zemla/FIASImporter");

log4js.configure(__dirname + '/../cfg/log.js', {
    reloadSecs: 60,
    cwd: __dirname + "/.."
});

let fiasImporter= new FIASImporter();

 (async function () {
  fiasImporter.import(__dirname + '/../fias/AS_ADDROBJ_20180426_659a8aed-0bf6-4492-b93f-501ccd0dba98.XML', __dirname + '/../fias/AS_HOUSE_20180426_d54d5982-aed5-40e5-af5e-d5b3c98f0768.XML')
 })();


