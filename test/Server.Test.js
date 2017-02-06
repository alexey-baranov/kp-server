/**
 * Created by alexey2baranov on 8/26/16.
 */

var assert = require('chai').assert;
let autobahn = require("autobahn");
let config = require("../cfg/config.json")[process.env.NODE_ENV || 'development'];
let _ = require("lodash");
let model = require("../src/model");

let WAMP = require("../src/WAMPFactory");
let Server = require("../src/Server");
let server = new Server();

let UNIT_TEST_ZEMLA_2 = 2,
    unitTestKopnik2,
    UNIT_TEST_KOPNIK_2 = 2;


describe('Server', function () {
    before(function () {
    });

    describe('#promiseKopi()', function (done) {
        let result;
        it("should return array of obj, invited or initier=me", async function (done) {
            try {
                let CHE = new Date(2016, 9 - 1, 1).getTime();
                result = await server.Zemla_promiseKopi(null, {
                    PLACE: UNIT_TEST_ZEMLA_2,
                    // TIME: null
                }, {caller_authid: "unittest2@domain.ru"});

                assert.equal(_.isArray(result), true);
                for (var eachResult of result) {
                    assert.equal(_.isObject(result[0]), true);
                    assert.equal(eachResult.owner_id == UNIT_TEST_KOPNIK_2 || eachResult.invited != null, true);
                }
                done();
            }
            catch (err) {
                done(err);
            }
        });

        it('size should be 4 ', function () {
            assert.equal(result.length, 4);
        });

        it('should be ordered invited followed by my planned', function () {
            assert.equal(result[0].invited < result[1].invited, true);
            assert.equal(result[1].invited < result[2].invited, true);
            assert.equal(!result[3].invited, true);
        });
    });

    describe('#promiseKopas(BEFORE)', function (done) {
        let result;
        it("should return array of obj, invited", async function (done) {
            try {
                let CHE = new Date(2016, 9 - 1, 1).getTime();
                result = await server.promiseKopas(null, {
                    PLACE: UNIT_TEST_ZEMLA_2,
                    BEFORE: CHE
                }, {caller_authid: "unittest2@domain.ru"});

                assert.equal(_.isArray(result), true);
                for (var eachResult of result) {
                    assert.equal(_.isObject(result[0]), true);
                    assert.equal(eachResult.invited != null, true);
                    assert.equal(eachResult.invited < CHE, true);
                }
                done();
            }
            catch (err) {
                done(err);
            }
        });

        it('size should be 2 ', function () {
            assert.equal(result.length, 2);
        });

        it('should be ordered invited', function () {
            assert.equal(result[0].invited < result[1].invited, true);
        });
    });
});

// WAMP.open();
