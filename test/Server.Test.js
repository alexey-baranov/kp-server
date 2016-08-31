/**
 * Created by alexey2baranov on 8/26/16.
 */

var assert = require('chai').assert;
let autobahn = require("autobahn");
let config = require("../cfg/config.json")[process.env.NODE_ENV || 'development'];
let _=require("lodash");
let model=require("../src/model");

let WAMP = require("../src/WAMPFactory");
let Server= require("../src/Server");
let server= new Server();

let place_id=7,
    alexey2baranov,
    ALEXEY2BARANOV=1;


describe('Server', function () {
    before(function(){
        // alexey2baranov = model.Kopnik.getReference(1);
    });

    describe('#promiseKopas()', function (done) {
        let result;
        it("should return array < Object>, ordered by started ASC, started or initier=me", async function (done) {
            try {
                result = await server.promiseKopas(null, {PLACE: place_id, FROM: 1}, {caller_authid:"alexey_baranov@inbox.ru"});

                assert.equal(_.isArray(result), true);
                for(var eachResult of result){
                    assert.equal(_.isObject(result[0]), true);
                    assert.equal(eachResult.id>1, true);
                    assert.equal(eachResult.initiator_id==ALEXEY2BARANOV || eachResult.started!=null, true);
                }
                done();
            }
            catch(err){
                done(err);
            }
        });

        it('should be ordered by started ASC', function () {
            assert.equal(result[0].started< result[1].started, true);
        });
    });
});

// WAMP.open();