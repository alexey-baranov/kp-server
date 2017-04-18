/**
 * Created by alexey2baranov on 21.02.17.
 */
let _= require("lodash")
let fs= require("fs"),
  log4js = require("log4js")
let Mustache= require("mustache")

let config = require("../cfg")
let email = require("emailjs")

class Mailer {
  constructor() {

  }

  /**
   *
   * @param {string|Array} address alexey_baranov@inbox.ru
   * @param {string} HTML
   * @param {string} subject
   * @param {Object} templateView
   *
   */
  static async send(address, HTML, subject, templateView) {
    if (arguments.length==4){
      HTML= Mailer.renderTemplate(HTML, templateView)
    }

    log4js.getLogger(Mailer.name).debug("HTML", HTML)

    if (!config.SMTP.host){
      require("log4js").getLogger(Mailer.name).info("SMTP host not setted. Skipping email")
      return null
    }

    if (!_.isArray(address)){
      address= [address]
    }
    if (!Mailer.server){
      Mailer.server = email.server.connect({
        host: config.SMTP.host,
        ssl: false
      })
    }

    let errors=[]
    await Promise.all(address.map(eachAddress=>new Promise((res, rej) => {
      let message = {
        text: "Open this email in another email-client. This client does not support HTML messages",
        subject,
        // from: `<noreply@yandex.ru>`,
        from: config.SMTP.from,
        to: `${eachAddress}`,
        attachment: [
          {data: HTML, alternative: true},
        ]
      }
      if (!eachAddress){
        throw new Error("address is null", message)
      }
      Mailer.server.send(message, function (err, message) {
        if (err) {
          require("log4js").getLogger(Mailer.name).error(err)
          errors.push(err)
          res()
        }
        else {
          res()
        }
      })
    })))

    if (errors.length){
      throw new Error(errors.map(eachError=>eachError.message).join(", "))
    }
  }

  /**
   * Тот же самый send, но не выбрасывает наружу исключения
   * @return {Promise.<void>}
   */
  static async sendSilent(){
    try {
      await Mailer.send.apply(global, arguments)
    }
    catch(err){

    }
  }

  static renderTemplate(path, view){
    let template= fs.readFileSync(__dirname+"/../tmpl/"+path, "utf-8")

    let result= Mustache.render(template, view)

    return result
  }
}

Mailer.log = log4js.getLogger(Mailer.name)

module.exports= Mailer
