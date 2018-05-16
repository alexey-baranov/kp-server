/**
 * процесс регистрирования
 */

let axios= require("axios"),
  bcrypt= require("bcrypt"),
  express = require('express'),
  router = express.Router()

let config= require("../../cfg"),
  models= require("../model")

/**
 * @summary Создать регистрацию
 *
 * @param {object}  req
 * @param {object}  req.body.registration            - плоский объект
 * @param {string}  req.body.registration.name
 * @param {string}  req.body.registration.prozvishe
 * @param {string}  req.body.registration.surname
 * @param {string}  req.body.registration.patronymic
 * @param {Date}    req.body.registration.birth
 * @param {string}  req.body.registration.passport
 * @param {string}  req.body.registration.password
 * @param {string}  req.body.registration.note
 * @param {File[]}  req.body.registration.attachments
 * @param {string}  req.body.registration.email
 * @param {string}  req.body.registration.skype
 * @param {string}  req.body.registration.viber
 * @param {string}  req.body.registration.whatsapp
 * @param {string}  req.body.registration.telegram
 * @param {Number}  req.body.registration.dom_id
 * @param {Number}  req.body.captchaResponse
 *
 * @return {{id:number, created_at:string, verifier: Kopnik}}
 */
router.all('/index', async function(req, res) {
  let registration_ = req.body.registration

  let result = await axios.post('https://www.google.com/recaptcha/api/siteverify',
    {
      secret: config.unittest.captcha.secret,
      response: req.body.captchaResponse
    })
  if (result.status != 200) {
    throw new Error("Ошибка каптчи: " + result.data["error-codes"].join(", "))
  }
  registration_.state = 0
  registration_.password = await bcrypt.hash(registration_.password, 1)

  let registration
  await models.sequelize.transaction(async () => {
    registration = await models.Registration.create(registration_)
    result = {id: registration.id, created: registration.created_at}

    let verifier = await registration.setupVerifier()
    result.verifier = verifier.get({plain: true})
    delete result.verifier.password

    for (let EACH_ATTACHMENT of registration_.attachments) {
      let eachAttachment = await models.File.findById(EACH_ATTACHMENT)
      //TODO: тут нет owner.id, т.к. это часть кода без сессии
      // if (eachAttachment.owner_id != (owner || caller).id) {
      //   throw new Error("Нельзя прикрепить чужой файл")
      // }
      await eachAttachment["set" + type](registration)
    }
  })

  res.status(200).json(result)
})

/**
 * @summary Получить страны
 *
 * @param {object}  req
 * @param {object}  req.body
 * @param {object}  req.body.kwargs
 * @param {object}  req.body.kwargs.plain - плоский объект
 * @param {string}  req.body.kwargs.plain.name
 * @param {string}  req.body.kwargs.plain.prozvishe
 * @param {string}  req.body.kwargs.plain.surname
 * @param {string}  req.body.kwargs.plain.patronymic
 * @param {Date}    req.body.kwargs.plain.birth
 * @param {string}  req.body.kwargs.plain.passport
 * @param {string}  req.body.kwargs.plain.password
 * @param {string}  req.body.kwargs.plain.note
 * @param {File[]}  req.body.kwargs.plain.attachments
 * @param {string}  req.body.kwargs.plain.email
 * @param {string}  req.body.kwargs.plain.skype
 * @param {string}  req.body.kwargs.plain.viber
 * @param {string}  req.body.kwargs.plain.whatsapp
 * @param {string}  req.body.kwargs.plain.telegram
 * @param {Number}  req.body.kwargs.dom_id
 *
 * @param {Number}  req.body.kwargs.plain.state
 * @param {Number}  req.body.kwargs.plain.captchaResponse
 *
 * @return {{id:number, created_at:string, verifier: Kopnik}}
 */
router.all('/index', async function(req, res) {
  let args = req.body.args,
    kwargs = req.body.kwargs,
    plain = kwargs.plain,
    type = kwargs.type

  if (plain.dom_id > 1000 || plain.captchaResponse) {
    let result = await axios.post('https://www.google.com/recaptcha/api/siteverify',
      {
        secret: config.captcha.secret,
        response: plain.captchaResponse
      })
    if (result.status != 200) {
      throw new Error("Ошибка каптчи: " + result.data["error-codes"].join(", "))
    }
  }
  plain.state=0
  plain.password = await bcrypt.hash(plain.password, 1)

  let model,
    result
  await models.sequelize.transaction(async () => {
    model = await models.Registration.create(plain)
    result = {id: model.id, created: model.created_at}

    let verifier = await model.setupVerifier()
    result.verifier = verifier.get({plain: true})
    delete result.verifier.password

    for (let EACH_ATTACHMENT of plain.attachments) {
      let eachAttachment = await models.File.findById(EACH_ATTACHMENT)
      if (eachAttachment.owner_id != (owner || caller).id) {
        throw new Error("Нельзя прикрепить чужой файл")
      }
      await eachAttachment["set" + type](model)
    }
  })

  res.status(200).json(result)
})
router.get("/getCountries", async function (req, res) {
  let query = req.query,
    term = query.term

    let result = await models.sequelize.query(`
                                select *
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
        }
      })
    res.json(result)
})
router.get("/getRegions", async function (req, res) {
  let query = req.query,
    term = query.term

    let result = await models.sequelize.query(`
                                select *
                                from
                                    "Zemla"
                                where
                                    level=1
                                    and parent_id= :country_id
                                    and lower(name) like lower(:term)||'%'
                                order by 
                                    name
                                limit 8
                                `,
      {
        replacements: {
          "country_id": query.country_id,
          "term": term,
        }
      })
    res.json(result)
})
router.get("/getTowns", async function (req, res) {
  let query = req.query,
    term = query.term

    let result = await models.sequelize.query(`
                                select z.*
                                from
                                    "Zemla" z
                                    join "ZemlaTree" zt on zt.menshe_id=z.id 
                                where
                                    (level =35 or level=4 or level=6)
                                    and zt.bolshe_id= :parent_id
                                    and lower(name) like lower(:term)||'%'
                                order by 
                                    name
                                limit 8
                                `,
      {
        replacements: {
          "parent_id": query.region_id||query.country_id,
          "term": term,
        }
      })
    res.json(result)
})
router.get("/getStreets", async function (req, res) {
  let query = req.query,
    term = query.term

    let result = await models.sequelize.query(`
                                select z.*
                                from
                                    "Zemla" z
                                where
                                    (level =7)
                                    and lower(name) like lower(:term)||'%'
                                    and parent_id= :town_id
                                order by 
                                    name
                                limit 8
                                `,
      {
        replacements: {
          "town_id": query.town_id,
          "term": term,
        }
      })
    res.json(result)
})
router.get("/getHouses", async function (req, res) {
  let query = req.query,
    term = query.term

    let result = await models.sequelize.query(`
                                select z.*
                                from
                                    "Zemla" z
                                where
                                    (level =99)
                                    and lower(name) like lower(:term)||'%'
                                    and parent_id= :street_id
                                order by 
                                    name
                                limit 8
                                `,
      {
        replacements: {
          "street_id": query.street_id,
          "term": term,
        }
      })
    res.json(result)
})

router.get('/', async function(req, res) {
  res.json({info:"регистрация"})
})

module.exports = router
