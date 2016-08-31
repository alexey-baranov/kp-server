/**
 * Created by alexey2baranov on 8/7/16.
 */

let models = require('./model');
let bcrypt= require("bcrypt");
var dom92= null;
var podezd1=null;
var alexey2baranov=null;
var unitTestZemla1= null;
var unitTestZemla2= null;
var unitTestKopnik1;

async function initSchema() {
    await models.sequelize.sync({force: true, logging: console.log});
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
    dom92 = await (await models.Zemla.create({name: '9/2'})).setParent(Dzerzhinskogo);
    podezd1 = await (await models.Zemla.create({name: 'подъезд 1'})).setParent(dom92);

}

async function initKopnik () {
    alexey2baranov = await models.Kopnik.create({
        name: 'Алексей',
        surname: 'Баранов',
        patronymic: 'Юрьевич',
        email: 'alexey_baranov@inbox.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });
    await alexey2baranov.setRodina(podezd1);

    //unit test
    unitTestKopnik1 = await models.Kopnik.create({
        name: 'Unit',
        surname: 'Test',
        patronymic: '1',
        email: 'unittest1@domain.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });
    await unitTestKopnik1.setRodina(unitTestZemla1);
    var unitTestKopnik2 = await models.Kopnik.create({
        name: 'Unit',
        surname: 'Test',
        patronymic: '2',
        email: 'unittest2@domain.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });
    await unitTestKopnik2.setRodina(unitTestZemla2);
}
async function initKopa () {
    let NOW= new Date();
    var kopa1 = await models.Kopa.create({
        question: 'Закрыть ебучий пивной ларек во дворе',
        planned: new Date(NOW-24*3600*1000),
        started: new Date(NOW-24*3600*1000)
    });
    await kopa1.setPlace(dom92);
    await kopa1.setInitiator(alexey2baranov);


    var kopa2 = await models.Kopa.create({
        question: 'Отремонтировать детскую площадку',
        planned: new Date(NOW-23*3600*1000),
        started: new Date(NOW-23*3600*1000)
    });
    await kopa2.setPlace(dom92);
    await kopa2.setInitiator(alexey2baranov);

    /**
     * чужая копа, которая уже открылась
     */
    var kopa3 = await models.Kopa.create({
        question: 'Прогнать ебучих алкашей',
        planned: new Date(NOW-22*3600*1000),
        started: new Date(NOW-22*3600*1000)
    });
    await kopa3.setPlace(dom92);
    await kopa3.setInitiator(unitTestKopnik1);


    var kopa4 = await models.Kopa.create({
        question: 'Снести шлакбаум у банка',
        planned: new Date(NOW+10*3600*1000)
    });
    await kopa4.setPlace(dom92);
    await kopa4.setInitiator(alexey2baranov);

    /**
     * чужая копа, которая еще не открылась
     */
    var kopa5 = await models.Kopa.create({
        question: 'Убрать раздолбаную белую волгу во дворе',
        planned: new Date(NOW+11*3600*1000)
    });
    await kopa5.setPlace(dom92);
    await kopa5.setInitiator(unitTestKopnik1);

}

async function init() {
    await initSchema();
    await initZemla();
    await initKopnik();
    await initKopa();
}


module.exports.initSchema = initSchema;
module.exports.initZemla= initZemla;
module.exports.initKopnik = initKopnik;
module.exports.init = init;

init()
    .catch(function (err) {
        console.error(err);
    });