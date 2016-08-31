/**
 * Created by alexey2baranov on 8/7/16.
 */
var autobahn = require('autobahn');
let config = require("../cfg/config.json")[process.env.NODE_ENV || 'development'];
let model = require("./model");
let log4js = require("log4js");


/**
 * обертака над стандартной autobahn.Session#register()
 * которая принимает контекст функции
 * и конввертирует обычне Error в autobahn.Error
 *
 * @type {any}
 */
autobahn.Session.prototype.registerHelper = function (procedure, endpoint, options, context) {
    return this.register(procedure, function endpointWithoutContext(args, kwargs) {
        try {
            if (context) {
                return endpoint.call(context, args, kwargs);
            }
            else {
                return endpoint(args, kwargs);
            }
        }
        catch (err) {
            throw new autobahn.Error(err.constructor.name, [], {message: err.message, stack: err.stack.split("\n")});
        }
    }, options);
};

class Server {
    constructor() {
        this.log = log4js.getLogger(Server.name);
        this.log.info("starting...");

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
                this.log.info("connection.onopen()"/*, session._id, details*/);

                await this.registerHelper('api:model.get', this.promiseModel, null, this);
                await this.registerHelper('api:pingPong', this.pingPong, null, this);
                await this.registerHelper('api:pingPongDatabase', this.pingPongDatabase, null, this);
                await this.registerHelper('api:error', this.error, null, this);
                /*                var x = 0;
                 self.INTERVAL = setInterval(function () {
                 session.publish("ru.myapp.oncounter", [++x], {}, {
                 acknowledge: true, //получить обещание - подтверждение
                 exclude_me: false,  //получить самому свое сообщение
                 disclose_me: true //открыть подписчикам свой Session#ID
                 }).then((publication)=>this.log.debug("ru.myapp.oncounter published", publication), session.log);
                 this.log.debug(x);
                 }, 5000)*/
            }
            catch (er) {
                this.log.error(er);
            }
        };

        this.WAMP.onclose = (reason, details)=> {
            try {
                this.log.info("connection.onclose()", reason, details);
                clearInterval(INTERVAL);
            }
            catch (er) {
                this.log.error(er);
            }
        };
    }

    /**
     * обертака над стандартной autobahn.Session#register()
     * допом принимает контекст обработчика
     * и конввертирует обычне Error в autobahn.Error, которые только одни передаются по WAMP
     *
     * @type {any}
     */
    async registerHelper(procedure, endpoint, options, context) {
        let result= await this.WAMP.session.register(procedure, async (args, kwargs)=>{
            try {
                if (context) {
                    return await endpoint.call(context, args, kwargs);
                }
                else {
                    return await endpoint(args, kwargs);
                }
            }
            catch (err) {
                this.log.error(err);
                throw new autobahn.Error(err.constructor.name || err.name, [err.message], {
                    stack: err.stack.split("\n")
                });
            }
        }, options);
        this.log.debug(procedure,"registered");
        return result;
    };

    start() {
        this.WAMP.open();
    }

    error(args, kwargs) {
        class MySuperError extends Error {

        }
        this.log.debug("#error()", args, kwargs);
        return new Promise(function(){
            throw new MySuperError(args[0]);
        });
    }

    pingPong(args, kwargs) {
        this.log.debug("#pingPong()", args, kwargs);
        return new autobahn.Result(args, kwargs);
    }


    async pingPongDatabase(args, kwargs) {
        let results = await model.sequelize.query(`select '${args[0]}' as result`, {type: model.Sequelize.QueryTypes.SELECT})
        return results[0].result;
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
            this.log.debug("#promiseModel()", args, kwargs);

            var tran = await model.sequelize.transaction();
            var result = null;

            switch (kwargs.model) {
                case "Zemla":
                case "Kopa":
                case "Golos":
                case "Slovo":
                case "Kopnik":
                    result = await model[kwargs.model].findById(kwargs.id, {
                        include: [{
                            model: model.File,
                            as: 'attachments'
                        }]
                    });
                    result = result.get({plain: true});
                    delete result.password;
                    break;
                case "File":
                    break;
            }

            await tran.commit();
            return result;
        }
        catch (er) {
            this.log.error(er);
            await tran.rollback();
            return {error: er.message};
        }
    }
}

module.exports = Server;