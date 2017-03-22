/**
 * Created by alexey2baranov on 8/26/16.
 */

let _ = require("lodash");
let assert = require('chai').assert;
let autobahn = require("autobahn");
let fs = require("fs")
let Mailer = require("../src/Mailer")

let request = require('superagent')


let config = require("../cfg")
let model = require("../src/model");
let models = require("../src/model")
// let cls = require('continuation-local-storage'),
//   namespace = cls.createNamespace('Sequelize');


let WAMP = require("../src/WAMPFactory").getWAMP();

describe('Infrastructure', function () {
  after(function () {
    return new Promise(function (resolve) {
      if (!WAMP.session || !WAMP.session.isOpen) {
        resolve();
        return
      }
      WAMP.onclose = function () {
        resolve();
      };
      WAMP.close();
    });
  });

  describe("database", function () {
    it('query', async() => {
      await model.sequelize.query("select 'КОПА'", {type: model.Sequelize.QueryTypes.SELECT});
    })

    it('different transactions', (done) => {
      let counter = 0

      model.sequelize.transaction(function (t1) {
        if (models.sequelize.Sequelize.cls.get('transaction') !== t1) {
          done("transaction !== t1")
        }
        else if (++counter == 2) {
          done()
        }
        return Promise.resolve()
      })

      model.sequelize.transaction(function (t2) {
        models.sequelize.query("select 777", {type: model.Sequelize.QueryTypes.SELECT});

        if (models.sequelize.Sequelize.cls.get('transaction') !== t2) {
          done("transaction !== t2")
        }
        else if (++counter == 2) {
          done()
        }
        return Promise.resolve()
      })

      // let tran1= await model.sequelize.transaction()
      // await model.sequelize.query("select 'КОПА'", {type: model.Sequelize.QueryTypes.SELECT});
    })

    it('different transactions async/await 2', async () => {
      await Promise.all([1,2].map(async ()=>{
        let tran= await models.sequelize.transaction()
        for(let x=0; x<10; x++){
          await await models.sequelize.query(`select * from "Kopnik" where id= `+x, {type: model.Sequelize.QueryTypes.SELECT});
        }
      }))
    })

    it('different transactions async/await 3', async () => {
      await Promise.all([1,2].map(async ()=>{
        return models.sequelize.transaction(async function(){
          for(let x=0; x<10; x++){
            await models.sequelize.query(`select * from "Kopnik" where id= `+x, {type: model.Sequelize.QueryTypes.SELECT});
          }
        })
      }))
      console.log("all done")
    })
  })

  it('crossbar', function () {
    return new Promise(function (resolve) {
      WAMP.onopen = function () {
        resolve();
      };
      WAMP.open();
    });
  });

  it('server', function (done) {
    WAMP.session.call("ru.kopa.pingPong", [1, 2, 3], {x: 1, y: 2, z: 3})
      .then(function (res) {
        if (!_.difference(res.args, [1, 2, 3]).length && _.isEqual(res.kwargs, {x: 1, y: 2, z: 3})) {
          done();
        }
        else {
          throw Error();
        }
      })
      .catch(function (er) {
        done(er);
      });
  });

  describe('file-server', function () {
    it('#upload()', async() => {
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

  describe.skip('email', function () {
    it('single call', async function () {
      await Mailer.send(["alexey2baranov@gmail.com", "alexey_baranov@inbox.ru"], "unit test.mustache", "Infrastructure.spec.js Юникод!", {now: new Date().toLocaleString()})
    })

    it('batch call', async function () {
      await Promise.all([
        Mailer.send(["alexey2baranov@gmail.com", "unittest1@domain.ru"], "unit test.mustache", "Infrastructure.spec.js Юникод!", {now: new Date().toLocaleString()}),
        Mailer.send(["unittest2@domain.ru", "unittest2@domain.ru"], "unit test.mustache", "Infrastructure.spec.js Юникод!", {now: new Date().toLocaleString()}),
        Mailer.send(["unittest4@domain.ru", "unittest5@domain.ru"], "unit test.mustache", "Infrastructure.spec.js Юникод!", {now: new Date().toLocaleString()}),
        Mailer.send(["alexey2baranov@gmail.com", "unittest1@domain.ru"], "unit test.mustache", "Infrastructure.spec.js Юникод!", {now: new Date().toLocaleString()}),
        Mailer.send(["unittest2@domain.ru", "unittest2@domain.ru"], "unit test.mustache", "Infrastructure.spec.js Юникод!", {now: new Date().toLocaleString()}),
        Mailer.send(["unittest4@domain.ru", "unittest5@domain.ru"], "unit test.mustache", "Infrastructure.spec.js Юникод!", {now: new Date().toLocaleString()}),
      ])
    })
  })
})
