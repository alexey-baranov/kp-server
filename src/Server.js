/**
 * Created by alexey2baranov on 8/7/16.
 */
var env = process.env.NODE_ENV || 'development';
var autobahn = require('autobahn');
let config = require("../config/config.json")[env];
let model = require("./model");

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

        this.WAMP.onopen = async(session, details)=> {
            try {
                session.prefix('api', 'ru.kopa');
                console.log("connection.onopen"/*, session._id, details*/);

                await session.register('api:model.get', this.promiseModel);
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
            catch (er) {
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


    /**
     * "Обещает" вернуть модель
     *
     * @param args
     * @param kwargs
     * @returns {*}
     */
    async promiseModel(args, kwargs) {
        try {
            console.log(args, kwargs);
            // console.log(modelClassName, id);
            var tran = await model.sequelize.transaction();
            var result = null;

            switch (kwargs.model) {
                case "Zemla":
                    result = await model.Zemla.findById(kwargs.id, {
                        include: [{
                            model: model.File,
                            as: 'attachments'
                        }]
                    });
                    result = result.get({plain: true});
                    break;
                case "Kopnik":
                    result = await model.Kopnik.findById(kwargs.id, {
                        include: [{
                            model: model.File,
                            as: 'attachments'
                        }]
                    });
                    result = result.get({plain: true});
                    delete result.password;
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
            await tran.commit();
            return result;
        }
        catch (er) {
            console.error(er);
            await tran.rollback();
            return {error: er.message};
        }
    }
}

module.exports = Server;