/**
 * Created by alexey2baranov on 13.02.17.
 */

/**
 * Created by alexey2baranov on 8/7/16.
 */
const autobahn = require('autobahn'),
  bcrypt = require("bcrypt"),
  fs = require("fs"),
  _ = require("lodash"),
  log4js = require("log4js"),
  Mustache = require("mustache"),
  request = require("request-promise-native"),
  webpush = require('web-push')


let config = require("../cfg")
let models = require("./model")
let Cleaner = require("./Cleaner")


/**
 * обертака над стандартной autobahn.Session#register()
 * которая принимает контекст функции
 * и конввертирует обычне Error в autobahn.Error
 *
 * @type {any}
 */
autobahn.Session.prototype.registerHelper = function (procedure, endpoint, options, context) {
  return this.register(procedure, function (args, kwargs) {
    try {
      if (context) {
        return endpoint.call(context, args, kwargs);
      }
      else {
        return endpoint(args, kwargs);
      }
    }
    catch (err) {
      let kwargs = {message: err.message, stack: err.stack.split("\n")}
      throw new autobahn.Error(err.constructor.name, [], kwargs)
    }
  }, options);
};
/**
 * curl --header "Authorization: key=AAAAPzuy5_M:APA91bF1sw8KpHaCGZi8GA61T3q3q1irL6rHDNAf8M5OK9w7TYvViohFqfd_f5l_xtWJkZsZF7OWkg23cXBgrPwHmrb3kj_64y2TLKcTC4xHMF8fZRzb9pu_X4e2Ull3eRXyyHruh9qF" --header "Content-Type: application/json" https://android.googleapis.com/gcm/send -d "{\"registration_ids\":[\"f2Q7o8trCps:APA91bG9ul1J1tLDD0D3Bh2YZ1YZ7IWGklGs914-a7IjlBiXIQaE1lI7VgwstKjclwTlqCTPI7_wYL4_TFiqLmqpfmgF0yg2ZzSs3uo_yL8kElWluh8sHJgjkHv0ky6cGmcqnPGaMltQ\"]}"
 */
class Server {
  constructor() {
    this.log = log4js.getLogger(Server.name);
    this.log.info("starting...", config.WAMP, `${config.WAMP.schema}://${config.WAMP.host}:${config.WAMP.port}/${config.WAMP.path}`);

    this.WAMP = new autobahn.Connection({
      url: `${config.WAMP.schema}://${config.WAMP.host}:${config.WAMP.port}/${config.WAMP.path}`,
      realm: "kopa",
      authmethods: ['ticket'],
      authid: config.server.username,
      // authid: "unittest2@domain.ru",
      onchallenge: function (session, method, extra) {
        if (method == 'ticket') {
          return config.server.password;
          // return "qwerty";
        }
        else {
          throw new Error('Invalid method type');
        }
      },
      use_es6_promises: true,
      max_retries: -1,
      max_retry_delay: 5
    });

    webpush.setGCMAPIKey(/*'<Your GCM API Key Here>'*/config.FCM.serverKey);
    webpush.setVapidDetails('mailto:alexey2baranov@gmail.com', config.VAPID.publicKey, config.VAPID.privateKey)

    this.WAMP.onopen = async(session, details) => {
      try {
        session.prefix('api', 'ru.kopa')
        this.log.info("connection.onopen()"/*, session._id, details*/)
        //очищаю таблицу сессий
        this.log.info("Truncating \"Session\" table. Opened session will store later")
        await models.Session.destroy({force: true, where: {id: {$not: null}}})

        //метасобытия
        await this.subscribeHelper("wamp.session.on_join", this.session_join.bind(this))
        await this.subscribeHelper("wamp.session.on_leave", this.session_leave.bind(this))

        //сохранил сесси, которые уже в кросбаре приконектились и ожидают сервера
        await this.saveOpenedSessions()

        //org.kopnik
        // await this.registerHelper('api:getKopnikSESSION', this.getKopnikSESSION, null, this)

        //Application
        await this.registerHelper('api:Application.addPushSubscription', this.Application_addPushSubscription, null, this)

        //регистрация копника
        await this.registerHelper('api:registration.getCountries', this.Registration_getCountries, null, this)
        await this.registerHelper('api:registration.getTowns', this.Registration_getTowns, null, this)
        await this.registerHelper('api:registration.getStreets', this.Registration_getStreets, null, this)
        await this.registerHelper('api:registration.getHouses', this.Registration_getHouses, null, this)
        // await this.registerHelper('api:registration.apply', this.Registration_apply, null, this)

        //Kopnik
        await this.registerHelper('api:model.Kopnik.setStarshina', this.Kopnik_setStarshina, null, this)
        await this.registerHelper('api:model.Kopnik.getDruzhina', this.Kopnik_getDruzhina, null, this)
        await this.registerHelper('api:model.Kopnik.vote', this.Kopnik_vote, null, this)
        await this.registerHelper('api:model.Kopnik.verifyRegistration', this.Kopnik_verifyRegistration, null, this)
        await this.registerHelper('api:model.Kopnik.getRegistrations', this.Kopnik_getRegistrations, null, this);

        //Kopa
        await this.registerHelper('api:model.Kopa.invite', this.Kopa_invite, null, this);
        await this.registerHelper('api:model.Kopa.getDialog', this.Kopa_getDialog, null, this);
        await this.registerHelper('api:model.Kopa.getResult', this.Kopa_getResult, null, this);

        //Zemla
        await this.registerHelper('api:model.Zemla.setParent', this.Zemla_setParent, null, this);
        await this.registerHelper('api:model.Zemla.promiseKopi', this.Zemla_promiseKopi, null, this);


        //Predlozhenie
        await this.registerHelper('api:model.Predlozhenie.getGolosa', this.Predlozhenie_getGolosa, null, this);

        //else
        await this.registerHelper('api:model.create', this.model_create, null, this)
        await this.registerHelper('api:model.destroy', this.model_destroy, null, this)
        await this.registerHelper('api:model.get', this.promiseModel, null, this)
        await this.registerHelper('api:model.save', this.model_save, null, this)
        await this.registerHelper('api:pingPong', this.pingPong, null, this)
        await this.registerHelper('api:discloseCaller', this.discloseCaller, null, this)
        await this.registerHelper('api:pingPongDatabase', this.pingPongDatabase, null, this)
        await this.registerHelper('api:error', this.error, null, this)
        await this.registerHelper('api:unitTest.cleanTempData', this.Cleaner_clean, null, this)
        //эта регистрация должна быть последней, тк на клиенте она сигнализирует о готовности сервера
        await this.registerHelper('api:model.getKOPNIKByEmail', this.getKOPNIKByEmail, null, this)

        //unit test
        await this.registerHelper('api:unitTest.orderProc', this.unitTest_orderProc, null, this);

        this.log.info("started");
      }
      catch (er) {
        this.log.error(er);
      }
    };

    this.WAMP.onclose = (reason, details) => {
      try {
        this.log.info("connection.onclose()", reason, details);
        clearInterval(this.tickInterval);
      }
      catch (er) {
        this.log.error(er);
      }
    };
  }

