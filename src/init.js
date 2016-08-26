/**
 * Created by alexey2baranov on 8/7/16.
 */

let models = require('./../model');
let bcrypt= require("bcrypt");
var podezd1=null;


async function initSchema() {
    await models.sequelize.sync({force: true/*, logging: console.log*/});
}
async function initZemla() {
    var Zemla = await models.Zemla.create({name: 'Земля'});
    var Russia = await (await models.Zemla.create({name: 'Россия'})).setParent(Zemla);
    var Surgut = await (await models.Zemla.create({name: 'Сургут'})).setParent(Russia);
    var Dzerzhinskogo = await (await models.Zemla.create({name: 'ул. Дзержинского'})).setParent(Surgut);
    var dom92 = await (await models.Zemla.create({name: '9/2'})).setParent(Dzerzhinskogo);
    podezd1 = await (await models.Zemla.create({name: 'подъезд 1'})).setParent(dom92);

    console.log(Russia.name, ",parent is", (await Russia.getParent()).name);
}

async function initKopnik () {
    var alexe2baranov = await models.Kopnik.create({
        name: 'Алексей',
        surname: 'Баранов',
        patronymic: 'Юрьевич',
        email: 'alexey_baranov@inbox.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });
    await alexe2baranov.setOwn(podezd1);
}

async function init() {
    await initSchema();
    await initZemla();
    await initKopnik();
}


module.exports.initSchema = initSchema;
module.exports.initZemla= initZemla;
module.exports.initKopnik = initKopnik;
module.exports.init = init;

init()
    .catch(function (err) {
        console.error(err);
    });
