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
describe("register process", function(){
  before(async ()=>{
    // await Cleaner.clean(["Registration"])
  })

  it('Registration#getClosestVerifier', async () => {
    let registration6= await models.Registration.findById(6)
    let verifier= await registration6.getClosestVerifier()

    expect(verifier.id).equal('6')
  })

  it('/register/index', async () => {
    let response = await api.post("register/index", {
      registration: {
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
      },
      captchaResponse: config.unittest.captcha.key
    })

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

    //заверитель назначается при регистрации и сообщается зарегистрировавшемуся
    let verifier = await model.getVerifier()
    expect(verifier).instanceOf(models.Kopnik)
  })

  describe("getAddresses", function(){
    it("getCountries ''", async () => {
      let response = await api.get("register/getCountries", {
        params: {
          term: ""
        }})

      let data= response.data
      expect(data).instanceof(Array)
      expect(data).lengthOf.greaterThan(2)

      expect(data[0]).property("id",'2')
      expect(data[0]).property("name", "Country1")
    })

    it("getCountries 'co'", async () => {
      let response = await api.get("register/getCountries", {
        params: {
          term:"country1"
        }})

      let data= response.data
      expect(data).instanceof(Array)
      expect(data).lengthOf(1)

      expect(data[0]).property("id",'2')
      expect(data[0]).property("name", "Country1")
    })

    it("getRegions", async () => {
      let response = await api.get("register/getRegions", {
        params: {
          country_id: 2,
          term:"r"
        }})

      let data= response.data
      expect(data).instanceof(Array)
      expect(data).lengthOf(1)

      expect(data[0]).property("id",'3')
      expect(data[0]).property("name", "Region1")
    })

    it("getTowns 't' inside Country1", async () => {
      let response = await api.get("register/getTowns", {
        params: {
          country_id:2,
          term:"t"
        }})

      let data= response.data
      expect(data).instanceof(Array)
      expect(data).lengthOf(1)

      expect(data[0]).property("id",'5')
      expect(data[0]).property("name", "Town1")
    })

    it("getTowns 't' inside Region1", async () => {
      let response = await api.get("register/getTowns", {
        params: {
          region_id:3,
          term:"t"
        }})

      let data= response.data
      expect(data).instanceof(Array)
      expect(data).lengthOf(1)

      expect(data[0]).property("id",'5')
      expect(data[0]).property("name", "Town1")
    })

    it("getStreet 's' inside Town1", async () => {
      let response = await api.get("register/getStreets", {
        params: {
          town_id:5,
          term:"s"
        }})

      let data= response.data
      expect(data).instanceof(Array)
      expect(data).lengthOf(1)

      expect(data[0]).property("id",'6')
      expect(data[0]).property("name", "Street1")
    })

    it("getHouse 'h' inside Street1", async () => {
      let response = await api.get("register/getHouses", {
        params: {
          street_id: 6,
          term:"h"
        }})

      let data= response.data
      expect(data).instanceof(Array)
      expect(data).lengthOf(1)

      expect(data[0]).property("id",'7')
      expect(data[0]).property("name", "House1")
    })
  })
})
