/**
 * Created by alexey2baranov on 21.03.17.
 */

let models= require("./model"),
  bcrypt= require("bcrypt");

models.sequelize.transaction(async ()=>{
  let kopnik1= await models.Kopnik.findById(1)
  kopnik1.password= bcrypt.hashSync("", bcrypt.genSaltSync(/*14*/))
  await kopnik1.save()
})
