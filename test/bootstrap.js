let log4js= require("log4js"),

  config= require("../cfg")

log4js.configure(config.log)

module.exports= log4js
