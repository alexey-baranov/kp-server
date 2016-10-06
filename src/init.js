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
var unitTestZemla3 = null,
    unitTestZemla4;

var kopnik2;
var kopnik3;
var kopnik4;
var kopnik5,
    kopnik6;

let zemla,
    kopnik,
    kopa,
    slovo,
    predlozhenie,
    golos;

async function initSchema() {
    await models.sequelize.sync({force: true, logging: console.log});
}
async function initZemla() {
    Zemla = await models.Zemla.create({name: 'Земля', path: "/"});
    //unit test
    {
        zemla = unitTestZemla2 = await (await models.Zemla.create({name: 'UnitTest2'})).setParent2(Zemla);    //unit test
        unitTestZemla3 = await (await models.Zemla.create({name: 'UnitTest3'})).setParent2(unitTestZemla2);
        unitTestZemla4 = await (await models.Zemla.create({name: 'UnitTest4'})).setParent2(Zemla);    //unit test
    }
    Russia = await (await models.Zemla.create({name: 'Россия'})).setParent2(Zemla);
    Surgut = await (await models.Zemla.create({name: 'Сургут'})).setParent2(Russia);
    Dzerzhinskogo = await (await models.Zemla.create({name: 'ул. Дзержинского'})).setParent2(Surgut);
    dom92 = await (await models.Zemla.create({name: '9/2'})).setParent2(Dzerzhinskogo);
    podezd1 = await (await models.Zemla.create({name: 'подъезд 1'})).setParent2(dom92);
}

