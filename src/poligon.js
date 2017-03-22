/**
 * Created by alexey2baranov on 21.03.17.
 */

let models= require("./model")

let kopnik1= await models.Kopnik.get(1)
kopnik1.setDom2()
