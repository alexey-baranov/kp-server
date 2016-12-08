/**
 * Created by alexey2baranov on 08.12.16.
 * Часть адресов (AOGUID: 'a68a172f-cefc-496b-b070-38887a6e6a82',) на момент парсинья имеют непропарсеных родителей
 * поэтому в таблицу земель добавляется колонка PARENTGUID и после полной загрузки для адресов без родителей по этой колонке уже родители назначаются
 */

let sax = require("sax");
let fs = require("fs");
var pg = require('pg-promise');
var env = process.env.NODE_ENV || 'development';
var config = require(__dirname + '/../cfg/config.json')[env];
let log4js= require("log4js");

log4js.configure(__dirname+'/../cfg/log.json', {
    reloadSecs: 60,
    cwd: __dirname+"/.."
});
let logger = log4js.getLogger("import-fias.js");

var Client = require('pg-native');

var client = new Client();
client.connectSync(`postgresql://${config.username}:${config.password}@${config.host}:5432/${config.database}`);

const RUSSIA_AOGUID = "RUSSIA";
let rowsWithoutParentCount=0;
let zemli = new Map();
//prepared statements
client.prepareSync('insert-zemla',
    `insert into "Zemla" ("AOGUID", "PARENTGUID", name, level, path, created_at, updated_at, parent_id) 
                values ($1::character varying(255), $2::character varying(255), $3::character varying(255), $4::integer, $5::text, $6::timestamp with time zone, $7::timestamp with time zone, $8::bigint)
                returning id`, 8);

let result = client.executeSync("insert-zemla", [RUSSIA_AOGUID, null, "Россия", 0, '/1/', new Date().toISOString(), new Date().toISOString(), 1]);
zemli.set(RUSSIA_AOGUID, {id: result[0]['id'], fullPath: '/1/' + result[0]['id'] + '/'});

var saxStream = sax.createStream(true);
saxStream.on("error", function (e) {
    // unhandled errors will throw, since this is a proper node
    log4js.getLogger("import-fias.js").error("sax-js error!", e);
    // clear the error
    this._parser.error = null;
    this._parser.resume();
});
saxStream.on("opentag", function (node) {
    try {
        let path, PARENT;
        if (node.name == 'Object' && node.attributes.LIVESTATUS == 1) {
            let parentAsObj = zemli.get(node.attributes.PARENTGUID ? node.attributes.PARENTGUID : RUSSIA_AOGUID);
            //часть адресов не имеют родителей на момент разбора см. описание в начале файла
            if (parentAsObj){
                path= parentAsObj.fullPath;
                PARENT= parentAsObj.id;
            }
            else{
                path= '';
                PARENT= 1; //реальный идентификатор потому что в противном случае ошибка внешнего ключа
                rowsWithoutParentCount++;
            }

            //добавляю в БД несмотря на то есть родитель или нет
            let result = client.executeSync("insert-zemla", [node.attributes.AOGUID, node.attributes.PARENTGUID, node.attributes.SHORTNAME + ". " + node.attributes.OFFNAME, node.attributes.AOLEVEL, path, new Date().toISOString(), new Date().toISOString(), PARENT]);

            //только полностью готовые адреса попадают в карту адресов потому что неполные адреса не смогут дать правильный path для своих дочек
            if (parentAsObj) {
                zemli.set(node.attributes.AOGUID, {id: result[0]['id'],fullPath: parentAsObj.fullPath + result[0].id + "/"});
            }
        }
    }
    catch (er) {
        logger.error(node, er);
    }

    if ((zemli.size+rowsWithoutParentCount) % 100000 == 0) {
        logger.debug("total rows added: ", zemli.size+rowsWithoutParentCount, ", without parent", rowsWithoutParentCount);
    }
});

fs.createReadStream(__dirname + "/../fias/AS_ADDROBJ_20161206_9e4a91d4-bda6-4779-9443-4ee3357dbf86.XML")
    .pipe(saxStream);