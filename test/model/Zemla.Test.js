/**
 * Created by alexey2baranov on 8/26/16.
 */

let _ = require("lodash")
var assert = require('chai').assert
let autobahn = require("autobahn")

let config = require("../../cfg/config.json")[process.env.NODE_ENV || 'development']
let Cleaner= require("../../src/Cleaner")
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

  it('should set path', async function (done) {
    try {
      var tran = await model.sequelize.transaction();
      let unitTestZemla3 = await model.Zemla.findById(3);
      await unitTestZemla3.setParent2(await model.Zemla.findById(1));

      assert.equal("/1/", unitTestZemla3.path);

      done();
    }
    catch (err) {
      done(err);
    }
    finally {
      tran.rollback();
    }
  })

  describe("#getGolosovanti()", function () {
    let golosovanti
    before(async() => {
      let zemla2 = await models.Zemla.findById(2)
      golosovanti = await zemla2.getGolosovanti()
    })

    it.skip('should not return kopnik behind starshina', async() => {
      assert.equal(golosovanti.find(each => each.id == 3 || each.id == 7), null, "kopnik behind starshina")
    })

    it('should return array of Kopnik', async() => {
      assert.equal(_.isArray(golosovanti), true, "_.isArray(golosovanti)")
      assert.equal(golosovanti.length, 5, "golosovanti.length")
    })
  })
})