async function initKopnik() {
    alexey2baranov = await models.Kopnik.create({
        name: 'Алексей',
        surname: 'Баранов',
        patronymic: 'Юрьевич',
        dom_id: podezd1.id,
        email: 'alexey_baranov@inbox.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });

    //unit test
    kopnik = kopnik2 = await models.Kopnik.create({
        name: 'Unit',
        surname: 'Test',
        patronymic: '1',
        dom_id: unitTestZemla2.id,
        email: 'unittest2@domain.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });
    kopnik3 = await models.Kopnik.create({
        name: 'Unit',
        surname: 'Test',
        patronymic: '3',
        dom_id: unitTestZemla2.id,
        starshina_id: kopnik2.id,
        email: 'unittest3@domain.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });
    kopnik4 = await models.Kopnik.create({
        name: 'Unit',
        surname: 'Test',
        patronymic: '4',
        dom_id: unitTestZemla2.id,
        email: 'unittest4@domain.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });
    kopnik5 = await models.Kopnik.create({
        name: 'Unit',
        surname: 'Test',
        patronymic: '5',
        dom_id: unitTestZemla2.id,
        email: 'unittest5@domain.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });

    /*
    Этот копник используется внутри тестов голосования Predlozhenie#fix()
    но не должен зафикситься на голосовании по копе на второй замле потому что он в четвертой земле,
     то есть он живет в четвертом доме, а копа во втором доме
     */
    kopnik6 = await models.Kopnik.create({
        name: 'Unit',
        surname: 'Test',
        patronymic: '6',
        dom_id: unitTestZemla4.id,
        starshina_id: kopnik2.id,
        email: 'unittest6@domain.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });
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
        await kopa1.setInviter(kopnik2);

        /**
         * чужая копа, которая еще не открылась
         */
        var kopa2 = await models.Kopa.create({
            question: 'близко в будущем чужая',
            planned: new Date(FUTURE + 1 * 3600 * 1000)
        });
        await kopa2.setPlace(unitTestZemla2);
        await kopa2.setInviter(kopnik3);

        var kopa3 = kopa = await models.Kopa.create({
            question: 'CHE',
            planned: new Date(CHE),
            invited: new Date(CHE)
        });
        await kopa3.setPlace(unitTestZemla2);
        await kopa3.setInviter(kopnik2);

        /**
         * чужая копа, которая уже открылась
         */
        var kopa4 = await models.Kopa.create({
            question: 'близко позади чужая',
            planned: new Date(CHE - 1 * 3600 * 1000),
            invited: new Date(CHE - 1 * 3600 * 1000)
        });
        await kopa4.setPlace(unitTestZemla2);
        await kopa4.setInviter(kopnik3);

        var kopa5 = await models.Kopa.create({
            question: 'далеко позади',
            planned: new Date(CHE - 2 * 3600 * 1000),
            invited: new Date(CHE - 2 * 3600 * 1000)
        });
        await kopa5.setPlace(unitTestZemla2);
        await kopa5.setInviter(kopnik2);


        var kopa5 = await models.Kopa.create({
            question: 'далеко впереди',
            planned: new Date(FUTURE + 1 * 3600 * 1000),
        });
        await kopa5.setPlace(Zemla);
        await kopa5.setInviter(kopnik2);

        kopa5 = await models.Kopa.create({
            question: 'далеко позади',
            planned: new Date(CHE - 2 * 3600 * 1000),
            invited: new Date(CHE - 2 * 3600 * 1000)
        });
        await kopa5.setPlace(Zemla);
        await kopa5.setInviter(kopnik2);
    }

    var kopa5 = await models.Kopa.create({
        question: 'Снести шлакбаум у банка',
        planned: new Date(FUTURE + 2 * 3600 * 1000)
    });
    await kopa5.setPlace(dom92);
    await kopa5.setInviter(alexey2baranov);

    /**
     * чужая копа, которая еще не открылась
     */
    kopa5 = await models.Kopa.create({
        question: 'Убрать раздолбаную белую волгу во дворе',
        planned: new Date(FUTURE + 1 * 3600 * 1000)
    });
    await kopa5.setPlace(dom92);
    await kopa5.setInviter(kopnik2);

    kopa5 = await models.Kopa.create({
        question: 'Отремонтировать детскую площадку',
        planned: new Date(CHE),
        invited: new Date(CHE)
    });
    await kopa5.setPlace(dom92);
    await kopa5.setInviter(alexey2baranov);

    /**
     * чужая копа, которая уже открылась
     */
    kopa5 = await models.Kopa.create({
        question: 'Навесить агитацию копы на подъездах дома',
        planned: new Date(CHE - 1 * 3600 * 1000),
        invited: new Date(CHE - 1 * 3600 * 1000)
    });
    await kopa5.setPlace(dom92);
    await kopa5.setInviter(kopnik2);

    kopa5 = await models.Kopa.create({
        question: 'Закрыть ебучий пивной ларек во дворе',
        planned: new Date(CHE - 2 * 3600 * 1000),
        invited: new Date(CHE - 2 * 3600 * 1000)
    });
    await kopa5.setPlace(dom92);
    await kopa5.setInviter(alexey2baranov);
}

async function initSlovo() {
    let CHE = new Date(2016, 9 - 1, 1).getTime();

    slovo = await models.Slovo.create({
        place_id: kopa.id,
        owner_id: kopnik.id,
        value: 'я ЗА!',
    });

    await models.Slovo.create({
        place_id: kopa.id,
        owner_id: kopnik.id,
        value: 'я ЗА!',
    });

    await models.Slovo.create({
        place_id: kopa.id,
        owner_id: kopnik.id,
        value: 'я ЗА!',
    });

    /*    await models.sequelize.query(`
     update "Slovo"
     set created_at = case id WHEN 2 THEN to_timestamp(:CHE) WHEN 3 THEN to_timestamp(:CHE-3600) END
     where
     id in (2,3)`,
     {
     replacements: {
     "CHE": CHE / 1000
     },
     type: models.Sequelize.QueryTypes.UPDATE
     });*/
}

async function initPredlozhenie() {
    predlozhenie = await models.Predlozhenie.create({
        place_id: kopa.id,
        author_id: kopnik.id,
        value: 'Хочу ...',
    });

    await models.Predlozhenie.create({
        place_id: kopa.id,
        author_id: kopnik.id,
        value: 'Предлагаю ...',
    });

    await models.Predlozhenie.create({
        place_id: kopa.id,
        author_id: kopnik.id,
        value: 'Считаю ...',
    });
}

async function initGolos() {
    golos = await models.Golos.create({
        for_id: predlozhenie.id,
        owner_id: kopnik.id,
        value: 1,
    });
}

async function init() {
    await initSchema();
    await initZemla();
    await initKopnik();
    await initKopa();
    await  initSlovo();
    await  initPredlozhenie();
    await  initGolos();
}


module.exports.initSchema = initSchema;
module.exports.initZemla = initZemla;
module.exports.initKopnik = initKopnik;
module.exports.init = init;

init()
    .catch(function (err) {
        console.error(err, err.stack);
    });