  /**
   * сохранить кросбаровские сессии, которые уже приконнектились к кросбару
   * и ожидают когда поднимится сервер
   *
   * Этот метод должен завершиться до регистрации findKopnikById()
   * который на клиенте означает подъем сервера в боевой ражим

   *
   * @return {Promise.<void>}
   */
  async saveOpenedSessions(){
    let SESSIONS = await this.WAMP.session.call("wamp.session.list")
    for (let EACH_SESSION of SESSIONS) {
      let eachSession = await this.WAMP.session.call("wamp.session.get", [EACH_SESSION])
      if (eachSession){
          await this.session_join([eachSession])
      }
    }

  }

  /**
   * пуш-уведомления клиентам за исключением подписки, которая получена по сессии SKIP_SESSION
   * SKIP_SESSION нужна для того чтобы копник, который породил событие, не получал его сам
   *
   * @param what
   * @param whom
   * @param SKIP_SESSION
   * @return {Promise.<void>}
   */
  async push(what, whom, SKIP_SESSION = null) {
    if (!_.isArray(whom)) {
      whom = [whom]
    }
    this.log.debug("push", what, whom.map(eachWhom => eachWhom.fullName))
    let subscriptions = await models.PushSubscription.findAll({where: {owner_id: {$in: whom.map(eachWhom => eachWhom.id)}}})

    let result = await Promise.all(subscriptions.map(async(eachSubscription) => {
      if (!eachSubscription.session_id || eachSubscription.session_id != SKIP_SESSION) {
        try {
          let result = await webpush.sendNotification(eachSubscription.value, JSON.stringify(what))
          if (result.status > 299) {
            this.log.error("push to", eachSubscription.getOwner().fullName, result)
          }
          return result
        }
        catch(err){
          this.log.error("push to", eachSubscription.getOwner().fullName, err)
          return err
        }
      }
    }))
    // console.log(result)
  }

  /**
   * Этот метод регистрируется на WAMP.session.join
   * и потом вызывается внутри #saveOpenedSessions
   * чтобы не было временной ямы когда сессия не подпадает под регистрацию WAMP.session.join регистрируется вперед
   *
   * Поэтому возможны случаи когда сессия уже зарегистрирована по session_join
   * и еще раз регистрируется внутри #saveOpenedSessions
   *
   * @param args
   * @param kwargs
   * @param details
   * @return {Promise.<void>}
   */

  async session_join(args, kwargs, details) {
    let sessionAsPlain = Object.assign({}, args[0], {id: args[0].session})
    if (args[0].authrole != "anonymous" && args[0].authrole != "server") {
      let KOPNIK = await this.getKOPNIKByEmail([], {email: args[0].authid})
      sessionAsPlain.owner_id = KOPNIK
    }

    if (!await models.Session.findById(sessionAsPlain.id)) {
      let session = await models.Session.create(sessionAsPlain)
    }
  }

  async session_leave(args, kwargs, details) {
    let session = models.Session.build({id: "" + args[0]})
    await session.destroy(/*{force:true}*/)
  }

  /**
   * добавить подписку на пуш уведомления
   * @param args
   * @param kwargs
   * @param details
   * @return {Promise.<*>}
   * @constructor
   */
  async Application_addPushSubscription(args, kwargs, details) {
    let result,
      caller = await models.Kopnik.findOne({
        where: {
          email: details.caller_authid
        }
      })
    await models.sequelize.transaction(async() => {
      //1. загрузил все подписки копника
      let subscriptions = await models.PushSubscription.findAll({where: {owner_id: caller.id}, order: "id"})
      //2. подчистить имеющиеся подписки
      for (let EACH_SUBSCRIPTION = 0; EACH_SUBSCRIPTION < subscriptions.length; EACH_SUBSCRIPTION++) {
        let eachSubscription = subscriptions[EACH_SUBSCRIPTION]
        //2.1 удалил все после четвертой по счету
        if (EACH_SUBSCRIPTION <= subscriptions.length - models.PushSubscription.maxCountPerKopnik ||
          //2.2 удалил эту же самую подписку но видимо она по F5 отвалились и не имеют уже номера сессии
          _.isEqual(args[0], eachSubscription.value)) {
          await subscriptions[EACH_SUBSCRIPTION].destroy({force: true})
        }
      }
      //3. сохранил новую подписку
      result = await models.PushSubscription.create({
        value: args[0],
        owner_id: caller.id,
        session_id: details.caller
      })
    })

    return result
  }

  async unitTest_orderProc([x]) {
    // await this.WAMP.session.publish(`api:unitTest.orderTopic`, [x], null, {acknowledge: true});

    setImmediate(async() => {
      // process.nextTick(async()=> {
      try {
        await this.WAMP.session.publish(`api:unitTest.orderTopic`, [x], null, {acknowledge: true});
      }
      catch (err) {
        this.log.error("unitTest_orderProc", err);
      }
    }, 1000);

    return x * x;
  }

