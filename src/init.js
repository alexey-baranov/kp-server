/**
 * Created by alexey2baranov on 8/7/16.
 */

let models = require('./model');
let bcrypt = require("bcrypt");
var Zemla,
    Russia,
    Surgut,
    Dzerzhinskogo,
    dom92,
    podezd1;
var alexey2baranov = null;
var unitTestZemla2 = null;
var unitTestZemla3 = null;
var unitTestKopnik2;
var unitTestKopnik3;

async function initSchema() {
    await models.sequelize.sync({force: true, logging: console.log});
}
async function initZemla() {
    Zemla = await models.Zemla.create({name: 'Земля', path: "/"});
    //unit test
    {
        unitTestZemla2 = await (await models.Zemla.create({name: 'UnitTest2'})).setParentAndPath(Zemla);    //unit test
        unitTestZemla3 = await (await models.Zemla.create({name: 'UnitTest3'})).setParentAndPath(unitTestZemla2);
    }
    Russia = await (await models.Zemla.create({name: 'Россия'})).setParentAndPath(Zemla);
    Surgut = await (await models.Zemla.create({name: 'Сургут'})).setParentAndPath(Russia);
    Dzerzhinskogo = await (await models.Zemla.create({name: 'ул. Дзержинского'})).setParentAndPath(Surgut);
    dom92 = await (await models.Zemla.create({name: '9/2'})).setParentAndPath(Dzerzhinskogo);
    podezd1 = await (await models.Zemla.create({name: 'подъезд 1'})).setParentAndPath(dom92);
}

async function initKopnik() {
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
    unitTestKopnik2 = await models.Kopnik.create({
        name: 'Unit',
        surname: 'Test',
        patronymic: '1',
        email: 'unittest2@domain.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });
    await unitTestKopnik2.setRodina(unitTestZemla2);
    unitTestKopnik3 = await models.Kopnik.create({
        name: 'Unit',
        surname: 'Test',
        patronymic: '2',
        email: 'unittest3@domain.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });
    await unitTestKopnik3.setRodina(unitTestZemla3);
}
async function initKopa() {
    let FUTURE = new Date(2026, 9 - 1, 1).getTime(),
        CHE = new Date(2016, 9 - 1, 1).getTime();

    {
        var kopa1 = await models.Kopa.create({
            question: 'далеко в будущем',
            planned: new Date(FUTURE + 2 * 3600 * 1000)
        });
        await kopa1.setPlace(unitTestZemla2);
        await kopa1.setInviter(unitTestKopnik2);

        /**
         * чужая копа, которая еще не открылась
         */
        var kopa2 = await models.Kopa.create({
            question: 'близко в будущем чужая',
            planned: new Date(FUTURE + 1 * 3600 * 1000)
        });
        await kopa2.setPlace(unitTestZemla2);
        await kopa2.setInviter(unitTestKopnik3);

        var kopa3 = await models.Kopa.create({
            question: 'CHE',
            planned: new Date(CHE),
            started: new Date(CHE)
        });
        await kopa3.setPlace(unitTestZemla2);
        await kopa3.setInviter(unitTestKopnik2);

        /**
         * чужая копа, которая уже открылась
         */
        var kopa4 = await models.Kopa.create({
            question: 'близко позади чужая',
            planned: new Date(CHE - 1 * 3600 * 1000),
            started: new Date(CHE - 1 * 3600 * 1000)
        });
        await kopa4.setPlace(unitTestZemla2);
        await kopa4.setInviter(unitTestKopnik3);

        var kopa5 = await models.Kopa.create({
            question: 'далеко позади',
            planned: new Date(CHE - 2 * 3600 * 1000),
            started: new Date(CHE - 2 * 3600 * 1000)
        });
        await kopa5.setPlace(unitTestZemla2);
        await kopa5.setInviter(unitTestKopnik2);


        var kopa = await models.Kopa.create({
            question: 'далеко впереди',
            planned: new Date(FUTURE + 1 * 3600 * 1000),
        });
        await kopa.setPlace(Zemla);
        await kopa.setInviter(unitTestKopnik2);

        kopa = await models.Kopa.create({
            question: 'далеко позади',
            planned: new Date(CHE - 2 * 3600 * 1000),
            started: new Date(CHE - 2 * 3600 * 1000)
        });
        await kopa.setPlace(Zemla);
        await kopa.setInviter(unitTestKopnik2);
    }

    var kopa = await models.Kopa.create({
        question: 'Снести шлакбаум у банка',
        planned: new Date(FUTURE + 2 * 3600 * 1000)
    });
    await kopa.setPlace(dom92);
    await kopa.setInviter(alexey2baranov);

    /**
     * чужая копа, которая еще не открылась
     */
    kopa = await models.Kopa.create({
        question: 'Убрать раздолбаную белую волгу во дворе',
        planned: new Date(FUTURE + 1 * 3600 * 1000)
    });
    await kopa.setPlace(dom92);
    await kopa.setInviter(unitTestKopnik2);

    kopa = await models.Kopa.create({
        question: 'Отремонтировать детскую площадку',
        planned: new Date(CHE),
        started: new Date(CHE)
    });
    await kopa.setPlace(dom92);
    await kopa.setInviter(alexey2baranov);

    /**
     * чужая копа, которая уже открылась
     */
    kopa = await models.Kopa.create({
        question: 'Навесить агитацию копы на подъездах дома',
        planned: new Date(CHE - 1 * 3600 * 1000),
        started: new Date(CHE - 1 * 3600 * 1000)
    });
    await kopa.setPlace(dom92);
    await kopa.setInviter(unitTestKopnik2);

    kopa = await models.Kopa.create({
        question: 'Закрыть ебучий пивной ларек во дворе',
        planned: new Date(CHE - 2 * 3600 * 1000),
        started: new Date(CHE - 2 * 3600 * 1000)
    });
    await kopa.setPlace(dom92);
    await kopa.setInviter(alexey2baranov);
}

async function init() {
    await initSchema();
    await initZemla();
    await initKopnik();
    await initKopa();
}


module.exports.initSchema = initSchema;
module.exports.initZemla = initZemla;
module.exports.initKopnik = initKopnik;
module.exports.init = init;

init()
    .catch(function (err) {
        console.error(err);
    });