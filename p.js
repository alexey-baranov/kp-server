let models= require("./src/model");

var env = process.env.NODE_ENV || 'development';
var config = require(__dirname + '/cfg/config.json')[env];

(async()=>{
  let me= await models.Kopnik.findById(1)
  await me.setDom2(await models.Zemla.findById(17272028))
})()
