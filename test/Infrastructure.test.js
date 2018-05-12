/**
 * Created by alexey2baranov on 8/26/16.
 */

let _ = require("lodash"),
  fs = require("fs"),
   // log4js= require("./bootstrap"),
   log4js= require("log4js"),

  config = require("../cfg"),
  models = require("../src/model"),
  api= require("../src/axios")

describe('Infrastructure', function () {
  describe("log", function(){
    it("log", function(){
      log4js.getLogger().debug("you should see 3 messages")
      log4js.getLogger().error("you should see 3 messages")
      log4js.getLogger("api").debug("!!!YOU SHOULD NOT SEE ME!!!!")
      log4js.getLogger("api.subapi").debug("!!!YOU SHOULD NOT SEE ME!!!!")
      log4js.getLogger("api").info("you should see 3 messages")
      // console.log("this is console message")
    })
  })
  describe("database", function () {
    it('simple query', async () => {
      let result= await models.sequelize.query("select 'КОПА' as test")
      expect(result[0].test).toMatch('КОПА')
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
          return models.sequelize.query("select 1", {type: models.Sequelize.QueryTypes.SELECT})
            .then(() => {
              return models.sequelize.query("select 2", {type: models.Sequelize.QueryTypes.SELECT})
            })
            .then(() => {
              return models.sequelize.query("select 3", {type: models.Sequelize.QueryTypes.SELECT})
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

    it('different transactions', (done) => {
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
        return Promise.resolve()

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

    it('different transactions async/await 2', async () => {
      await Promise.all([1, 2].map(async () => {
        let tran = await models.sequelize.transaction()
        for (let x = 0; x < 10; x++) {
          await await models.sequelize.query(`select * from "Kopnik" where id= ` + x);
        }
      }))
    })

    it('different transactions async/await 3', async () => {
      await Promise.all([1, 2].map(async () => {
        return models.sequelize.transaction(async function () {
          for (let x = 0; x < 10; x++) {
            await models.sequelize.query(`select * from "Kopnik" where id= ` + x, {type: models.Sequelize.QueryTypes.SELECT});
          }
        })
      }))
    })
  })

  describe("server", ()=>{
    it('simple', async ()=> {
      let response= await api.get("unittest/simple")
      expect(response.data).toBe("unittest")
    })

    it('instance', async ()=> {
      let response= await api.get("unittest/simple")
      expect(response.data).toBe("unittest")
    })

    it('json', async ()=> {
      let response= await api.get("unittest/json")
      expect(response.data).toEqual({unittest:"unittest"})
    })

    /**
     * при ошибке оригинальное сообщение и стек хранится в err.response.data.message
     * а ошибка которая выбрасывается в клиенте имеет служебное сообщение "Error with status code 404 или 500"
     */
    it('status404', async ()=> {
      let expectation= expect(api.get("unittest/status404")).rejects

      await expectation.toThrow(Error)
      await expectation.toThrow("status code 404")
    })

    /**
     * при ошибке оригинальное сообщение и стек хранится в err.response.data.message
     * а ошибка которая выбрасывается в клиенте имеет служебное сообщение "Error with status code 404 или 500"
     */
    it('throw', async ()=> {
      try {
        await api.get("unittest/throw")
      }
      catch(err){
        expect(err.response.data.name).toMatch("Error")
        expect(err.response.data.message).toMatch("unittest")
        expect(err.response.data.stack).toBeTruthy()
      }
    })

    it('async', async ()=> {
      let response= await api.get("unittest/async")
      expect(response.data).toEqual("unittest")
    })

    it('asyncthrow', async ()=> {
      try {
        let response = await api.get("unittest/asyncthrow")
        let x=1;
      }
      catch(err){
        expect(err.response.data.message).toMatch("asyncthrow")
        expect(err.response.data.stack).toBeTruthy()
      }
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
