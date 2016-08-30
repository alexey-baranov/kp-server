/**
 * Created by alexey2baranov on 8/26/16.
 */

var assert = require('chai').assert;
let autobahn = require("autobahn");
let config = require("../cfg/config.json")[process.env.NODE_ENV || 'development'];
let _=require("lodash");
let model=require("../src/model");

let WAMP = new autobahn.Connection({
    url: `${config.WAMP.schema}://${config.WAMP.host}:${config.WAMP.port}/${config.WAMP.path}`,
    realm: "kopa",
    authmethods: ['ticket'],
    authid: "alexey_baranov@inbox.ru",
    onchallenge: function (session, method, extra) {
        return "alexey_baranov@inbox.ru";
    },
    use_es6_promises: true,
    max_retries: -1,
    max_retry_delay: 5
});

describe('Infrastructure', function () {
    it('database', function (done) {
        return model.sequelize.query("select 'КОПА'", { type: model.Sequelize.QueryTypes.SELECT})
            .then(result=>{
                done();
            }, er=>{
                done(er);
            });
    });

    it('crossbar', function (done) {
/*
        если сессия уже открыта в предыдущем тесте,
        то эта сессия открывается моментально,
        то есть даже раньше чем выполнение дойдет до этого блока
        а оно похоже доходит не сразу а через nextTick, то есть уже поздно
*/
        if (WAMP.session && WAMP.session.isOpen){
            // console.log("session already opened");
            done();
        }
        WAMP.onopen = function (session, details) {
            // console.log("session#onopen()");
            done();
        };
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

WAMP.open();