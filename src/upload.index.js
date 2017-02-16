/**
 * Created by alexey2baranov on 16.02.17.
 */

let padStart = require('string.prototype.padstart')
let express = require('express')
let fileUpload = require('express-fileupload')
let models = require("./model")

let app = express()

let config = require("../cfg/config.json")[process.env.NODE_ENV]

// default options
app.use(fileUpload())

app.all('/upload', function (req, res) {
  let uploaded

  res.set({
    'Content-Type': 'text/plain',
    "Access-Control-Allow-Origin": "*"
  })

  if (req.method == "OPTIONS") {
    res.send()
    return
  }

  if (!req.files) {
    res.status(500).send('No files were uploaded')
    return
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  uploaded = req.files.file


  let now = new Date(),
    uniqueName = req.body.resumableFilename.replace(/(.*)(\.[^.]*)$/, `${now.getFullYear()}-${padStart(now.getMonth() + 1, 2, 0)}-${padStart(now.getDate().toString(), 2, 0)} ${padStart(now.getHours(), 2, 0)}-${padStart(now.getMinutes(), 2, 0)}-${padStart(now.getSeconds(), 2, 0)}-${padStart(now.getMilliseconds(), 3, 0)} $1.${req.body.session}$2`)

  // Use the mv() method to place the file somewhere on your server
  uploaded.mv(__dirname + '/../uploaded/' + uniqueName, async function (err) {
    if (err) {
      res.status(500).send(err)
    }
    else {
      uploaded = await models.File.create({
        name: req.body.resumableFilename,
        path: `/uploaded/${uniqueName}`,
        mimeType: uploaded.mimetype,
        size: uploaded.data.length
      })
      res.send(uploaded.get({plain: true}))
    }
  })
})

app.listen(config.upload.port, function () {
  console.log('Example app listening on port ' + config.upload.port)
})
