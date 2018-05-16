/**
 * Created by alexey2baranov on 8/26/16.
 */

let _ = require("lodash"),
  bcrypt= require("bcrypt"),
  expect = require('chai').expect,
  log4js= require("log4js"),

  config = require("../cfg"),
  models = require("../src/model"),
  api= require("../src/axios")

describe('Infrastructure', function () {
  describe("bcrypt", function(){
    it("bcrypt", async function(){
      let password="qwerty"

      let hash= bcrypt.hashSync("qwerty", bcrypt.genSaltSync(10))

      let match= bcrypt.compareSync(password, hash)

      expect(match).true
    })
  })

  describe("log", function(){
    it("log", function(){

      log4js.getLogger().debug("you should see 3 messages")
      log4js.getLogger().error("you should see 3 messages")
      log4js.getLogger("api").debug("!!!YOU SHOULD NOT SEE ME!!!!")
      log4js.getLogger("api.subapi").debug("!!!YOU SHOULD NOT SEE ME!!!!")
      log4js.getLogger("api").info("you should see 3 messages")
      console.log("this is console message")
    })
  })

  describe("database", function () {
    it('simple query', async () => {
      let result= await models.sequelize.query("select 'КОПА' as test")
      expect(result[0].test).match(/КОПА/)
    })

    describe('cls transaction github issue', () => {
      it('async/await syntax', (done) => {
        models.sequelize.transaction(async (t1) => {
          await models.sequelize.query("select 1")
          await models.sequelize.query("select 2")
          await models.sequelize.query("select 3")
          if (models.sequelize.Sequelize.cls.get('transaction') !== t1) {
            done("transaction !== t1")
          }
          else{
            done()
          }
        })
      })

      it('then.then.then syntax', (done) => {
        models.sequelize.transaction((t1) => {
          return models.sequelize.query("select 1")
            .then(() => {
              return models.sequelize.query("select 2")
            })
            .then(() => {
              return models.sequelize.query("select 3")
            })
            .then(() => {
              if (models.sequelize.Sequelize.cls.get('transaction') !== t1) {
                done("transaction !== t1")
              }
              else {
                done()
              }
            })
        })
      })
    })

    it('two parallel transactions', (done) => {
      let counter = 0;

      models.sequelize.transaction(async (t1) => {
        await models.sequelize.query("select 1")
        await models.sequelize.query("select 2")
        await models.sequelize.query("select 3")
        if (models.sequelize.Sequelize.cls.get('transaction') !== t1) {
          done("transaction !== t1")
        }

        else if (++counter == 2) {
          done()
        }
      })

      models.sequelize.transaction(function (t2) {
        models.sequelize.query("select 777");

        if (models.sequelize.Sequelize.cls.get('transaction') !== t2) {
          done("transaction !== t2")
        }
        else if (++counter == 2) {
          done()
        }
        return Promise.resolve()
      })


      // let tran1= await models.sequelize.transaction()
      // await models.sequelize.query("select 'КОПА'", {type: models.Sequelize.QueryTypes.SELECT});
    })
  })

  describe("server", ()=>{
    it('simple-get', async ()=> {
      let response= await api.get("unittest/simple-get")
      expect(response.data).equal("unittest")
    })
    it('simple-post', async ()=> {
      let response= await api.post("unittest/simple-post", "unittest")
      expect(response.data).deep.equal({unittest:""})
    })
    it('simple-all', async ()=> {
      let response= await api.get("unittest/simple-all")
      expect(response.data).equal("unittest")

      response= await api.post("unittest/simple-all")
      expect(response.data).equal("unittest")
    })
    it('json', async ()=> {
      let response= await api.post("unittest/json", {unittest:"unittest"})
      expect(response.data).a("object")
        .deep.equal({unittest:"unittest"})
      // await expect(abc).throw().instanceOf(TypeError).property("message", "message")
    })

    /**
     * при ошибке 404 в дата лежит строка типа "status code 404"
     * а ошибка которая выбрасывается в клиенте имеет служебное сообщение "Error with status code 404 или 500"
     */
    it('status404', async ()=> {
      await expect(api.get("unittest/status404")).rejectedWith(Error, /404/)
    })

    /**
     * при ошибке оригинальное сообщение и стек хранится в err.response.data.message
     * а ошибка которая выбрасывается в клиенте имеет служебное сообщение "Error with status code 404 или 500"
     */
    it('throw (status 500)', async ()=> {
      await expect(api.get("unittest/throw"))
        .rejectedWith(Error, /500/)
        .eventually
        .property("response")
        .property("data")
        .all.key(["name","message", "stack"])
    })

    it('async', async ()=> {
      let result=await api.get("unittest/async")
      expect(result).property("data", "unittest")
    })

    it('asyncthrow (status 500)', async ()=> {
        await expect(api.get("unittest/asyncthrow"))
          .rejectedWith(Error,/500/)
          .eventually
          .property("response")
          .property("data")
          .all.keys(["name", "message", "stack"])
    })

    /**
     * тестирует автоматическую установку сессии в мидлваре сервера
     */
    describe("automatic session set in middleware by token", function(){
      it ("GET", async ()=> {
        let response = await api.get("/unittest/getSession", {
          params: {
            auth_token: "qwerty"
          }
        })

        expect(response.data)
          .property("id")
          .equal("1")
      })

      it ("POST", async ()=> {
        let response = await api.post("/unittest/getSession", {
          auth_token: "qwerty"
        })
        expect(response.data)
          .property("id")
          .equal("1")
      })
    })
  })

  describe.skip('file-server', function () {
    it('#upload()', async () => {
      console.log(config)
      let response = await request
        .post(`${config["file-server"].schema}://${config["file-server"].host}:${config["file-server"].port}/${config["file-server"]["upload-path"]}`)
        .field("OWNER", 2)
        .field("resumableFilename", "unittest.txt")
        .attach("file", __dirname + "/../upload/unittest/1.txt", "unittest.txt")

      let file = response.body

      assert.equal(file.owner_id, 2, "file.owner_id, 2")
      assert.equal(_.isArray(file.path.match(/txt$/)), true, "file.path,match(/txt$/)")
      assert.equal(file.size, 4, "file.size, 4")
      assert.equal(!file.mimeType, false, "file.mimeType, true")

      fs.readFileSync(__dirname + "/../" + file.path)
      assert.equal(Buffer.compare(fs.readFileSync(__dirname + "/../" + file.path), fs.readFileSync(__dirname + "/../upload/unittest/1.txt")), 0, "file content is ok")
    })

    it('#download()', async function () {
      let file2 = await models.File.findById(2)
      let response = await request
        .get(`${config["file-server"].schema}://${config["file-server"].host}:${config["file-server"].port}/${config["file-server"]['download-path']}`)
        .query({path: file2.path})

      assert.equal(response.status, 200, "response.status, 200")
      assert.equal(response.headers["content-disposition"].startsWith("attachment"), true, "response.headers.contentDisposition.startsWith (attachment)")
    })
  })
})
