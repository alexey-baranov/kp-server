/**
 * Created by alexey2baranov on 8/7/16.
 */
var autobahn = require('autobahn');
let config = require("../cfg/config.json")[process.env.NODE_ENV || 'development'];
let models = require("./model");
let log4js = require("log4js");
let Cleaner = require("./Cleaner");


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

                await this.registerHelper('api:model.create', this.model_create, null, this);
                await this.registerHelper('api:model.get', this.promiseModel, null, this);
                await this.registerHelper('api:model.save', this.model_save, null, this);
                await this.registerHelper('api:pingPong', this.pingPong, null, this);
                await this.registerHelper('api:discloseCaller', this.discloseCaller, null, this);
                await this.registerHelper('api:pingPongDatabase', this.pingPongDatabase, null, this);
                await this.registerHelper('api:error', this.error, null, this);
                await this.registerHelper('api:promiseKopas', this.promiseKopas, null, this);
                await this.registerHelper('api:unitTest.cleanTempData', this.Cleaner_clean, null, this);

                //kopa
                await this.registerHelper('api:model.Kopa.setQuestion', this.Kopa_setQuestion, null, this);

                let tick = 0;
                this.tickInterval = setInterval(()=> {
                    /*
                     session.publish("ru.kopa.tick", [tick++], {}, {
                     acknowledge: true, //получить обещание - подтверждение
                     exclude_me: false,  //получить самому свое сообщение
                     disclose_me: true //открыть подписчикам свой Session#ID
                     })
                     .then((publication)=>{})
                     .catch(session.log);
                     */
                }, 1000);

                this.log.info("started");
            }
            catch (er) {
                this.log.error(er);
            }
        };

        this.WAMP.onclose = (reason, details)=> {
            try {
                this.log.info("connection.onclose()", reason, details);
                clearInterval(tickInterval);
            }
            catch (er) {
                this.log.error(er);
            }
        };
    }

    async Kopa_setQuestion(args, {id, value}, details) {
        var tran = await models.sequelize.transaction();

        try {
            var kopa = await models.Kopa.findById(id);
            kopa.question = value;

            await kopa.save();
            await tran.commit();
        }
        catch (err) {
            tran.rollback();
            throw err;
        }
        await this.WAMP.session.publish(`api:model.Kopa.id${id}.change`, null, {question: kopa.question});
    }

    /**
     * "Обещает" сохранить модель
     * @param args
     * @param type
     * @param plain
     */
    async model_save(args, {type, plain}) {
        var tran = await models.sequelize.transaction();

        try {
            let model = await models[type].findById(plain.id);
            await model.update(plain);
            await tran.commit();

            await this.WAMP.session.publish(`api:model.${type}.id${plain.id}.change`, null, null, {acknowledge: true});

            switch (type) {
                case "Zemla":
                case "Kopa":
                case "Golos":
                    break;
                case "Slovo":
                    break;
                case "Kopnik":
                    break;
                case "File":
                    break;
            }
        }
        catch (err) {
            if (!tran.finished) {
                try {
                    await tran.rollback();
                }
                catch (err2) {
                    this.error("save model error", err, err2);
                }
            }
            throw err;
        }
    }

    /**
     * "Обещает" создать модель
     * @param args
     * @param type тип модели
     * @param plain модель в плоском виде
     * @return {*}
     */
    async model_create(args, {type, plain}) {
        var tran = await models.sequelize.transaction();

        try {
            let result = await models[type].create(plain);
            await tran.commit();

            /**
             * событие о том что создался новый объект ".*Add" должно уходить после того
             * как ".model.create" завершится и вернет ответ клиенту
             * только в этом случае в момент события ".*Add" новая модель будет доступна
             * на клиенте из кэша RemoteModel
             */
            // setTimeout(async ()=> {
            setImmediate(async()=> {
                try {
                    switch (type) {
                        case "Kopnik":
                            let starshiniAsPlain = await models.sequelize.query(`
                                select k.*, (select count(*) from "Kopnik" as k2 where k2.path like k.path||k.id||'/%') as voisko_size
                                    from "Kopnik" as k
                                where
                                    :path like k.path||k.id||'/%'
                                order by
                                    k.path desc`,
                                {
                                    replacements: {
                                        "path": result.path,
                                    },
                                    type: models.Sequelize.QueryTypes.SELECT
                                });
                            for(let eachStarshinaAsPlain of starshiniAsPlain){
                                await this.WAMP.session.publish(`api:model.Kopnik.id${eachStarshinaAsPlain.id}.voiskoChange`, [], {voiskoSize: eachStarshinaAsPlain.voisko_size}, {acknowledge: true});
                            }
                            break;
                        case "Slovo":
                            await this.WAMP.session.publish(`api:model.Kopa.id${plain.place_id}.slovoAdd`, [result.id], null, {acknowledge: true});
                            break;
                        case "Predlozhenie":
                            await this.WAMP.session.publish(`api:model.Kopa.id${plain.place_id}.predlozhenieAdd`, [result.id], null, {acknowledge: true});
                            break;
                        case "Golos":
                            await this.WAMP.session.publish(`api:model.Predlozhenie.id${plain.for_id}.golosAdd`, [result.id], null, {acknowledge: true});
                            break;
                        case "Zemla":
                        case "Kopa":
                        case "Kopnik":
                        case "File":
                            break;
                    }
                }
                catch (err) {
                    this.log.error(err);
                }
            }, 1000);

            return result.id;
        }
        catch (err) {
            if (!tran.finished) {
                try {
                    await tran.rollback();
                }
                catch (err2) {
                    this.error("create model error", err, err2);
                }
            }
            throw err;
        }
    }

    /**
     * Копы открытые до BEFORE или ен открытые но мои
     * отсортированные по дате (стартонутости или запланированности) в обратном порядке
     * @param args
     * @param PLACE
     * @param BEFORE
     * @param caller_authid
     * @returns {*}
     */
    async promiseKopas(args, {PLACE, BEFORE}, {caller_authid}) {
        var BEFORE_FILTER;
        if (!BEFORE) {
            BEFORE_FILTER = `(
            kopa.started is not null 
            or (
                kopa.started is null 
                and kopnik.email=:caller_authid
                )
            )`;
        }
        else {
            BEFORE_FILTER = `kopa.started <  to_timestamp(:BEFORE)`;
        }

        let resultAsArray = await models.sequelize.query(`
        select kopa.* 
            from "Kopa" as kopa
            join "Kopnik" as kopnik on kopnik.id= kopa.inviter_id 
        where
            kopa.place_id=:PLACE
            and ${BEFORE_FILTER}
        order by
            kopa.started,
            kopa.planned
            `,
            {
                replacements: {
                    "PLACE": PLACE,
                    "BEFORE": BEFORE / 1000,
                    "caller_authid": caller_authid
                },
                type: models.Sequelize.QueryTypes.SELECT
            });
        // return resultAsArray;
        let RESULT = resultAsArray.map(each=>each.id);
        let result = await models.Kopa.findAll({
            where: {
                id: {
                    $in: RESULT
                },
            },
            order: [
                ['started', 'asc'],
                ['planned', 'asc']
            ],
        });
        result = result.map(eachResult=>eachResult.get({plain: true}));
        return result;
    }

    error(args, kwargs) {
        class MySuperError extends Error {

        }
        this.log.debug("#error()", args, kwargs);
        return new Promise(function () {
            throw new MySuperError(args[0]);
        });
    }

    discloseCaller(args, kwargs, details) {
        if (!details.caller) {
            throw new Error("disclose me not works");
        }
        return details.caller_authid;
    }

    pingPong(args, kwargs) {
        this.log.debug("#pingPong()", args, kwargs);
        return new autobahn.Result(args, kwargs);
    }

    async pingPongDatabase(args, kwargs) {
        let results = await models.sequelize.query(`select '${args[0]}' as result`, {type: models.Sequelize.QueryTypes.SELECT});
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
        this.log.debug("#promiseModel()", args, kwargs);

        var tran = await models.sequelize.transaction();
        var result = null;

        switch (kwargs.model) {
            case "Zemla":
            case "Kopa":
            case "Golos":
            case "Slovo":
            case "Kopnik":
            case "Predlozhenie":
                result = await models[kwargs.model].findById(kwargs.id, {
                    include: [{
                        model: models.File,
                        as: 'attachments'
                    }]
                });
                result = result.get({plain: true});
                delete result.password;
                break;
            case "File":
                result = await models[kwargs.model].findById(kwargs.id);
                result = result.get({plain: true});
                break;
        }

        await tran.commit();
        return result;
    }

    /**
     * обертака над стандартной autobahn.Session#register()
     * допом принимает контекст обработчика
     * и конввертирует обычне Error в autobahn.Error, которые только одни передаются по WAMP
     *
     * @type {any}
     */
    async registerHelper(procedure, endpoint, options, context) {
        let result = await this.WAMP.session.register(procedure, async(args, kwargs, details)=> {
            try {
                if (context) {
                    return await endpoint.call(context, args, kwargs, details);
                }
                else {
                    throw new Error("not tested");
                    return await endpoint(args, kwargs, details);
                }
            }
            catch (err) {
                this.log.error(err);
                throw new autobahn.Error(err.constructor.name || err.name, [err.message], {
                    stack: err.stack.split("\n")
                });
            }
        }, options);
        this.log.debug(procedure, "registered");
        return result;
    };

    /**
     * Удаляет все временные объекты после юнит тестов
     * временные объекты заканчиваются на "temp" и находятся в юниттестовых поддеревьях
     */
    async Cleaner_clean(args) {
        Cleaner.clean(args);
    }

    start() {
        this.WAMP.open();
    }


}

module.exports = Server;