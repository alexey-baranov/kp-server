/**
 * Created by alexey2baranov on 8/26/16.
 *
 * регистрация пользователя
 */

let _ = require("lodash"),
  expect = require('chai').expect,
  log4js= require("log4js"),

  config = require("../../cfg"),
  Cleaner= require("../../src/Cleaner"),
  models = require("../../src/model"),
  api= require("../../src/axios")

/**
 * тестирует процесс аутентификации
 */
describe("auth process", function(){
  before(async ()=>{
    // await Cleaner.clean(["Registration"])
  })

  describe('/api/verify/index', () => {
    it ("success", async ()=> {
      let telegram

      //1. сбросил координаты дома
      let dom7 = await models.Zemla.findById(7)
      dom7.shirota= dom7.dolgota= null
      await dom7.save()

      //2. создал регистрацию на доме
      let registration = await models.Registration.create({
          name: "unit",
          prozvishe: "prozvishe",
          surname: "test",
          patronymic: "unittest",
          birth: 1900,
          passport: "passport",
          password: "password",
          note: "note",
          attachments: [],
          email: "email@domain.ru",
          skype: "skype",
          viber: "viber",
          whatsapp: "whatsapp",
          telegram: telegram= new Date().toISOString(),
          dom_id: dom7.id
      })

      //3. подтвердил регистрацию и заодно создал копника и установил координаты дома
      let response = await api.get("verify/index", {
        params: {
          registration_id: registration.id,
          state: 1,
          auth_token: config.unittest.Session.session1.token
        }
      })

      //1. проверяю что вернулось в клиент
      let kopnik_ = response.data
      expect(kopnik_).property("telegram", telegram)

      //2. проверяю что сохранилось в БД
      let kopnik = await models.Kopnik.findById(kopnik_.id)
      expect(kopnik).property("telegram", telegram)

      let dom= await kopnik.getDom()
      expect(dom).property("dolgota", 73.382522)
      expect(dom).property("shirota", 61.250755)
    })
  })
})