/**
 * Created by alexey2baranov on 8/26/16.
 */

var assert = require('chai').assert;
let config = require("../../../../../cfg")
let _ = require("lodash");
var Client = require('pg-native');
let FIASImporter = require("../../../../../src/util/import/Russia/zemla/FIASImporter");
let Cleaner = require("../../../../../src/Cleaner");

var client = new Client();
client.connectSync(`postgresql://${config.username}:${config.password}@${config.host}:5432/${config.database}`);
let fiasImporter = new FIASImporter();

describe('FIASImporter', function () {
    before(async function () {
        await Cleaner.clean("Zemla");
    });

    describe('#getRUSSIA()', function () {
        it("should get Russia id", function () {
            let RUSSIA = fiasImporter.getRUSSIA();
            assert.equal(_.isNumber(RUSSIA), true);
        })
    });

    describe('#importAddresses()', function () {
        it("should import ADDR.XML", async function () {
            await fiasImporter.importAddresses(__dirname + "/ADDROBJ.XML");
            let result = client.querySync(`select * from "Zemla" where name like 'temp%' order by level`);
            assert.equal(result.length, 3)

            //республика без PARENTGUID
            assert.equal(result[0].AOGUID, 'address1');
            assert.equal(result[0].name, 'temp Адрес 1');
            assert.equal(result[0].PARENTGUID, null);
            assert.equal(result[0].level, 1);

            //город с PARENTGUID
            assert.equal(result[1].AOGUID, 'address2');
            assert.equal(result[1].name, 'temp Адрес 2');
            assert.equal(result[1].PARENTGUID, "address1");
            assert.equal(result[1].level, 4);
        });
    });

    describe('#importHouses()', function () {
        it("should import HOUSE.XML", async function () {
            await fiasImporter.importHouses(__dirname + "/HOUSE.XML");
            let result = client.querySync(`select * from "Zemla" where name like 'temp%' and level=` + FIASImporter.HOUSE_LEVEL);
            assert.equal(result.length, 1);

            assert.equal(result[0].AOGUID, 'house1');
            assert.equal(result[0].name, 'temp номер1');
            assert.equal(result[0].PARENTGUID, "address3");
            assert.equal(result[0].level, FIASImporter.HOUSE_LEVEL);
        });
    });

    describe("#setupParentsAndPaths()", function () {
        it("should set up parents and apth", async function () {
            let RUSSIA= fiasImporter.getRUSSIA();

            await fiasImporter.setupParentsAndPaths();
            let result = client.querySync(`select * from "Zemla" where name like 'temp%' order by level `);

            assert.equal(result[1].parent_id, result[0].id);
            assert.equal(result[2].parent_id, result[1].id);
            assert.equal(result[3].parent_id, result[2].id);

            assert.equal(result[0].path, `/101/${RUSSIA}/`);
            assert.equal(result[1].path, `/101/${RUSSIA}/${result[0].id}/`);
            assert.equal(result[2].path, `/101/${RUSSIA}/${result[0].id}/${result[1].id}/`);
            assert.equal(result[3].path, `/101/${RUSSIA}/${result[0].id}/${result[1].id}/${result[2].id}/`);
        });
    });
});