  /**
   * Список стран для страницы регистрации
   * @param args
   * @param term
   * @param details
   * @return {Promise.<*>}
   * @constructor
   */
  async Registration_getCountries(args, {term}, details) {
    try {
      let result = await models.sequelize.query(`
                                select id, name, "obshinaSize"
                                from
                                    "Zemla"
                                where
                                    level=0
                                    and lower(name) like lower(:term)||'%'
                                order by 
                                    name
                                limit 8
                                `,
        {
          replacements: {
            "term": term,
          },
          type: models.Sequelize.QueryTypes.SELECT
        });
      return result
    }
    catch (err) {
      throw err
    }
  }

  /**
   * список городов для страницы регистрации
   * @param args
   * @param term
   * @param COUNTRY
   * @param details
   * @return {Promise.<*>}
   * @constructor
   */
  async Registration_getTowns(args, {term, COUNTRY}, details) {
    try {
      let result = await models.sequelize.query(`
                                select id, name||COALESCE(', '||get_full_zemla(id,1,3), '') as name, "obshinaSize"
                                from(
                                    select id, name, "obshinaSize"
                                    from
                                        "Zemla"
                                    where
                                        (level =35 or level=4 or level=6)
                                        and country_id = :COUNTRY
                                        and lower(name) like lower(:term)||'%'
                                    order by 
                                        name
                                    limit 8
                                ) as temp`,
        {
          replacements: {
            term,
            COUNTRY,
          },
          type: models.Sequelize.QueryTypes.SELECT
        })
      return result
    }
    catch (err) {
      throw err
    }
  }

  /**
   * список улиц для страницы регистрации
   * @param args
   * @param term
   * @param TOWN
   * @param details
   * @return {Promise.<*>}
   * @constructor
   */
  async Registration_getStreets(args, {term, TOWN}, details) {
    try {
      let result = await models.sequelize.query(`
                                select id, name, "obshinaSize"
                                from
                                    "Zemla"
                                where
                                    level=7
                                    and parent_id= :TOWN
                                    and lower(name) like lower(:term)||'%'
                                order by 
                                    name
                                limit 8
                                `,
        {
          replacements: {
            term,
            TOWN
          },
          type: models.Sequelize.QueryTypes.SELECT
        })
      return result
    }
    catch (err) {
      throw err
    }
  }

  /**
   * список домов для страницы регистрации
   * @param args
   * @param term
   * @param STREET
   * @param details
   * @return {Promise.<*>}
   * @constructor
   */
  async Registration_getHouses(args, {term, STREET}, details) {
    try {
      let result = await models.sequelize.query(`
                                select id, name, "obshinaSize"
                                from
                                    "Zemla"
                                where
                                    level=99
                                    and parent_id= :STREET
                                    and lower(name) like lower(:term)||'%'
                                order by 
                                    name
                                limit 8
                                `,
        {
          replacements: {
            term,
            STREET
          },
          type: models.Sequelize.QueryTypes.SELECT
        });
      return result
    }
    catch (err) {
      throw err
    }
  }

  async Zemla_setParent(args, {ZEMLA, PARENT}, details) {
    let zemla,
      parent,
      prevParents,
      parents

    await models.sequelize.transaction(async() => {
      zemla = await models.Zemla.findById(ZEMLA);
      parent = PARENT ? await models.Zemla.findById(PARENT) : null;

      //родители запоминаются на момент транзакции. в момент публикаций их общины будут уже меньше на общину земли
      prevParents = await zemla.getParents();
      await zemla.setParent2(parent);
      parents = await zemla.getParents();
    })

    /**
     * событие о изменения прилетает после того как клиент дождался ответа
     * об изменения
     */
    setImmediate(async() => {
      try {
        //сначала роняю войско
        for (let eachParent of prevParents) {
          //родители запоминались на момент транзакции. в момент публикаций их общины уже меньше на общину земли
          await this.WAMP.session.publish(`api:model.Zemla.id${eachParent.id}.obshinaChange`, [], {obshinaSize: eachParent.obshinaSize - zemla.obshinaSize}, {acknowledge: true});
        }
        for (let eachParent of parents) {
          await this.WAMP.session.publish(`api:model.Zemla.id${eachParent.id}.obshinaChange`, [], {obshinaSize: eachParent.obshinaSize}, {acknowledge: true});
        }
      }
      catch (err) {
        this.log.error("Zemla_setParent error", ZEMLA, PARENT, err);
      }
    });
  }

