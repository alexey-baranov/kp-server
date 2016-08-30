/**
 * Created by alexey2baranov on 8/7/16.
 */
var autobahn = require('autobahn');
let config = require("../cfg/config.json")[process.env.NODE_ENV || 'development'];
let model = require("./model");

function stupidTest() {
    model.sequelize.query("select extract(epoch from now()) as \"timestamp\"", { type: model.Sequelize.QueryTypes.SELECT})
        .then(result=> {
            console.log(Math.round(result[0].timestamp));
        })
        .catch(er => {
            console.error(er);
            return {error: er.message};
        })
}

stupidTest();