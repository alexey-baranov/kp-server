/**
 * Created by alexey2baranov on 8/26/16.
 */

let _ = require("lodash");
let assert = require('chai').assert;
let autobahn = require("autobahn");
let fs = require("fs")
let Mailer = require("../src/Mailer")

let request = require('superagent')


let config = require("../cfg/config.json")[process.env.NODE_ENV];
let model = require("../src/model");
let models = require("../src/model")


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

  it('database', async() => {
    await model.sequelize.query("select 'КОПА'", {type: model.Sequelize.QueryTypes.SELECT});
  });

  it('crossbar', function (done) {
    WAMP.open();
    return new Promise(function () {
      WAMP.onopen = function () {
        done();
      };
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

  it('email', async function () {
    let message
    // message = await Mailer.send("alexey2baranov@gmail.com","<h1>Простой текст</h1><p>Я параграф</p>", "Infrastructure.spec.js Юникод!")
    // assert.equal(!message, false, "message is not empty")

    message = await Mailer.send("alexey2baranov@gmail.com","unit test.mustache", "Infrastructure.spec.js Юникод!", {now: new Date().toLocaleString()})
    assert.equal(!message, false, "message is not empty")
  })
})
