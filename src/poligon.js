/**
 * Created by alexey2baranov on 21.03.17.
 */

let models= require("./model"),
  bcrypt= require("bcrypt"),
  Mailer= require("./Mailer")

models.sequelize.transaction(async ()=>{
  let kopniks= await models.Kopnik.findAll()

  console.log(kopniks.map(eachKopnik=>eachKopnik.email))

  await require("./Mailer").send(kopniks.map(eachKopnik=>eachKopnik.email), "Kopa_invite.mustache", "Новая копа", await models.Kopa.findById(176))
})