  async Kopnik_setStarshina(args, {KOPNIK, STARSHINA}, details) {
    let caller = await models.Kopnik.findOne({
      where: {
        email: details.caller_authid
      }
    })

    if (caller.id != KOPNIK && caller.id != 2) {
      throw new Error("can't set starshina for another kopnik")
    }

    await models.sequelize.transaction(async() => {
      var kopnik = await models.Kopnik.findById(KOPNIK)
      var starshina = STARSHINA ? await models.Kopnik.findById(STARSHINA) : null

      //старшины запоминаются на момент транзакции. в момент публикаций их войско будет уже меньше на войско копника
      let {prevStarshini, starshini, modifiedPredlozhenia}= await kopnik.setStarshina2(starshina)


      //войско тоже запоминается на момент транзакции потому что в setImmediate возможно будет уже поздно
      //часть войска убежит или еще что-то за это время
      var voiskoAsPlain = await models.sequelize.query(`
                                select id
                                from
                                    "Kopnik"
                                where
                                    path like :fullPath||'%'
                                order by 
                                    path
                                `,
        {
          replacements: {
            "fullPath": kopnik.fullPath,
          },
          type: models.Sequelize.QueryTypes.SELECT
        })

      /**
       * событие о изменения прилетает после того как клиент дождался ответа
       * об изменения
       */
      setImmediate(async() => {
        try {
          //себе и всему войску объявляю что у них сменился старшина
          for (let eachKopnikAsPlain of [kopnik].concat(voiskoAsPlain)) {
            await this.WAMP.session.publish(`api:model.Kopnik.id${eachKopnikAsPlain.id}.starshinaChange`, [], {
              KOPNIK,
              STARSHINA,
            }, {acknowledge: true});
          }

          //пержний старшина узнает что у него ушел из дружины
          if (prevStarshini.length) {
            await this.WAMP.session.publish(`api:model.Kopnik.id${prevStarshini[0].id}.druzhinaChange`, [], {
              action: "remove",
              KOPNIK: KOPNIK
            }, {acknowledge: true});
          }
          //новый старшина узнает что пришел в его дружину
          if (starshina) {
            await this.WAMP.session.publish(`api:model.Kopnik.id${STARSHINA}.druzhinaChange`, [], {
              action: "add",
              kopnik: kopnik.get({plain: true})
            }, {acknowledge: true});
          }

          //сначала роняю войско
          for (let eachStarshina of prevStarshini) {
            //старшины запоминались на момент транзакции. в момент публикаций их войско будет уже меньше на войско копника
            await this.WAMP.session.publish(`api:model.Kopnik.id${eachStarshina.id}.voiskoChange`, [], {voiskoSize: eachStarshina.voiskoSize - kopnik.voiskoSize - 1}, {acknowledge: true});
          }
          //теперь поднимаю войско новых старшин
          for (let eachStarshina of starshini) {
            await this.WAMP.session.publish(`api:model.Kopnik.id${eachStarshina.id}.voiskoChange`, [], {voiskoSize: eachStarshina.voiskoSize}, {acknowledge: true});
          }

          //ребаланс текущих голосований
          for (let [EACH_PREDLOZHENIE, {predlozhenie, voteResult}] of modifiedPredlozhenia) {
            console.log(EACH_PREDLOZHENIE, predlozhenie.value)
            await this.notifyPredlozhenieRebalance(predlozhenie, voteResult)
          }
        }
        catch (err) {
          this.log.error("Kopnik_setStarshina error", KOPNIK, STARSHINA, err);
        }
      })
    })
  }

  async notifyPredlozhenieRebalance(instance, delta = null) {
    /**
     * события
     */
    try {
      if (_.isObject(delta) && !_.isArray(delta)){
        delta= [delta]
      }
      let localDelta
      if (delta){
        localDelta= delta.map(eachDelta=>{
          // console.log("eachDelta", eachDelta)
          return {
            action: eachDelta.action,
            GOLOS: eachDelta.golos.id,
            value: eachDelta.golos.value,
          }
        })
      }
      await this.WAMP.session.publish(`api:model.Predlozhenie.id${instance.id}.rebalance`, [], {
        totalZa: instance.totalZa,
        totalProtiv: instance.totalProtiv,
        state: instance.state,
        delta: localDelta
/*
        GOLOS: voteResult ? voteResult.golos.id : null,
        action: voteResult ? voteResult.action : null,
        value: voteResult ? voteResult.golos.value : null
*/
      }, {acknowledge: true})
    }
    catch (err) {
      this.log.error("Kopnik_vote error", instance.id, instance.value, err);
    }

    /**
     * пуш-уведомления
     */
    if (instance.state) {
      let place = await instance.getPlace(),
        golosovanti = await place.getGolosovanti()
      try {
        await this.push(
          {
            eventType: "predlozhenieState",
            model: instance.get({plain: true})
          }, golosovanti/*, caller.id == 2 ? null : details.caller*/)
      }
      catch (err) {
        this.log.error("Kopnik_vote error", instance.id, instance.value, err)
      }

      /**
       * почта
       */
      try {
        instance.owner = await instance.getOwner()
        instance.place = place
        let emails = golosovanti.map(eachGolosovant => eachGolosovant.email)
        await require("./Mailer").sendSilent(emails, "Predlozhenie_fix.mustache", "Утверждено предложение caller.org", instance)
      }
      catch (err) {
        this.log.error(err)
      }
    }
  }

  /**
   * голосовать за предложение
   *
   * @param args
   * @param SUBJECT
   * @param value
   * @param details
   * @return {Promise.<void>}
   * @constructor
   */
  async Kopnik_vote(args, {KOPNIK, SUBJECT, value}, details) {
    value = parseInt(value);
    let caller,
      kopnik,
      subject,
      place,
      voteResult

    await models.sequelize.transaction(/*{
       isolationLevel: models.Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
       },*/
      async() => {
        caller = await models.Kopnik.findOne({
          where: {
            email: details.caller_authid
          }
        })
        if (caller.id == KOPNIK) {
          kopnik = caller
        }
        else if (caller.id == 2) {
          kopnik= await models.Kopnik.findById(KOPNIK)
        }
        else {
          throw new Error("can't vote for another kopnik")
        }
        subject = await models.Predlozhenie.findById(SUBJECT)
        place = await models.Kopa.findById(subject.place_id)
        if (await kopnik.getStarshinaNaKope(place)) {
          // throw new Error(`Вы не можете созывать копу на ${place.name}. На ${place.name} за вас выступает старшина, к которому вы должны обратиться.`)
          throw new Error(`vote_under_starshina`)
        }

        voteResult = await kopnik.vote(subject, value)
      })


    /**
     * извещаем всех о ребалансе голосов
     */
    setImmediate(async() => {
      await this.notifyPredlozhenieRebalance(subject, voteResult)
    })
  }

  async Kopnik_getDruzhina(args, {KOPNIK}, {caller_authid}) {
    let result = await models.Kopnik.findAll({
      where: {
        starshina_id: KOPNIK,
      },
      order: [
        ['surname', 'asc'],
        ['name', 'asc'],
        ['patronymic', 'asc'],
      ],
      include: [{
        model: models.File,
        as: 'attachments'
      }]
    });
    result = result.map(eachResult => eachResult.get({plain: true}));
    return result;
  }

