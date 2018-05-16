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
    await Cleaner.clean(["Registration"])
  })

  describe('/api/auth/index', () => {
    it ("success auth", async ()=>{
      let response = await api.post("auth/index", {
        login: config.unittest.Kopnik.unittest2.telegram,
        password: config.unittest.Kopnik.unittest2.password,
      })

      //1. проверяю что клиент получил от сервера
      let data= response.data
      expect(data).property("auth_token").a("string")

      let user_= data.user
      expect(user_).property("id")
      expect(user_).property("name")
      expect(user_).property("surname")
      expect(user_).property("prozvishe")
      expect(user_).not.property("password")

      //2. проверяю что сохранилось в БД
      let session= await models.Session.findOne({
        where:{
          token:data.auth_token
        }
      })
      expect(session).property("owner_id", user_.id)
      expect(session).property("ip", "127.0.0.1")
      expect(session).property("userAgent").match(/axios/)

      //3. пробую еще раз по собой
      let response2 = await api.post("auth/index", {
        login: config.unittest.Kopnik.unittest2.telegram,
        password: config.unittest.Kopnik.unittest2.password,
      })

      //4. сверяю что второй раз регистрация это та же регистрация что и в первый раз
      let data2= response2.data
      expect(data2).property("auth_token").equal(data.auth_token)
    })

    it ("incorrect user", async ()=>{
      let expectaion= await expect(api.post("auth/index", {
        login: config.unittest.Kopnik.unittest2.telegram + "XXX",
        password: config.unittest.Kopnik.unittest2.password,
      })).rejectedWith(Error)
    })

    it ("incorrect password", async ()=>{
      let expectaion= await expect(api.post("auth/index", {
        login: config.unittest.Kopnik.unittest2.telegram,
        password: config.unittest.Kopnik.unittest2.password + "XXX",
      })).rejectedWith(Error)
    })
  })
})
