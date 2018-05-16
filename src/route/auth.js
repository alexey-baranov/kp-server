let axios= require("axios"),
  bcrypt= require("bcrypt"),
  express = require('express'),
  router = express.Router(),
  uuidv1 = require('uuid/v1'),

  config= require("../../cfg"),
  models= require("../model")

/**
 * @summary Вход по телеграму.
 * @summary Повторный вход возвращает ту же сессию.
 * @summary А повторный вход под другим логином изменяет логин у сессии и таким образом у всех окон этого браузера меняется сессия
 *
 * @param {object}  req
 * @param {object}  req.body
 * @param {object}  req.body.login
 * @param {string}  req.body.password
 * @param {Number}  req.body.captchaResponse
 *
 * @return {{auth_token:string, user: {id:string, name:string, surname:string, skype:string, dom_id:Number}}}
 */
router.all('/index', async function(req, res) {
  let result = await axios.post('https://www.google.com/recaptcha/api/siteverify',
    {
      secret: config.unittest.captcha.secret,
      response: req.body.captchaResponse
    })
  if (result.status != 200) {
    throw new Error("Ошибка каптчи: " + result.data["error-codes"].join(", "))
  }

  let user = await models.Kopnik.findOne({
    where: {
      telegram: req.body.login
    }
  })

  if (!user) {
    throw new Error("Неверное имя пользователя")
  }

  let pass = bcrypt.compareSync(req.body.password, user.password)
  if (!pass) {
    throw new Error("Неверный пароль")
  }

  //1. найти сессию с этого же браузера
  let session = await models.Session.findOne({
    where: {
      ip: req.ip.replace(/.*?(\d+.\d+.\d+.\d+).*?/, "$1"),
      userAgent: req.headers["user-agent"]
    }
  })

  //2. перебить логин сессии на новый логин
  if (session) {
    session.visited = new Date()
    session.telegram = req.body.login
    await session. save()
  }
  else {
    //3. если не нашел сессию с этого браузера, тогда уж создать новую сессию
    session = await models.Session.create({
      token: uuidv1(),
      visited: new Date(),
      ip: req.ip.replace(/.*?(\d+.\d+.\d+.\d+).*?/, "$1"),
      owner_id: user.id,
      userAgent: req.headers["user-agent"]
    })
  }

  let user_ = user.get({plain: true})
  delete user_.password
  res.json({
    user: user_,
    auth_token: session.token
  })
})

router.get('/', async function(req, res) {
  res.json({info:"auth"})
})

module.exports = router
