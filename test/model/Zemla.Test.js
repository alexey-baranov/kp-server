/**
 * Created by alexey2baranov on 8/26/16.
 */

var assert = require('chai').assert;
let autobahn = require("autobahn");
let config = require("../../cfg/config.json")[process.env.NODE_ENV || 'development'];
let _ = require("lodash");
let model = require("../../src/model");

// let WAMP = require("../../src/WAMPFactory").getWAMP();

describe('Zemla', function () {
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
    });
});