  async Kopnik_verifyRegistration(args, {SUBJECT, state}, details) {
    let caller,
      result,
      subject

    await models.sequelize.transaction(async() => {
      caller = await models.Kopnik.findOne({
        where: {
          email: details.caller_authid
        }
      })

      subject = await models.Registration.findById(SUBJECT)
      result = await caller.verifyRegistration(subject, state)
      // await subject.destroy()
    })

    setImmediate(async() => {
      try {
        /**
         * события о том что появился новый копник всем заинтересованным общинам
         */
        if (result) {
          let doma = await result.getDoma()
          for (let everyDom of doma) {
            await this.WAMP.session.publish(`api:model.Zemla.id${everyDom.id}.obshinaChange`, [], {obshinaSize: everyDom.obshinaSize}, {acknowledge: true})
          }
        }

        /**
         * событие о том что регистрация изменилась
         */
        await this.WAMP.session.publish(`api:model.Registration.id${subject.id}.change`, [], {}, {acknowledge: true})
      }
      catch (err) {
        this.log.error("Kopnik_verify error", details.caller_authid, SUBJECT, err)
      }
    })
  }

  async Kopnik_getRegistrations(args, {}, {caller_authid}) {
    let caller = await models.Kopnik.findOne({
      where: {
        email: caller_authid
      }
    })
    let result = await caller.getUnverifiedRegistrations()
    result = result.map(eachResult => {
      let eachPlainResult = eachResult.get({plain: true})
      delete eachPlainResult.password
      return eachPlainResult
    })
    return result
  }

  /**
   * @param args
   * @param id
   * @param details
   * @constructor
   */
  async Kopa_invite(args, {id}, details) {
    let caller,
      kopa

    await models.sequelize.transaction(async() => {
      caller = await models.Kopnik.findOne({
        where: {
          email: details.caller_authid
        }
      })

      kopa = await models.Kopa.findById(id)

      if (kopa.owner_id != caller.id) {
        throw new Error("kopa.owner_id!= caller.id")
      }

      if (await caller.getStarshinaNaKope(kopa)) {
        throw new Error("kopa_under_starshina")
      }

      kopa.invited = new Date();

      await kopa.save()
    })

    setImmediate(async() => {
      try {
        /**
         * события
         */
        await this.WAMP.session.publish(`api:model.Kopa.id${id}.change`)
        await this.WAMP.session.publish(`api:model.Zemla.id${kopa.place_id}.kopaAdd`, [id])

        /**
         * пуш уведомления
         */
        let golosovanti = await kopa.getGolosovanti()
        await this.push({
          eventType: "kopaAdd",
          model: kopa.get({plain: true})
        }, golosovanti/*, caller.id == 2 ? null : details.caller*/)

        /**
         * почта
         */
        let golosovantiEmails = golosovanti.map(eachGolosovant => eachGolosovant.email)
        kopa.owner = caller
        await require("./Mailer").send(golosovantiEmails, "Kopa_invite.mustache", "Новая копа", kopa)
      }
      catch (err) {
        this.log.error(err)
      }
    })
  }

  /*
   async Kopa_setQuestion(args, {id, value}, details) {
   var tran = await models.sequelize.transaction();
   try {
   var kopa = await models.Kopa.findById(id);
   kopa.question = value;

   await kopa.save();
   await tran.commit();
   }
   catch (err) {
   await tran.rollback();
   throw err;
   }
   await this.WAMP.session.publish(`api:model.Kopa.id${id}.change`, null, {question: kopa.question});
   }
   */

