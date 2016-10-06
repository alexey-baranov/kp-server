/**
 * Created by alexey2baranov on 8/26/16.
 */

var assert = require('chai').assert;
let autobahn = require("autobahn");
let config = require("../cfg/config.json")[process.env.NODE_ENV || 'development'];
let _=require("lodash");
let model=require("../src/model");

let WAMP = require("../src/WAMPFactory").getWAMP();

describe('Infrastructure', function () {
    after(function () {
        WAMP.close();
        return new Promise(function(resolve){
            if (!WAMP.session.isOpen){
                resolve();
            }
            WAMP.onclose= function () {
                resolve();
            };
        });
    });

    it('database', async ()=> {
        await model.sequelize.query("select 'КОПА'", { type: model.Sequelize.QueryTypes.SELECT});
    });

    it('crossbar', function (done) {
        WAMP.open();
        return new Promise(function(){
            WAMP.onopen = function () {
                done();
            };
        });
    });

    it('server', function (done) {
        WAMP.session.call("ru.kopa.pingPong",[1,2,3],{x:1, y:2, z:3})
            .then(function (res) {
                if (!_.difference(res.args,[1,2,3]).length && _.isEqual(res.kwargs,{x:1, y:2, z:3})) {
                    done();
                }
                else{
                    throw Error();
                }
            })
            .catch(function (er) {
                done(er);
            });
    });

});