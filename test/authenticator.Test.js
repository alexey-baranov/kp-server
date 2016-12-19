/**
 * Created by alexey2baranov on 8/26/16.
 */

var assert = require('chai').assert;
let autobahn = require("autobahn");
let config = require("../cfg/config.json")[process.env.NODE_ENV || 'development'];
let _ = require("lodash");

describe('authenticator', function () {
    before(function () {
    });

    describe('auth', function () {
        it("should authenticate server", function (done) {
            let WAMP = new autobahn.Connection({
                url: `${config.WAMP.schema}://${config.WAMP.host}:${config.WAMP.port}/${config.WAMP.path}`,
                realm: "kopa",
                authmethods: ['ticket'],
                authid: config.server.username,
                onchallenge: function (session, method, extra) {
                    if (method == 'ticket') {
                        return config.server.password;
                    }
                    else {
                        throw new Error('Invalid method type');
                    }
                },
                use_es6_promises: true,
                max_retries: -1,
                max_retry_delay: 5
            });

            WAMP.onopen = ()=> {
                done();
            };

            WAMP.open();
        });

        it("should not authenticate", function (done) {
            let WAMP = new autobahn.Connection({
                url: `${config.WAMP.schema}://${config.WAMP.host}:${config.WAMP.port}/${config.WAMP.path}`,
                realm: "kopa",
                authmethods: ['ticket'],
                authid: config.server.username,
                onchallenge: function (session, method, extra) {
                    if (method == 'ticket') {
                        return "bla";
                    }
                    else {
                        throw new Error('Invalid method type');
                    }
                },
                use_es6_promises: true,
                max_retries: -1,
                max_retry_delay: 5
            });

            WAMP.onopen = ()=> {
                done(new Error("unpredicted authentication"));
            };

            WAMP.onclose = ()=> {
                done();
            };

            WAMP.open();
        });
    });
});