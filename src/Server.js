/**
 * Created by alexey2baranov on 13.02.17.
 */

/**
 * Created by alexey2baranov on 8/7/16.
 */
var autobahn = require('autobahn'),
  bcrypt = require("bcrypt"),
  fs = require("fs"),
  log4js = require("log4js"),
  Mustache = require("mustache"),
  request = require("request-promise-native")


let config = require("../cfg/config.json")[process.env.NODE_ENV]
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

    this.WAMP.onopen = async(session, details) => {
      try {
        session.prefix('api', 'ru.kopa')
        this.log.info("connection.onopen()"/*, session._id, details*/)
        //очищаю таблицу сессий
        await models.Session.destroy({truncate: true, force:true})

        //метасобытия
        await this.subscribeHelper("wamp.session.on_join", this.session_join.bind(this))
        await this.subscribeHelper("wamp.session.on_leave", this.session_leave.bind(this))

        //org.kopnik
        // await this.registerHelper('api:getKopnikSESSION', this.getKopnikSESSION, null, this)


        //регистрация копника
        await this.registerHelper('api:registration.getCountries', this.Registration_getCountries, null, this)
        await this.registerHelper('api:registration.getTowns', this.Registration_getTowns, null, this)
        await this.registerHelper('api:registration.getStreets', this.Registration_getStreets, null, this)
        await this.registerHelper('api:registration.getHouses', this.Registration_getHouses, null, this)
        // await this.registerHelper('api:registration.apply', this.Registration_apply, null, this)

        await this.registerHelper('api:model.create', this.model_create, null, this)
        await this.registerHelper('api:model.destroy', this.model_destroy, null, this)
        await this.registerHelper('api:model.get', this.promiseModel, null, this)
        await this.registerHelper('api:model.getKOPNIKByEmail', this.getKOPNIKByEmail, null, this)
        await this.registerHelper('api:model.save', this.model_save, null, this)
        await this.registerHelper('api:pingPong', this.pingPong, null, this)
        await this.registerHelper('api:discloseCaller', this.discloseCaller, null, this)
        await this.registerHelper('api:pingPongDatabase', this.pingPongDatabase, null, this)
        await this.registerHelper('api:error', this.error, null, this)
        await this.registerHelper('api:unitTest.cleanTempData', this.Cleaner_clean, null, this)

        //Kopnik
        await this.registerHelper('api:model.Kopnik.setStarshina', this.Kopnik_setStarshina, null, this)
        await this.registerHelper('api:model.Kopnik.getDruzhina', this.Kopnik_getDruzhina, null, this)
        await this.registerHelper('api:model.Kopnik.vote', this.Kopnik_vote, null, this)
        await this.registerHelper('api:model.Kopnik.verifyRegistration', this.Kopnik_verifyRegistration, null, this)
        await this.registerHelper('api:model.Kopnik.getRegistrations', this.Kopnik_getRegistrations, null, this);

        //Kopa
        // await this.registerHelper('api:model.Kopa.setQuestion', this.Kopa_setQuestion, null, this);
        await this.registerHelper('api:model.Kopa.invite', this.Kopa_invite, null, this);
        await this.registerHelper('api:model.Kopa.getDialog', this.Kopa_getDialog, null, this);
        await this.registerHelper('api:model.Kopa.getResult', this.Kopa_getResult, null, this);

        //Zemla
        await this.registerHelper('api:model.Zemla.setParent', this.Zemla_setParent, null, this);
        await this.registerHelper('api:model.Zemla.promiseKopi', this.Zemla_promiseKopi, null, this);


        //Predlozhenie
        await this.registerHelper('api:model.Predlozhenie.getGolosa', this.Predlozhenie_getGolosa, null, this);


        //unit test
        // await this.registerHelper('api:unitTest.orderProc', this.unitTest_orderProc, null, this);
        await this.registerHelper('api:unitTest.orderProc', this.unitTest_orderProc, null, this);


        /*        setInterval(async ()=>{
         await this.WAMP.session.publish(`api:keepAlive`, [], null, {acknowledge: true})
         },1000)*/

        let tick = 0;
        this.tickInterval = setInterval(() => {
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

  async session_join(args, kwargs, details) {
    let sessionAsPlain = Object.assign({}, args[0], {id: args[0].session})
    if (args[0].authrole != "anonymous" && args[0].authrole != "server") {
      let KOPNIK = await this.getKOPNIKByEmail([], {email: args[0].authid})
      sessionAsPlain.owner_id = KOPNIK
    }
    let session = await models.Session.create(sessionAsPlain)
  }

  async session_leave(args, kwargs, details) {
    let session = models.Session.build({id: "" + args[0]})
    await session.destroy()
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
                                select id, name||', '||get_full_zemla(id,1,3) as name, "obshinaSize"
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
    let tran = await models.sequelize.transaction();

    try {
      var zemla = await models.Zemla.findById(ZEMLA);
      let parent = PARENT ? await models.Zemla.findById(PARENT) : null;

      //родители запоминаются на момент транзакции. в момент публикаций их общины будут уже меньше на общину земли
      var prevParents = await zemla.getParents();
      await zemla.setParent2(parent);
      var parents = await zemla.getParents();

      await tran.commit();
    }
    catch (err) {
      await tran.rollback();
      throw err;
    }

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
    let tran = await models.sequelize.transaction();

    try {
      var kopnik = await models.Kopnik.findById(KOPNIK);
      var starshina = STARSHINA ? await models.Kopnik.findById(STARSHINA) : null;

      //старшины запоминаются на момент транзакции. в момент публикаций их войско будет уже меньше на войско копника
      var prevStarshini = await kopnik.getStarshini();
      await kopnik.setStarshina2(starshina);

      var starshini = await kopnik.getStarshini();

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
        });

      await tran.commit();
    }
    catch (err) {
      await tran.rollback();
      throw err;
    }

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
      }
      catch (err) {
        this.log.error("Kopnik_setStarshina error", KOPNIK, STARSHINA, err);
      }
    });
  }

  async Kopnik_vote(args, {SUBJECT, value}, details) {
    value = parseInt(value);
    let tran = await models.sequelize.transaction(),
      caller,
      subject,
      voteResult

    try {
      caller = await models.Kopnik.findOne({
        where: {
          email: details.caller_authid
        }
      });
      subject = await models.Predlozhenie.findById(SUBJECT)
      let place = await models.Kopa.findById(subject.place_id)
      if (await caller.getStarshinaNaKope(place)) {
        // throw new Error(`Вы не можете созывать копу на ${place.name}. На ${place.name} за вас выступает старшина, к которому вы должны обратиться.`)
        throw new Error(`vote_under_starshina`)
      }

      voteResult = await caller.vote(subject, value);
      await tran.commit();
    }
    catch (err) {
      await tran.rollback();
      throw err;
    }

    /**
     * извещаем всех о ребалансе голосов
     */
    setImmediate(async() => {
      try {
        await this.WAMP.session.publish(`api:model.Predlozhenie.id${subject.id}.rebalance`, [], {
          totalZa: subject.totalZa,
          totalProtiv: subject.totalProtiv,
          state: subject.state,
          GOLOS: voteResult.golos.id,
          action: voteResult.action,
          value: voteResult.golos.value
        }, {acknowledge: true});
      }
      catch (err) {
        this.log.error("Kopnik_vote error", SUBJECT, value, err);
      }
    });

    /**
     * уведомления
     */
    setImmediate(async() => {
      try {
        if (subject.state) {
          subject.owner = await subject.getOwner()
          subject.place = await subject.getPlace()
          let golosovanti = await subject.place.getGolosovanti(),
            emails = golosovanti.map(eachGolosovant => eachGolosovant.email)
          await require("./Mailer").sendSilent(emails, "Predlozhenie_fix.mustache", "Утверждено предложение caller.org", result)
        }
      }
      catch (err) {
        this.log.error(err)
      }
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
    let tran = await models.sequelize.transaction(),
      result,
      subject

    try {
      let caller = await models.Kopnik.findOne({
        where: {
          email: details.caller_authid
        }
      })

      subject = await models.Registration.findById(SUBJECT)
      result = await caller.verifyRegistration(subject, state)
      // await subject.destroy()
      await tran.commit()
    }
    catch (err) {
      await tran.rollback()
      throw err
    }

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
  async Kopa_invite(args, {id}, {caller_authid}) {
    let tran = await models.sequelize.transaction(),
      caller,
      kopa

    try {
      caller = await models.Kopnik.findOne({
        where: {
          email: caller_authid
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
      await tran.commit()
    }
    catch (err) {
      await tran.rollback();
      throw err;
    }

    setImmediate(async() => {
      try {
        /**
         * события
         */
        await this.WAMP.session.publish(`api:model.Kopa.id${id}.change`)
        await this.WAMP.session.publish(`api:model.Zemla.id${kopa.place_id}.kopaAdd`, [id])

        let golosovanti = await kopa.getGolosovanti(),
        golosovantiEmails = golosovanti.map(eachGolosovant => eachGolosovant.email)

        let golosovantiSessions= await models.Session.findAll({
          where:{
            "authid": {
              $in: golosovantiEmails
            }
          }
        }),
          GOLOSOVANTI_SESSIONS= golosovantiSessions.map(eachSession=>+eachSession.id)
        await this.WAMP.session.publish(`api:Application.notification`, null, {eventType: "kopaAdd", data: kopa.get({plain:true})}, {
          acknowledge: true,
          eligible: GOLOSOVANTI_SESSIONS
        })

        /**
         * почта
         */
        kopa.owner = caller
        await require("./Mailer").send(golosovantiEmails, "Kopa_invite.mustache", "Новая копа", kopa)
      }
      catch (err) {
        this.log.error(err)
      }
    })
  }

  async Kopa_setQuestion(args, {id, value}, details) {
    var tran = await models.sequelize.transaction();
2
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

  /**
   * "Обещает" сохранить модель
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

    let tran = await models.sequelize.transaction()

    try {
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

      await tran.commit();
    }
    catch (err) {
      await tran.rollback();
      throw err;
    }

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
   * "Обещает" создать модель
   * для регистрации назначает и возвращает заверителя
   *
   * @param args
   * @param type тип модели
   * @param plain модель в плоском виде
   * @return {*}
   */
  async model_create(args, {type, plain}, {caller_authid}) {
    let caller
    this.log.debug("model_create", type, plain)

    if (type != "Registration") {
      caller = await models.Kopnik.findOne({
        where: {
          email: caller_authid
        }
      })
    }

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
        if (plain.owner_id != caller.id) {
          throw new Error("plain.owner_id!= caller.id")
        }
        let place = await models.Zemla.findById(plain.place_id)

        if (await caller.getStarshinaVDome(place)) {
          throw new Error("kopa_under_starshina")
        }
        /*
         if (caller.getSilaNaZemle() < 0.01) {
         throw new Error(`Вы не можете созывать копу на ${place.name}, т.к. у вас недостаточно авторитета (сил) для того чтобы созвать копников. По правилам kopnik.org для того чтобы созвать копу необходимо иметь хотя бы 1% от общего количества голосов. Для ${place.name} это составляет ${Math.ceil(place.obshinaSize / 100)} голосов. В подобном случае вы должны обратиться к своему старшине, для того чтобы он от своего имени созвал копу.`)
         }
         */
        break;
      case "Predlozhenie":
        if (plain.owner_id != caller.id) {
          throw new Error("plain.owner_id!= caller.id");
        }
        let place2 = await models.Kopa.findById(plain.place_id)

        if (await caller.getStarshinaNaKope(place2)) {
          throw new Error("predlozhenie_under_starshina")
        }
        break;
      case "Golos":
        throw new Error("Golos can't be created by direct");
        break;
      case "Slovo":
        if (plain.owner_id != caller.id) {
          throw new Error("plain.owner_id!= caller.id");
        }
        let place3 = await models.Kopa.findById(plain.place_id),
          starshinaNaKope
        if (await caller.getStarshinaNaKope(place3)) {
          throw new Error("slovo under starshina")
        }
        break;
    }

    let tran = await models.sequelize.transaction()

    try {
      /**
       * в конце этого try стоит return model, поэтому все делается внутри него
       * а ничего после уже не выполнится
       */
      let model = await models[type].create(plain),
        result = {id: model.id, created: model.created_at},
        verifier
      switch (type) {
        case "Registration":
          verifier = await model.setupVerifier()
          result.verifier = verifier.get({plain: true})
          delete result.verifier.password
          break
        case "Kopa":
          break
      }
      for (let EACH_ATTACHMENT of plain.attachments) {
        let eachAttachment = await models.File.findById(EACH_ATTACHMENT)
        if (eachAttachment.owner_id != caller.id) {
          throw new Error("Нельзя прикрепить чужой файл")
        }
        await eachAttachment["set" + type](model)
      }


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
            case "Golos":
              await this.WAMP.session.publish(`api:model.Predlozhenie.id${plain.for_id}.golosAdd`, [model.id], null, {acknowledge: true});
              break;
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
                if (eachSession.authid == caller_authid) {
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
      });

      /**
       * уведомления тоже асинхронно, чтобы не задерживать результат клиенту
       */
      setImmediate(async() => {
        try {
          switch (type) {
            case "Registration":
              await require("./Mailer").sendSilent(model.email, "Registration_create.mustache", "Подтвердите регистрацию kopnik.org", result)
              break;
            case "Predlozhenie":
              model.owner = caller
              model.place = await model.getPlace()
              let golosovanti = await model.place.getGolosovanti(),
                emails = golosovanti.map(eachGolosovant => eachGolosovant.email)
              await require("./Mailer").sendSilent(emails, "Predlozhenie_create.mustache", "Новое голосование kopnik.org", result)
              break
          }
        }
        catch (err) {
          this.log.error("model_create error", args, {typs: type, plain: plain}, err);
        }
      })


      await tran.commit()

      return result
    }
    catch (err) {
      await tran.rollback();
      throw err;
    }

    switch (type) {
      case "Registration":
        break
    }
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

    let tran = await models.sequelize.transaction()

    try {
      await model.destroy()
      await tran.commit()
    }
    catch (err) {
      await tran.rollback();
      throw err;
    }

    /**
     * событие о том что удалился объект ".*Remove" должно уходить после того
     * как ".model.destroy" завершится и вернет ответ клиенту
     * только в этом случае повторный запрос не будет содержать удаленный объект
     */

    setImmediate(async() => {
      try {
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
      }
      catch (err) {
        this.log.error("model_destroy error", args, {typs: type, id: id}, err);
      }
    });
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
    let BEFORE_FILTER

    count = count ? Math.min(count, 25) : 25

    if (!BEFORE)
    /**
     * свои копы должны в любом случае уйти при первом запрсое
     * потому что у них даты созвания и это геморно обрабатывать
     */{
      let callerKopiCount = await models.sequelize.query(`
        select count(*) as count
            from "Kopa" as kopa
            join "Kopnik" kopnik on kopnik.id= kopa.owner_id
        where
            kopa.place_id=:PLACE
            and kopa.invited is null 
            and kopnik.email=:caller_authid
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

  /**
   * "Обещает" вернуть модель
   *
   * @param args
   * @param kwargs
   * @returns {*}
   */
  async promiseModel(args, kwargs) {
    this.log.debug("#promiseModel()", args, kwargs)

    if (!kwargs.id) {
      throw new Error("Не задан идентификатор модели")
    }

    // var tran = await models.sequelize.transaction();
    let result = null;

    try {
      switch (kwargs.model) {
        case "Zemla":
        case "Kopa":
        case "Golos":
        case "Slovo":
        case "Registration":
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
        default:
          throw new Error("Неизвестный тип")
      }

      // await tran.commit();
      return result
    }
    catch (err) {
      // await tran.rollback()
      throw err
    }
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
