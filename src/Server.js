/**
 * Created by alexey2baranov on 8/7/16.
 */
var env = process.env.NODE_ENV || 'development';
var autobahn = require('autobahn');
let config = require("../config/config.json")[env];
let models = require("./../models");

class Server {
    constructor() {
        var self = this;

        this.WAMP = new autobahn.Connection({
            url: `${config.WAMP.schema}://${config.WAMP.host}:${config.WAMP.port}/${config.WAMP.path}`,
            realm: "kopa",
            authmethods: ['ticket'],
            authid: "server",
            onchallenge: function (session, method, extra) {
                if (method == 'ticket') {
                    return "server";
                }
                else {
                    throw new Error('Invalid method type');
                }
            },
            use_es6_promises: true,
            max_retries: -1,
            max_retry_delay: 5
        });

        this.WAMP.onopen = async function (session, details) {
            try {
                session.prefix('api', 'ru.kopa');
                console.log("connection.onopen"/*, session._id, details*/);

                await session.register('api:model.get', function (args, kwargs) {
                    console.log(kwargs);
                    switch (kwargs.model) {
                        case "Zemla":
                            break;
                        case "Kopnik":
                            /*
                            sequelize.transaction(function (t1) {
                                return sequelize.transaction(function (t2) {
                                    // With CLS enable, queries here will by default use t2
                                    // Pass in the `transaction` option to define/alter the transaction they belong to.
                                    return Promise.all([
                                        User.create({ name: 'Bob' }, { transaction: null }),
                                        User.create({ name: 'Mallory' }, { transaction: t1 }),
                                        User.create({ name: 'John' }) // this would default to t2
                                    ]);
                                });
                            });
                        */
                            return models.sequelize.transaction(async function (t) {
                                try{
                                var result = await models.Kopnik.findById(kwargs.id, {
                                    include: [ {
                                        model: models.File,
                                        as: 'attachments'
                                    }] });
                                result= result.get({plain:true});
                                delete result.password;
                                }
                                catch(er){
                                    console.error(er);
                                }

                                return result;
                            });
/*
                            var result = models.Kopnik.findById(kwargs.id)
                                .then(model=>{
                                    return model.get({plain:true});
                                });
*/
                            break;
                        case "Kopa":
                            break;
                        case "Golos":
                            break;
                        case "Slovo":
                            break;
                        case "File":
                            break;
                    }
                });
                // .then(console.log("ru.kopa.model.get registered"), console.error);
                console.log("api:model.get registered");

/*                var x = 0;
                self.INTERVAL = setInterval(function () {
                    session.publish("ru.myapp.oncounter", [++x], {}, {
                        acknowledge: true, //получить обещание - подтверждение
                        exclude_me: false,  //получить самому свое сообщение
                        disclose_me: true //открыть подписчикам свой Session#ID
                    }).then((publication)=>console.log("ru.myapp.oncounter published", publication), session.log);
                    console.log(x);
                }, 5000)*/
            }
            catch(er){
                console.error(er);
            }
        };

        this.WAMP.onclose = function (reason, details) {
            console.log("connection.onclose", reason, details);
            clearInterval(INTERVAL);
        };
    }

    connect() {
        this.WAMP.open();
    }
}

module.exports = Server;