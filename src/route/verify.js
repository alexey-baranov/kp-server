let express = require('express'),
  router = express.Router(),

  config= require("../../cfg"),
  models= require("../model")

/**
 * @summary
 * Заверить регистрацию
 * Создать копника
 * Установить координаты
 *
 *
 * @param {object}  req
 * @param {object}  req.query
 * @param {object}  req.query.registration_id
 * @param {object}  req.query.state
 *
 * @returns {{id:string, name:string, surname:string}}
 */
router.get('/index', async function(req, res) {
  let user = await req.session.getOwner(),
    registration= await models.Registration.findById(req.query.registration_id),
    kopnik= await user.verifyRegistration(registration, req.query.state),
    kopnik_

  if (req.query.state) {
    kopnik_ = kopnik.get({plain: true})
    delete kopnik_.password

    let dom= await kopnik.getDom()
    if (!dom.dolgota || !dom.shirota){
      await dom.updateGeolocation()
    }
  }

  res.json(kopnik_)
})

router.get('/', async function(req, res) {
  res.json({info:"verify"})
})

module.exports = router
