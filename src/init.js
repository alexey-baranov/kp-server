/**
 * Created by alexey2baranov on 8/7/16.
 */

let models = require('./model');
let bcrypt = require("bcrypt");
var Zemla,
    Russia,
    HMAO,
    Surgut,
    Dzerzhinskogo,
    dom92,
    podezd1;
var alexey2baranov = null;
var unitTestZemla1 = null;
var unitTestZemla2 = null;
var unitTestZemla3 = null,
    unitTestZemla4;

var kopnik2;
var kopnik3;
var kopnik4;
var kopnik5,
    kopnik6,
    kopnik7;

let zemla,
    kopnik,
    kopa,
    kopa3,
    slovo,
    predlozhenie,
    predlozhenie2,
    golos;

async function initSchema() {
    await models.sequelize.query(`DROP FUNCTION if exists get_zemli(bigint); DROP FUNCTION if exists get_full_zemla(bigint, integer); DROP FUNCTION if exists get_starshini(bigint);`,
        {
            type: models.Sequelize.QueryTypes.SELECT
        });


    await models.File.drop();
    await models.Golos.drop();
    await models.Predlozhenie.drop();
    await models.Slovo.drop();
    await models.Kopa.drop();
    await models.Kopnik.drop();
    await models.Zemla.drop();



    // await models.sequelize.sync({force: true, logging: console.log});

    await models.Zemla.sync({force: true, logging: console.log});
    await models.Kopnik.sync({force: true, logging: console.log});
    await models.Kopa.sync({force: true, logging: console.log});
    await models.Slovo.sync({force: true, logging: console.log});
    await models.Predlozhenie.sync({force: true, logging: console.log});
    await models.Golos.sync({force: true, logging: console.log});
    await models.File.sync({force: true, logging: console.log});
}

async function initZemla() {
    //unit test
    {
        unitTestZemla1= await models.Zemla.create({name: 'UnitTest1', path: "/", level:0});
        zemla = unitTestZemla2 = await (await models.Zemla.create({name: 'UnitTest2', level:0})).setParent2(unitTestZemla1);    //unit test
        unitTestZemla3 = await (await models.Zemla.create({name: 'UnitTest3', level:0})).setParent2(unitTestZemla2);
        unitTestZemla4 = await (await models.Zemla.create({name: 'UnitTest4', level:0})).setParent2(unitTestZemla1);    //unit test
    }
    Zemla = await models.Zemla.create({name: 'Земля', path: "/", level:-1});
    Russia = await (await models.Zemla.create({name: 'Россия', level:0})).setParent2(Zemla);
    // await Russia.setCountry(Russia); потому что Россия не находится в России
}

async function initKopnik() {
    alexey2baranov = await models.Kopnik.create({
        name: 'Алексей',
        surname: 'Баранов',
        patronymic: 'Юрьевич',
        dom_id: unitTestZemla4.id,
        email: 'alexey_baranov@inbox.ru',
        password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
        birth: 1983
    });

    //unit test
    kopnik = kopnik2 = await models.Kopnik.create({
        name: 'Unit',
        surname: 'Test',
        patronymic: '2',
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

    /**
     * Этот копник проверяет рекурсивную вьюшку kopnik-as-druzhe  (kopnik2-kopnik3-kopnik7)
     */
    kopnik7= await models.Kopnik.create({
        name: 'Unit',
        surname: 'Test',
        patronymic: '7',
        dom_id: unitTestZemla2.id,
        starshina_id: kopnik3.id,
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

        kopa3 = kopa = await models.Kopa.create({
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


        var kopa6 = await models.Kopa.create({
            question: 'далеко впереди',
            planned: new Date(FUTURE + 1 * 3600 * 1000),
        });
        await kopa6.setPlace(Zemla);
        await kopa6.setInviter(kopnik2);

        var kopa7 = await models.Kopa.create({
            question: 'далеко позади',
            planned: new Date(CHE - 2 * 3600 * 1000),
            invited: new Date(CHE - 2 * 3600 * 1000)
        });
        await kopa7.setPlace(Zemla);
        await kopa7.setInviter(kopnik2);
    }
}

async function initSlovo() {
    let CHE = new Date(2016, 9 - 1, 1).getTime();

    slovo = await models.Slovo.create({
        place_id: kopa3.id,
        owner_id: kopnik2.id,
        value: 'я ЗА!',
    });

    await models.Slovo.create({
        place_id: kopa3.id,
        owner_id: kopnik2.id,
        value: 'я ЗА!',
    });

    await models.Slovo.create({
        place_id: kopa3.id,
        owner_id: kopnik2.id,
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
        place_id: kopa3.id,
        author_id: kopnik2.id,
        value: 'Хочу ...',
    });

    predlozhenie2 = await models.Predlozhenie.create({
        place_id: kopa3.id,
        author_id: kopnik2.id,
        value: 'Предлагаю ...',
    });

    await models.Predlozhenie.create({
        place_id: kopa3.id,
        author_id: kopnik2.id,
        value: 'Считаю ...',
    });
}

async function initGolos() {
    // await kopnik2.vote(predlozhenie,1);
    await kopnik4.vote(predlozhenie2,1);
    await kopnik5.vote(predlozhenie2,1);
}

/**
 * Хранимые процедуры и функции
 */
async function initStored(){
    await models.sequelize.query(`
        CREATE OR REPLACE FUNCTION get_zemli(IN zemla_id bigint) RETURNS SETOF "Zemla" AS
        $BODY$
        DECLARE
            current_zemla_id bigint;
            current_zemla "Zemla";
        BEGIN
            current_zemla_id:= zemla_id;
        
            while (current_zemla_id is not null) loop
                select * from "Zemla" where id= current_zemla_id into current_zemla;
                return next current_zemla;
                current_zemla_id:= current_zemla.parent_id;
            end loop;
            
            return;
        END;
        $BODY$
        LANGUAGE plpgsql VOLATILE NOT LEAKPROOF;
`,
        {
            replacements: {

            },
            type: models.Sequelize.QueryTypes.SELECT
        });

    await models.sequelize.query(`
        CREATE OR REPLACE FUNCTION get_full_zemla(IN zemla_id bigint, IN start_level int) RETURNS text AS
        $BODY$
            select 
            string_agg(name, ', ') as result
            from (
                select * 
                from
                get_zemli(zemla_id) 
                where 
                level>=start_level
                order by 
                level
            ) zemli
        $BODY$
        LANGUAGE sql VOLATILE NOT LEAKPROOF;
`,
        {
            replacements: {

            },
            type: models.Sequelize.QueryTypes.SELECT
        });

    await models.sequelize.query(`
        CREATE OR REPLACE FUNCTION get_starshini(kopnik_id bigint)
          RETURNS SETOF "Kopnik" AS
        $BODY$
        DECLARE
            current_starshina_id bigint;
            current_starshina "Kopnik";
        BEGIN
            select starshina_id from "Kopnik" where id= kopnik_id into current_starshina_id;
        
            while (current_starshina_id is not null) loop
                select * from "Kopnik" where id= current_starshina_id into current_starshina;
                return next current_starshina;
                current_starshina_id:= current_starshina.starshina_id;
            end loop;
            
            return;
        END;
        $BODY$
        LANGUAGE plpgsql VOLATILE NOT LEAKPROOF;
`,
        {
            replacements: {

            },
            type: models.Sequelize.QueryTypes.SELECT
        });
}

async function init() {
    await initSchema();
    await initStored();
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