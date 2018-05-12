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
 * тестирует процесс регистрации
 */
describe("register", function(){
  beforeAll(async ()=>{
    // await Cleaner.clean(["Registration"])
  })

  it('Registration#getClosestVerifier', async () => {
    let registration6= await models.Registration.findById(6)
    let verifier= await registration6.getClosestVerifier()

    expect(verifier.id).equal('6')
  })

  it('/register/index', async () => {
    let response = await api.post("register/index", {
      kwargs: {
        plain: {
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
          telegram: "telegram",
          dom_id: 4
        }
      }})

    //1. проверяю что клиент получил от сервера
    let plain= response.data
    expect(plain).property("id")
    expect(plain).property("created")
    expect(plain).not.property("password")

    plain = plain.verifier
    expect(plain).property("name")
    expect(plain).property("prozvishe")
    expect(plain).property("surname")
    expect(plain).property("patronymic")
    expect(plain).property("skype")
    expect(plain).property("viber")
    expect(plain).property("whatsapp")
    expect(plain).property("telegram")
    expect(plain).not.property("password")

    //2. проверяю что сохранилось в БД
    let model= await models.Registration.findById(plain.id)

    let verifier = await model.getVerifier()
    expect(verifier).instanceOf(models.Kopnik)
  })
})
