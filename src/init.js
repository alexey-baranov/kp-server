/**
 * Created by alexey2baranov on 8/7/16.
 */

let models = require('./model');
let bcrypt= require("bcrypt");
var podezd1=null;
var unitTestZemla1= null;
var unitTestZemla2= null;


async function initSchema() {
    await models.sequelize.sync({force: true/*, logging: console.log*/});
}
async function initZemla() {
    var Zemla = await models.Zemla.create({name: 'Земля'});
    //unit test
    {
        unitTestZemla1 = await (await models.Zemla.create({name: 'UnitTest1'})).setParent(Zemla);    //unit test
        unitTestZemla2 = await (await models.Zemla.create({name: 'UnitTest2'})).setParent(unitTestZemla1);
    }
    var Russia = await (await models.Zemla.create({name: 'Россия'})).setParent(Zemla);
    var Surgut = await (await models.Zemla.create({name: 'Сургут'})).setParent(Russia);
    var Dzerzhinskogo = await (await models.Zemla.create({name: 'ул. Дзержинского'})).setParent(Surgut);
    var dom92 = await (await models.Zemla.create({name: '9/2'})).setParent(Dzerzhinskogo);
    podezd1 = await (await models.Zemla.create({name: 'подъезд 1'})).setParent(dom92);

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

    //unit test
    var unitTestKopnik1 = await models.Kopnik.create({
        name: 'Unit',
        surname: 'Test',
        patronymic: '1',
        email: 'unittest1@domain.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });
    await unitTestKopnik1.setOwn(unitTestZemla1);
    var unitTestKopnik2 = await models.Kopnik.create({
        name: 'Unit',
        surname: 'Test',
        patronymic: '2',
        email: 'unittest2@domain.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });
    await unitTestKopnik2.setOwn(unitTestZemla2);
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