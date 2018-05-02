/**
 * Created by alexey2baranov on 8/26/16.
 */

let _ = require("lodash")
var assert = require('chai').assert
let autobahn = require("autobahn")

let config = require("../../cfg")
let Cleaner = require("../../src/Cleaner")
let model = require("../../src/model")
let models = require("../../src/model")

let WAMP = require("../../src/WAMPFactory").getWAMP()

describe('Zemla', function () {
  before(async function () {
    await new Promise((res, rej) => {
      WAMP.onopen = function () {
        res()
      }
      WAMP.open()
    })
    await Cleaner.clean()
  })

  after(async function () {
    await new Promise((res, rej) => {
      WAMP.onclose = function () {
        res()
      }
      WAMP.close()
    })
  })


  it('#getParents', async function () {
    let zemla3 = await model.Zemla.findById(3)

    let parents= await zemla3.getParents()
    assert.equal(parents[0].id, 2, "parents[0].id, 2")
    assert.equal(parents[1].id, 1, "parents[1].id, 1")
  })

  it('should set ZemlaTree and parent_id', async function () {
    await model.sequelize.transaction(async () => {
      let someZemla = await model.Zemla.create({
        name: "zemla temp",
        parent_id: 1,
      })

      let treesAsRow = await model.sequelize.query(`
          select *
          from 
            "ZemlaTree" tree
          where
            menshe_id = ${someZemla.id}
          order by
            deep`,
        {
          replacements: {
          },
          type: model.sequelize.Sequelize.QueryTypes.SELECT
        })

      let treeAsRow
      treeAsRow = treesAsRow[0]
      assert.equal(treeAsRow.bolshe_id, someZemla.id, "treeAsRow.parent_id, someZemla.id")
      assert.equal(treeAsRow.menshe_id, someZemla.id, "treeAsRow.child_id, someZemla.id")
      assert.equal(treeAsRow.deep, 0, "treeAsRow.deep, 0")

      treeAsRow = treesAsRow[1]
      assert.equal(treeAsRow.bolshe_id, 1, "treeAsRow.parent_id, 1")
      assert.equal(treeAsRow.menshe_id, someZemla.id, "treeAsRow.child_id, someZemla.id")
      assert.equal(treeAsRow.deep, 1, "treeAsRow.deep, 1")

      assert.equal((await someZemla.getParent()).id, 1, "someZemla.getParent().id, 1")
    })
  })

  it('should set ZemlaTree after reseting parent', async function () {
    //1. начальный родитель
    await model.sequelize.transaction(async () => {
      let someZemla = await model.Zemla.create({
        name: "zemla temp",
        parent_id: 1,
      })

      //2. новый родитель
      await someZemla.setParent2(await model.Zemla.findById(2))

      //3. проверки
      let treesAsRow = await model.sequelize.query(`
          select *
          from 
            "ZemlaTree" tree
          where
            menshe_id = ${someZemla.id}
          order by
            deep`,
        {
          replacements: {
          },
          type: model.sequelize.Sequelize.QueryTypes.SELECT
        })

      let treeAsRow
      treeAsRow = treesAsRow[0]
      assert.equal(treeAsRow.bolshe_id, someZemla.id, "treeAsRow.parent_id, someZemla.id")
      assert.equal(treeAsRow.menshe_id, someZemla.id, "treeAsRow.child_id, someZemla.id")
      assert.equal(treeAsRow.deep, 0, "treeAsRow.deep, 0")

      treeAsRow = treesAsRow[1]
      assert.equal(treeAsRow.bolshe_id, 2, "treeAsRow.parent_id, 2")
      assert.equal(treeAsRow.menshe_id, someZemla.id, "treeAsRow.child_id, someZemla.id")
      assert.equal(treeAsRow.deep, 1, "treeAsRow.deep, 1")


      treeAsRow = treesAsRow[2]
      assert.equal(treeAsRow.bolshe_id, 1, "treeAsRow.parent_id, 1")
      assert.equal(treeAsRow.menshe_id, someZemla.id, "treeAsRow.child_id, someZemla.id")
      assert.equal(treeAsRow.deep, 2, "treeAsRow.deep, 2")

      assert.equal((await someZemla.getParent()).id, 2, "someZemla.getParent().id, 2")
    })
  })

  describe.skip("#getGolosovanti()", function () {
    let golosovanti
    before(async () => {
      let zemla2 = await models.Zemla.findById(2)
      golosovanti = await zemla2.getGolosovanti()
    })

    it.skip('should not return kopnik behind starshina', async () => {
      assert.equal(golosovanti.find(each => each.id == 3 || each.id == 7), null, "kopnik behind starshina")
    })

    it('should return array of Kopnik', async () => {
      assert.equal(_.isArray(golosovanti), true, "_.isArray(golosovanti)")
      assert.equal(golosovanti.length, 5, "golosovanti.length")
    })
  })
})
