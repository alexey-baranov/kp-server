/**
 * Created by alexey2baranov on 16.02.17.
 */

let fs = require('fs')
let padStart = require('string.prototype.padstart')
let express = require('express')
let fileUpload = require('express-fileupload')
let uuidV4 = require("uuid/v4")
let urlencode = require('urlencode')


let models = require("./model")

let app = express()

let config = require("../cfg/config.json")[process.env.NODE_ENV]

// default options
app.use(fileUpload())


app.options('/'+config["file-server"]["upload-path"], function (req, res) {
  res.set({
    'Content-Type': 'text/plain',
    "Access-Control-Allow-Origin": "*"
  })
  res.send()
})

app.post('/'+config["file-server"]["upload-path"], function (req, res) {
  let uploaded

  res.set({
    // 'Content-Type': 'text/plain',
    "Access-Control-Allow-Origin": "*"
  })

  if (!req.files) {
    res.status(500).send('No files were uploaded')
    return
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  uploaded = req.files.file

  let now = new Date(),
    uniqueName = req.body.resumableFilename.replace(/(.*)\.([^.]*)$/, `${now.getFullYear()}-${padStart(now.getMonth() + 1, 2, 0)}-${padStart(now.getDate().toString(), 2, 0)} ${padStart(now.getHours(), 2, 0)}-${padStart(now.getMinutes(), 2, 0)}-${padStart(now.getSeconds(), 2, 0)} $1.${uuidV4()}.$2`)

  // Use the mv() method to place the file somewhere on your server
  uploaded.mv(__dirname + '/../upload/' + uniqueName, async function (err) {
    if (err) {
      res.status(500).send(err)
    }
    else {
      uploaded = await models.File.create({
        name: req.body.resumableFilename,
        path: `upload/${uniqueName}`,
        mimeType: uploaded.mimetype,
        size: uploaded.data.length,
        owner_id: req.body.OWNER
      })
      res.json(uploaded.get({plain: true}))
    }
  })
})

app.get('/download', async function (req, res) {
  try {
    let file = await models.File.findOne({where: {path: req.query.path}})
    let data = fs.readFileSync(__dirname + "/../" + req.query.path)

    res.set({
      "Pragma": "public", // required
      "Expires": "0",
      "Cache-Control": "must-revalidate, post-check=0, pre-check=0, private",
// change, added quotes to allow spaces in filenames, by Rajkumar Singh
      "Content-Disposition": `attachment; filename*=UTF-8''${urlencode(file.name)}`,
      "Content-Transfer-Encoding": "binary",
      "Content-Length": file.size,
      'Content-Type': file.mimeType,
      "Access-Control-Allow-Origin": "*"
    })

    res.send(data)
  }
  catch(err){
    res.status(500).send(err)
  }
})

app.listen(config["file-server"].port, function () {
  console.log('Example app listening on port ' + config["file-server"].port)
})
