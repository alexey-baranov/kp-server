/**
 * Created by alexey2baranov on 8/20/16.
 */
let axios= require("axios"),
  cors= require("cors"),
  express = require('express'),
  expressasyncerrors= require('express-async-errors'),
  log4js= require("log4js"),
  bodyParser= require("body-parser")

let config= require("../cfg"),
  unittestRoute=require("./route/unittest"),
  registerRoute=require("./route/register")


log4js.configure(config.log )
log4js.getLogger().level = "debug"

let app = express()
app.use(cors({

  origin: '*',
  methods: ['GET', 'POST']
}))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use("/api/register", registerRoute)
app.use("/api/unittest", unittestRoute)

app.use(function(err,req,res,next){
  log4js.getLogger("express").error(err)
  res.status(500).json({
    name:err.constructor.name,
    message: err.message,
    stack: err.stack
  })
})
app.listen(8080)