  /**
   * сохранить модель
   * @param args
   * @param type
   * @param plain
   */
  async model_save(args, {type, plain}, {caller_authid}) {
    let caller = await models.Kopnik.findOne({
      where: {
        email: caller_authid
      }
    })

    await models.sequelize.transaction(async() => {
      let model = await models[type].findById(plain.id)
      await model.update(plain)
      let attachments = []
      for (let EACH_ATTACHMENT of plain.attachments) {
        let eachAttachment = await models.File.findById(EACH_ATTACHMENT)
        if (eachAttachment.owner_id != caller.id) {
          throw new Error("Нельзя прикрепить чужой файл")
        }
        await attachments.push(eachAttachment)
      }
      await model.setAttachments(attachments)
    })

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

  /**
   * создать модель
   * для регистрации назначает и возвращает заверителя
   *
   * @param args
   * @param type тип модели
   * @param plain модель в плоском виде
   * @return {*}
   */
  async model_create(args, {type, plain}, details) {
    let caller,
      owner,
      model,
      place,
      verifier,
      result
    this.log.debug("model_create", type, plain)

    if (type != "Registration") {
      caller = await models.Kopnik.findOne({
        where: {
          email: details.caller_authid
        }
      })
      if (plain.owner_id) {
        if (caller.id == plain.owner_id) {
          owner = caller
        }
        else if (caller.id == 2) {
          owner = await models.Kopnik.findById(plain.owner_id)
        }
        else {
          throw new Error("plain.owner_id!= caller.id")
        }
      }
    }

    /**
     * разрешения
     */
    switch (type) {
      case "Registration":
        if (plain.dom_id > 100 || plain.captchaResponse) {
          let result = await request.post({
            uri: 'https://www.google.com/recaptcha/api/siteverify',
            qs: {
              secret: config.captcha.secret,
              response: plain.captchaResponse
            },
            json: true // Automatically parses the JSON string in the response
          })
          if (!result.success) {
            throw new Error("Ошибка каптчи: " + result["error-codes"].join(", "))
          }
        }
        plain.password = bcrypt.hashSync(plain.password, bcrypt.genSaltSync(/*14*/))
        break
      case "Kopa":
        place = await models.Zemla.findById(plain.place_id)

        if (await owner.getStarshinaVDome(place)) {
          throw new Error("kopa_under_starshina")
        }
        /*
         if (owner.getSilaNaZemle() < 0.01) {
         throw new Error(`Вы не можете созывать копу на ${place.name}, т.к. у вас недостаточно авторитета (сил) для того чтобы созвать копников. По правилам kopnik.org для того чтобы созвать копу необходимо иметь хотя бы 1% от общего количества голосов. Для ${place.name} это составляет ${Math.ceil(place.obshinaSize / 100)} голосов. В подобном случае вы должны обратиться к своему старшине, для того чтобы он от своего имени созвал копу.`)
         }
         */
        break;
      case "Predlozhenie":
        place = await models.Kopa.findById(plain.place_id)
        if (await owner.getStarshinaNaKope(place)) {
          throw new Error("predlozhenie_under_starshina")
        }
        break;
      case "Golos":
        throw new Error("Golos can't be created by direct");
        break;
      case "Slovo":
        place = await models.Kopa.findById(plain.place_id)
        if (await owner.getStarshinaNaKope(place)) {
          throw new Error("slovo under starshina")
        }
        break;
    }

    result = await models.sequelize.transaction(async() => {
      model = await models[type].create(plain)
      result = {id: model.id, created: model.created_at}

      switch (type) {
        case "Registration":
          verifier = await model.setupVerifier()
          result.verifier = model.verifier = verifier.get({plain: true})
          delete result.verifier.password
          break
        case "Kopa":
          break
      }
      for (let EACH_ATTACHMENT of plain.attachments) {
        let eachAttachment = await models.File.findById(EACH_ATTACHMENT)
        if (eachAttachment.owner_id != (owner || caller).id) {
          throw new Error("Нельзя прикрепить чужой файл")
        }
        await eachAttachment["set" + type](model)
      }
      return result
    })

    /**
     * событие о том что создался новый объект ".*Add" должно уходить после того
     * как ".model.create" завершится и вернет ответ клиенту
     * только в этом случае клиент, отправивший запрос получит событие ".*Add"
     * когда новая модель уже будет доступна из кэша RemoteModel
     */

    /**
     * задерживать на секунду не получается
     * потому что два события над одним объектом прилетают в обратном порядке!
     */
    setImmediate(async() => {
      /**
       * события
       */
      try {
        switch (type) {
          case "Registration":
            await this.WAMP.session.publish(`api:model.Kopnik.id${verifier.id}.registrationAdd`, [model.id], {}, {acknowledge: true})
            break
          case "Kopnik":
            /*                          копник создается без старшины и выбирает его в процессе общения
             let starshini = await result.getStarshini();
             for (let eachStarshina of starshini) {
             await this.WAMP.session.publish(`api:model.Kopnik.id${eachStarshina.id}.voiskoChange`, [], {voiskoSize: eachStarshina.voiskoSize}, {acknowledge: true});
             }*/
            /**
             * событие о изменения прилетает после того как клиент дождался ответа
             * об изменения
             */
            let doma = await model.getDoma();
            for (let everyDom of doma) {
              await this.WAMP.session.publish(`api:model.Zemla.id${everyDom.id}.obshinaChange`, [], {obshinaSize: everyDom.obshinaSize}, {acknowledge: true});
            }
            break;
          case "Slovo":
            await this.WAMP.session.publish(`api:model.Kopa.id${plain.place_id}.slovoAdd`, [model.id], null, {acknowledge: true});
            break;
          case "Predlozhenie":
            await this.WAMP.session.publish(`api:model.Kopa.id${plain.place_id}.predlozhenieAdd`, [model.id], null, {acknowledge: true});
            break;
          /*          case "Golos":
           await this.WAMP.session.publish(`api:model.Predlozhenie.id${plain.for_id}.golosAdd`, [model.id], null, {acknowledge: true});
           break;*/
          case "Kopa":
            //kopaAdd первый раз прилетает только на компьютеры автора
            // а потом уже внутри Kopa#invite();

            /**
             * очень неоптимальный алгоритм. Надо переработат получения списка сессий автора
             */
            let CALLER_SESSIONS = []
            let SESSIONS = await this.WAMP.session.call("wamp.session.list")
            for (let EACH_SESSION of SESSIONS) {
              let eachSession = await this.WAMP.session.call("wamp.session.get", [EACH_SESSION])
              if (eachSession.authid == details.caller_authid) {
                CALLER_SESSIONS.push(EACH_SESSION)
              }
            }
            await this.WAMP.session.publish(`api:model.Zemla.id${plain.place_id}.kopaAdd`, [model.id], null, {
              acknowledge: true,
              eligible: CALLER_SESSIONS
            })
            break;
          case "Zemla":
            /*когда земля только создалась у нее еще нулевая община и поэтому она не меняет общины родителей
             let parents = await result.getParents();
             for (let eachParent of parents) {
             await this.WAMP.session.publish(`api:model.Zemla.id${eachParent.id}.obshinaChange`, [], {obshinaSize: eachParent.obshinaSize}, {acknowledge: true});
             }
             */
            break;
          case "File":
            break;
        }
      }
      catch (err) {
        this.log.error("model_create error", args, {typs: type, plain: plain}, err);
      }

      let golosovanti
      /**
       * пуш уведомления
       */
      try {
        switch (type) {
          case "Predlozhenie":
          case "Slovo":
            golosovanti = await place.getGolosovanti()
            await this.push(
              {
                eventType: type == "Predlozhenie" ? "predlozhenieAdd" : "slovoAdd",
                model: model.get({plain: true})
              }, golosovanti, type == "Predlozhenie" ? null : details.caller)
            break
        }
      }
      catch (err) {
        this.log.error("model_create error", args, {typs: type, plain: plain}, err)
      }

      /**
       * почта тоже асинхронно, чтобы не задерживать результат клиенту
       */
      try {
        switch (type) {
          case "Registration":
            await require("./Mailer").sendSilent(model.email, "Registration_create.mustache", "Подтвердите регистрацию kopnik.org", model)
            break;
          case "Predlozhenie":
            model.owner = caller
            model.place = await model.getPlace()
            let emails = golosovanti.map(eachGolosovant => eachGolosovant.email)
            await require("./Mailer").sendSilent(emails, "Predlozhenie_create.mustache", "Новое голосование kopnik.org", model)
            break
        }
      }
      catch (err) {
        this.log.error("model_create error", args, {typs: type, plain: plain}, err);
      }
    })

    return result
  }

  /**
   * удалить модель
   * @param args
   * @param type тип модели
   * @param plain модель в плоском виде
   * @return {*}
   */
  async model_destroy(args, {type, id}, {caller_authid}) {
    let caller = await models.Kopnik.findOne({
      where: {
        email: caller_authid
      }
    })

    let model = await models[type].findById(id)

    switch (type) {
      case "Kopa":
        let result = await model.getResult(),
          fixedResult

        if (model.owner_id != caller.id) {
          throw new Error("owner_id != caller.id")
        }
        if (fixedResult = result.find(e => e.state)) {
          throw new Error("can not destroy kopa with fixed result")
        }
        break
      case "Predlozhenie":
        if (model.owner_id != caller.id) {
          throw new Error("owner_id != caller.id")
        }
        if (model.state) {
          throw new Error("can not destroy fixed result")
        }
        break;
      case "Slovo":
        if (model.owner_id != caller.id) {
          throw new Error("owner_id != caller.id")
        }
        break;
      default:
        throw new Error("Не может быть удалено")
    }

    await models.sequelize.transaction(async() => {
      await model.destroy()
    })

    /**
     * событие о том что удалился объект ".*Remove" должно уходить после того
     * как ".model.destroy" завершится и вернет ответ клиенту
     * только в этом случае повторный запрос не будет содержать удаленный объект
     */

    setImmediate(async() => {
      try {
/*
        switch (type) {
          case "Predlozhenie":
            await this.WAMP.session.publish(`api:model.Kopa.id${model.place_id}.predlozhenieDestroy`, [model.id], null, {acknowledge: true})
            break;
          case "Slovo":
            await this.WAMP.session.publish(`api:model.Kopa.id${model.place_id}.slovoDestroy`, [model.id], null, {acknowledge: true})
            break;
          case "Kopa":
            await this.WAMP.session.publish(`api:model.Zemla.id${model.place_id}.kopaDestroy`, [model.id], null, {acknowledge: true})
            break;
        }
*/
        await this.WAMP.session.publish(`api:model.${type}.id${id}.destroy`, [], null, {acknowledge: true})
      }
      catch (err) {
        this.log.error("model_destroy error", args, {typs: type, id: id}, err);
      }
    })
  }

  /**
   * Первый запрос возвращает все мои неоткрытые и добивает их до 25шт разными открытыми
   * Последующие запросы возвращают копы до указанного времени
   * отсортированные по дате созванности (или создания для несозванных) в обратном порядке
   *
   * @param args
   * @param PLACE
   * @param BEFORE timestamp msec
   * @param caller_authid
   * @returns {*}
   */
  async Zemla_promiseKopi(args, {PLACE, BEFORE, count}, {caller_authid}) {
    let caller = await models.Kopnik.findOne({
        where: {
          email: caller_authid
        }
      }),
      place = await models.Zemla.findById(PLACE)

    if (!await caller.isDom(place)) {
      throw new Error(`Permission denied: foreign zemla ${place.name}`)
    }

    let BEFORE_FILTER

    count = count ? Math.min(count, 25) : 25
    /**
     * свои копы должны в любом случае уйти при первом запрсое
     * потому что у них даты созвания и это геморно обрабатывать
     */
    if (!BEFORE) {
      let callerKopiCount = await models.sequelize.query(`
        select count(*) as count
            from "Kopa" as kopa
            join "Kopnik" kopnik on kopnik.id= kopa.owner_id
        where
            kopa.place_id=:PLACE
            and kopa.invited is null 
            and kopnik.email=:caller_authid
            and kopa.deleted_at is null
            `,
        {
          replacements: {
            "PLACE": PLACE,
            "caller_authid": caller_authid,
          },
          type: models.Sequelize.QueryTypes.SELECT
        });
      callerKopiCount = callerKopiCount[0].count
      count = Math.max(count, callerKopiCount)

      BEFORE_FILTER = `(
            kopa.invited is not null 
            or (
                kopa.invited is null 
                and kopnik.email=:caller_authid
                )
            )`
    }
    else {
      BEFORE_FILTER = `kopa.invited <  to_timestamp(:BEFORE)`;
    }

    let resultAsArray = await models.sequelize.query(`
        select kopa.*
            from "Kopa" as kopa
            join "Kopnik" as kopnik on kopnik.id= kopa.owner_id
        where
            kopa.place_id=:PLACE
            and ${BEFORE_FILTER}
            and kopa.deleted_at is null
        order by
            kopa.invited desc nulls first,
            kopa.created_at desc
            limit :count
            `,
      {
        replacements: {
          "PLACE": PLACE,
          "BEFORE": Math.floor(BEFORE / 1000),
          "caller_authid": caller_authid,
          "count": count
        },
        type: models.Sequelize.QueryTypes.SELECT
      });

    let RESULT = resultAsArray.map(each => each.id);
    let result = await models.Kopa.findAll({
      where: {
        id: {
          $in: RESULT
        },
      },
      order: [
        ['invited', 'asc nulls last'],
        ['created_at', 'asc']
      ],
    });
    result = result.map(eachResult => eachResult.get({plain: true}));
    return result
  }

  /**
   * Копа
   */
  /**
   * отсортированные по дате создания
   * @returns {Promise<array>}
   */
  async Kopa_getDialog(args, {PLACE, BEFORE}, {caller_authid}) {
    let result = await models.Slovo.findAll({
      where: {
        place_id: {
          $eq: args[0]
        },
      },
      include: [{
        model: models.File,
        as: 'attachments'
      }],
      order: [
        ['created_at', 'asc'],
      ],
    });

    result = result.map(eachResult => eachResult.get({plain: true}));
    return result;
  }

  /**
   * Предложения созданные до BEFORE
   * отсортированные по дате создания
   * @param args
   * @param PLACE
   * @param BEFORE
   * @param caller_authid
   * @returns {Promise<array>}
   */
  async Kopa_getResult(args, kwargs, {caller_authid}) {
    let result = await models.Predlozhenie.findAll({
      where: {
        place_id: {
          $eq: args[0]
        },
      },
      include: [{
        model: models.File,
        as: 'attachments'
      }],
      order: [
        ['created_at', 'asc'],
      ],
    });
    result = result.map(eachResult => eachResult.get({plain: true}));
    return result;
  }

  /**
   * Прямые голоса по предложению
   * @param args
   * @param PLACE
   * @param BEFORE
   * @param caller_authid
   * @returns {Promise<array>}
   */
  async Predlozhenie_getGolosa(args, {PREDLOZHENIE}, {caller_authid}) {
    let result = await models.Golos.findAll({
      where: {
        subject_id: PREDLOZHENIE,
        parent_id: null,
      },
      order: [
        ['created_at', 'asc'],
      ],
    });
    result = result.map(eachResult => eachResult.get({plain: true}));
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

  async getPermission(type, model, caller, permission) {
    this.log.debug("#getPermission()", type, model.id, caller.fullName, permission)
    if (caller.id==2 && permission=="read"){
      return true
    }
    switch (permission) {
      case "read":
        switch (type/*model.$modelOptions.name.singular*/) {
          case "Zemla":
            return true
          case "Kopa":
            return await caller.isDom(await model.getPlace())
          case "Golos":
            var predlozhenie = await model.getSubject(),
              kopa = await predlozhenie.getPlace(),
              zemla = await kopa.getPlace()
            return await caller.isDom(zemla)
          case "Slovo":
          case "Predlozhenie":
            var kopa = await model.getPlace(),
              zemla = await kopa.getPlace()
            return await caller.isDom(zemla)
          case "Registration":
            return caller.id == (await model.getClosestVerifier()).id
          case "Kopnik":
            return true
          case "File":
            let parent
            if (parent = await model.getKopa()) {
              return await this.getPermission("Kopa", parent, caller, permission)
            }
            if (parent = await model.getSlovo()) {
              return await this.getPermission("Slovo", parent, caller, permission)
            }
            else if (parent = await model.getPredlozhenie()) {
              return await this.getPermission("Predlozhenie", parent, caller, permission)
            }
            else {
              return true
            }
          default:
            throw new Error("Неизвестный тип")
        }
        break
      default:
        throw new Error("unknown permission=" + permission)
    }
  }

  /**
   * "Обещает" вернуть модель
   *
   * @param args
   * @param kwargs
   * @returns {*}
   */
  async promiseModel(args, kwargs, {caller_authid}) {
    this.log.debug("#promiseModel()", args, kwargs)
    let caller = await models.Kopnik.findOne({
      where: {
        email: caller_authid
      }
    })

    if (!kwargs.id) {
      throw new Error("Не задан идентификатор модели")
    }

    let result,
      model

    switch (kwargs.model) {
      case "Zemla":
      case "Kopa":
      case "Golos":
      case "Slovo":
      case "Registration":
      case "Kopnik":
      case "Predlozhenie":
        model = await models[kwargs.model].findById(kwargs.id, {
          include: [{
            model: models.File,
            as: 'attachments'
          }]
        });
        if (!model){
          throw new Error(`${kwargs.model}:${kwargs.id} not found`)
        }
        result = model.get({plain: true});
        delete result.password;
        break;
      case "File":
        model = await models[kwargs.model].findById(kwargs.id)
        if (!model){
          throw new Error(`${kwargs.model}:${kwargs.id} not found`)
        }
        result = model.get({plain: true})
        break;
      default:
        throw new Error("Неизвестный тип")
    }

    if (!await this.getPermission(kwargs.model, model, caller, "read")) {
      throw new Error(`Permission denied: ${kwargs.model}:${model.id} read for ${caller.name}`)
    }

    return result
  }

  /**
   * Возвращает идентификатор копника по почте
   *
   * @param args
   * @param kwargs
   * @returns {number}
   */
  async getKOPNIKByEmail(args, kwargs) {
    let result = await models.Kopnik.findOne({where: {email: kwargs.email}})

    return result.id;
  }

  /**
   * обертака над стандартной autobahn.Session#register()
   * допом принимает контекст обработчика
   * и конввертирует обычне Error в autobahn.Error, которые только одни передаются по WAMP
   *
   * @type {any}
   */
  async registerHelper(procedure, endpoint, options, context) {
    let result = await this.WAMP.session.register(procedure, async(args, kwargs, details) => {
      try {
        if (context) {
          return await endpoint.call(context, args, kwargs, details)
        }
        else {
          return await endpoint(args, kwargs, details)
        }
      }
      catch (err) {
        this.log.error(err)
        throw new autobahn.Error(err.constructor.name || err.name, [err.message], {
          stack: err.stack.split("\n")
        })
      }
    }, options)
    this.log.debug(procedure, "registered")
    return result
  }

  /**
   * обертака над стандартной autobahn.Session#subscribe()
   * и конввертирует обычне Error в autobahn.Error, которые только одни передаются по WAMP
   *
   * @type {any}
   */
  async subscribeHelper(topic, handler, options) {
    let result = await this.WAMP.session.subscribe(topic, async(args, kwargs, details) => {
      try {
        return await handler(args, kwargs, details)
      }
      catch (err) {
        this.log.error(err)
        throw new autobahn.Error(err.constructor.name || err.name, [err.message], {
          stack: err.stack.split("\n")
        })
      }
    }, options)
    this.log.debug(topic, "subscribed")
    return result
  }

  /**
   * Удаляет все временные объекты после юнит тестов
   * временные объекты заканчиваются на "temp" и находятся в юниттестовых поддеревьях
   */
  async Cleaner_clean(args) {
    await Cleaner.clean(args)
  }

  start() {
    this.WAMP.open()
  }
}

module.exports = Server
