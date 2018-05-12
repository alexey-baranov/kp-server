let axios= require("axios"),
  bcrypt= require("bcrypt"),
  express = require('express'),
  router = express.Router()

let config= require("../../cfg"),
  models= require("../model")

/**
 * @summary Создать регистрацию
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
  plain.password = bcrypt.hashSync(plain.password, bcrypt.genSaltSync(/*14*/))

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

router.get('/', async function(req, res) {
  res.json({info:"регистрация"})
})

module.exports = router
