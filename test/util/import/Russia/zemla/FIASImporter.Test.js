/**
 * Created by alexey2baranov on 8/26/16.
 */

var assert = require('chai').assert;
let config = require("../../../../../cfg")
let _ = require("lodash");
let FIASImporter = require("../../../../../src/util/import/Russia/zemla/FIASImporter");
let Cleaner = require("../../../../../src/Cleaner");
let models= require("../../../../../src/model")

let fiasImporter = new FIASImporter();

describe('FIASImporter', function () {
    before(async function () {
        await Cleaner.clean("Zemla");
    });

    describe('#getRUSSIA()', function () {
        it("should get Russia id", async function () {
            let RUSSIA = await fiasImporter.getRUSSIA()
            assert.equal(_.isNumber(RUSSIA), true)
        })
    })

    describe('#importAddresses', function () {
        it("should import ADDR.XML", async function () {
            await fiasImporter.importAddresses(__dirname + "/ADDROBJ.XML");
            let result = await models.sequelize.query(`select * from "Zemla" where name like 'temp%' order by level`);
            assert.equal(result.length, 3)

            //республика без PARENTGUID
            assert.equal(result[0].AOGUID, 'address1')
            assert.equal(result[0].name, 'temp Адрес 1')
            assert.equal(result[0].PARENTGUID, null)
            assert.equal(result[0].level, 1)

            //город с PARENTGUID
            assert.equal(result[1].AOGUID, 'address2')
            assert.equal(result[1].name, 'temp Адрес 2')
            assert.equal(result[1].PARENTGUID, "address1")
            assert.equal(result[1].level, 4)
        })
    })

    describe('#importHouses', function () {
        it("should import HOUSE.XML", async function () {
            await fiasImporter.importHouses(__dirname + "/HOUSE.XML");
            let result = await models.sequelize.query(`select * from "Zemla" where name like 'temp%' and level=` + FIASImporter.HOUSE_LEVEL);
            assert.equal(result.length, 1);

            assert.equal(result[0].AOGUID, 'house1')
            assert.equal(result[0].name, 'temp номер1')
            assert.equal(result[0].PARENTGUID, "address3")
            assert.equal(result[0].level, FIASImporter.HOUSE_LEVEL)
        })
    })

    describe("#setupParents", function () {
      it("should set up parent", async function () {
        await fiasImporter.setupParents()

        let address3 = await models.Zemla.findOne({
          where: {
            AOGUID: "address3"
          }
        })
        let house1 = await models.Zemla.findOne({
          where: {
            AOGUID: "house1"
          }
        })

        assert.equal(house1.parent_id, address3.id)
      })

      it("should set up ZemlaTree", async function () {
        await fiasImporter.setupParents()

        let address3 = await models.Zemla.findOne({
          where: {
            AOGUID: "address3"
          }
        })
        let house1 = await models.Zemla.findOne({
          where: {
            AOGUID: "house1"
          }
        })
        let zemlaTrees = await models.ZemlaTree.findAll({
          where: {
            bolshe_id: address3.id
          },
          order: ["menshe_id"]
        })

        assert.equal(zemlaTrees.length, 2, "zemlaTrees.length, 2")
        assert.equal(zemlaTrees[1].menshe_id, house1.id, "zemlaTrees[0].menshe_id, house1.id")
      })
    })
})
