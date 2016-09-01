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

    describe('#promiseKopas()', function (done) {
        let result;
        it("should return array of obj, started or initier=me", async function (done) {
            try {
                let CHE = new Date(2016, 9 - 1, 1).getTime();
                result = await server.promiseKopas(null, {
                    PLACE: UNIT_TEST_ZEMLA_2,
                    // TIME: null
                }, {caller_authid: "unittest2@domain.ru"});

                assert.equal(_.isArray(result), true);
                for (var eachResult of result) {
                    assert.equal(_.isObject(result[0]), true);
                    // assert.equal(!eachResult.started || eachResult.started < CHE, true);
                    assert.equal(eachResult.initiator_id == UNIT_TEST_KOPNIK_2 || eachResult.started != null, true);
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

        it('should be ordered my planned desc followed by started desc', function () {
            assert.equal(!result[0].started, true);
            assert.equal(result[1].started > result[2].started, true);
            assert.equal(result[2].started > result[3].started, true);
        });
    });

    describe('#promiseKopas(BEFORE)', function (done) {
        let result;
        it("should return array of obj, started", async function (done) {
            try {
                let CHE = new Date(2016, 9 - 1, 1).getTime();
                result = await server.promiseKopas(null, {
                    PLACE: UNIT_TEST_ZEMLA_2,
                    BEFORE: CHE
                }, {caller_authid: "unittest2@domain.ru"});

                assert.equal(_.isArray(result), true);
                for (var eachResult of result) {
                    assert.equal(_.isObject(result[0]), true);
                    assert.equal(eachResult.started != null, true);
                    assert.equal(eachResult.started < CHE, true);
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

        it('should be ordered my planned desc followed by started desc', function () {
            assert.equal(result[0].started > result[1].started, true);
        });
    });
});

// WAMP.open();