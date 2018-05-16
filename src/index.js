/**
 * Created by alexey2baranov on 8/20/16.
 */
let axios= require("axios"),
  cors= require("cors"),
  express = require('express'),
  expressasyncerrors= require('express-async-errors'),
  log4js= require("log4js"),
  bodyParser= require("body-parser"),

  config= require("../cfg"),
  models= require("./model"),
  unittestRoute=require("./route/unittest"),
  registerRoute=require("./route/register"),
  authRoute=require("./route/auth"),
  verifyRoute=require("./route/verify")

log4js.getLogger().level = "debug"

let app = express()
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(async (req, res, next) =>{
  if (req.query.auth_token || req.body.auth_token) {
    req.session = await models.Session.findOne({where: {token: req.query.auth_token || req.body.auth_token}})
  }
  next()
})

app.use("/api/unittest", unittestRoute)
app.use("/api/register", registerRoute)
app.use("/api/auth", authRoute)
app.use("/api/verify", verifyRoute)

app.use(function(err,req,res,next){
  log4js.getLogger("express").error(err)
  res.status(500).json({
    name:err.constructor.name,
    message: err.message,
    code: err.code,
    stack: err.stack
  })
})
app.listen(8080)
