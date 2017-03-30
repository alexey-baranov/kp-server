/**
 * Created by alexey2baranov on 8/7/16.
 */
let config = require("../cfg")

console.log("config", config)

let models = require('./model')
let bcrypt = require("bcrypt")
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


  await models.File.drop({cascade: true})
  await models.Golos.drop({cascade: true})
  await models.Predlozhenie.drop({cascade: true})
  await models.Slovo.drop({cascade: true})
  await models.Kopa.drop({cascade: true})
  await models.Registration.drop({cascade: true})
  await models.Kopnik.drop({cascade: true})
  await models.Zemla.drop({cascade: true})

  await models.sequelize.sync({force: true, logging: console.log});
  /*
   await models.Zemla.sync({force: true, logging: console.log});
   await models.Kopnik.sync({force: true, logging: console.log});
   await models.Kopa.sync({force: true, logging: console.log});
   await models.Slovo.sync({force: true, logging: console.log});
   await models.Predlozhenie.sync({force: true, logging: console.log});
   await models.Golos.sync({force: true, logging: console.log});
   await models.File.sync({force: true, logging: console.log});
   */

  /**
   * Убрать после cycling dependency
   * https://github.com/sequelize/sequelize/issues/7169
   */
  await models.sequelize.query(`
    ALTER TABLE "Zemla" ADD COLUMN verifier_id bigint;
    CREATE INDEX zemla_verifier_id ON "Zemla" (verifier_id ASC NULLS LAST);
  `)
}

async function initZemla() {
  unitTestZemla1 = await models.Zemla.create({name: 'Rus', path: "/", level: -1})
  await models.sequelize.query(`update "Zemla" set verifier_id=2 where id =1`)
  zemla = unitTestZemla2 = await (await models.Zemla.create({name: 'Country1', level: 0})).setParent2(unitTestZemla1)
  unitTestZemla3 = await (await models.Zemla.create({name: 'Region1', level: 1, country_id: 2})).setParent2(unitTestZemla2)
  unitTestZemla4 = await (await models.Zemla.create({name: 'Country2', level: 0})).setParent2(unitTestZemla1)

  let town1= await (await models.Zemla.create({name: 'Town1', level: 4, country_id: 2})).setParent2(unitTestZemla3)
  let street1= await (await models.Zemla.create({name: 'Street1', level: 7, country_id: 2})).setParent2(town1)
  let house1= await (await models.Zemla.create({name: 'House1', level: 99, country_id: 2})).setParent2(street1)

  await models.sequelize.query(`select setval('"Zemla_id_seq"',100)`)
  Zemla = await models.Zemla.create({name: 'Земля', path: "/", level: -1});
  Russia = await (await models.Zemla.create({name: 'Россия', level: 0})).setParent2(Zemla);
  // await Russia.setCountry(Russia); потому что Россия не находится в России
}

async function initKopnikFromRegistration() {
  alexey2baranov = await models.Kopnik.create({
    name: 'Алексей',
    surname: 'Баранов',
    patronymic: 'Юрьевич',
    passport: "1234",
    skype: "alexey__baranov",
    dom_id: unitTestZemla4.id,
    email: 'alexey_baranov@inbox.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
    birth: 1983
  })

  //unit test
  kopnik = kopnik2 = await models.Kopnik.create({
    name: 'Unit',
    surname: 'Test',
    patronymic: '2',
    passport: "1234",
    skype: "skype",
    dom_id: unitTestZemla2.id,
    email: 'unittest2@domain.ru',
    password: bcrypt.hashSync(config.unittest2.password, bcrypt.genSaltSync(/*14*/)),
    birth: 1983
  })

  let registration1 = await models.Registration.create({
    name: 'registration1',
    surname: 'surname',
    patronymic: 'patronymic',
    passport: "1234",
    dom_id: unitTestZemla2.id,
    email: 'unittest@domain.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
    birth: 1983,
    verifier_id:2
  })

  let registration2 = await models.Registration.create({
    name: 'registration2',
    surname: 'surname',
    patronymic: 'patronymic',
    passport: "1234",
    dom_id: unitTestZemla2.id,
    email: 'unittest@domain.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
    birth: 1983,
    verifier_id:2
  })
  await kopnik2.verifyRegistration(registration2, -1)

  let registration3 = await models.Registration.create({
    name: 'Unit',
    surname: 'Test',
    patronymic: '3',
    passport: "1234",
    dom_id: unitTestZemla2.id,
    email: 'unittest3@domain.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
    birth: 1983
  })

  kopnik3 = await kopnik2.verifyRegistration(registration3, 1)
  await kopnik3.setStarshina2(kopnik2)


  let registration4 = await models.Registration.create({
    name: 'Unit',
    surname: 'Test',
    patronymic: '4',
    passport: "1234",
    dom_id: unitTestZemla2.id,
    email: 'unittest4@domain.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
    birth: 1983
  })
  kopnik4 = await kopnik2.verifyRegistration(registration4, 1)

  let registration5 = await models.Registration.create({
    name: 'Unit',
    surname: 'Test',
    patronymic: '5',
    passport: "1234",
    dom_id: unitTestZemla2.id,
    email: 'unittest5@domain.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
    birth: 1983
  })
  kopnik5 = await kopnik2.verifyRegistration(registration5, 1)

  /*
   Этот копник используется внутри тестов голосования Predlozhenie#fix()
   но не должен зафикситься на голосовании по копе на второй замле потому что он в четвертой земле,
   то есть он живет в четвертом доме, а копа во втором доме
   */
  let registration6 = await models.Registration.create({
    name: 'Unit',
    surname: 'Test',
    patronymic: '6',
    passport: "1234",
    dom_id: unitTestZemla4.id,
    email: 'unittest6@domain.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
    birth: 1983
  })
  kopnik6 = await kopnik2.verifyRegistration(registration6, 1)
  await kopnik6.setStarshina2(kopnik2)


  /**
   * Этот копник проверяет рекурсивную вьюшку kopnik-as-druzhe  (kopnik2-kopnik3-kopnik7)
   */
  let registration7 = await models.Registration.create({
    name: 'Unit',
    surname: 'Test',
    patronymic: '7',
    passport: "1234",
    dom_id: unitTestZemla2.id,
    starshina_id: kopnik3.id,
    email: 'unittest7@domain.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
    birth: 1983
  })
  kopnik7 = await kopnik2.verifyRegistration(registration7, 1)
  await kopnik7.setStarshina2(kopnik3)

}

async function setupUnitTest2Password(){
  let unittest2= await models.Kopnik.findById(2)
  unittest2.password=  bcrypt.hashSync(config.unittest2.password, bcrypt.genSaltSync(/*14*/))

  unittest2.save()
}
/*

async function initKopnik() {
  alexey2baranov = await models.Kopnik.create({
    name: 'Алексей',
    surname: 'Баранов',
    patronymic: 'Юрьевич',
    passport: "1234",
    dom_id: unitTestZemla4.id,
    email: 'alexey_baranov@inbox.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/!*14*!/)),
    birth: 1983
  });

  //unit test
  kopnik = kopnik2 = await models.Kopnik.create({
    name: 'Unit',
    surname: 'Test',
    patronymic: '2',
    passport: "1234",
    dom_id: unitTestZemla2.id,
    email: 'unittest2@domain.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/!*14*!/)),
    birth: 1983,
    skype: "alexey__baranov",
  });
  kopnik3 = await models.Kopnik.create({
    name: 'Unit',
    surname: 'Test',
    patronymic: '3',
    passport: "1234",
    dom_id: unitTestZemla2.id,
    starshina_id: kopnik2.id,
    email: 'unittest3@domain.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/!*14*!/)),
    birth: 1983
  });
  kopnik4 = await models.Kopnik.create({
    name: 'Unit',
    surname: 'Test',
    patronymic: '4',
    passport: "1234",
    dom_id: unitTestZemla2.id,
    email: 'unittest4@domain.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/!*14*!/)),
    birth: 1983
  });
  kopnik5 = await models.Kopnik.create({
    name: 'Unit',
    surname: 'Test',
    patronymic: '5',
    passport: "1234",
    dom_id: unitTestZemla2.id,
    email: 'unittest5@domain.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/!*14*!/)),
    birth: 1983
  });

  /!*
   Этот копник используется внутри тестов голосования Predlozhenie#fix()
   но не должен зафикситься на голосовании по копе на второй замле потому что он в четвертой земле,
   то есть он живет в четвертом доме, а копа во втором доме
   *!/
  kopnik6 = await models.Kopnik.create({
    name: 'Unit',
    surname: 'Test',
    patronymic: '6',
    passport: "1234",
    dom_id: unitTestZemla4.id,
    starshina_id: kopnik2.id,
    email: 'unittest6@domain.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/!*14*!/)),
    birth: 1983
  });

  /!**
   * Этот копник проверяет рекурсивную вьюшку kopnik-as-druzhe  (kopnik2-kopnik3-kopnik7)
   *!/
  kopnik7 = await models.Kopnik.create({
    name: 'Unit',
    surname: 'Test',
    patronymic: '7',
    passport: "1234",
    dom_id: unitTestZemla2.id,
    starshina_id: kopnik3.id,
    email: 'unittest6@domain.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/!*14*!/)),
    birth: 1983
  });
}

*/

async function initKopa() {
  let FUTURE = new Date(2026, 9 - 1, 1).getTime(),
    CHE = new Date(2016, 9 - 1, 1).getTime();

  {
    var kopa1 = await models.Kopa.create({
      question: 'далеко в будущем',
      planned: new Date(FUTURE + 2 * 3600 * 1000)
    });
    await kopa1.setPlace(unitTestZemla2);
    await kopa1.setOwner(kopnik2);

    /**
     * чужая копа, которая еще не открылась
     */
    var kopa2 = await models.Kopa.create({
      question: 'близко в будущем чужая',
      planned: new Date(FUTURE + 1 * 3600 * 1000)
    })
    await kopa2.setPlace(unitTestZemla2)
    await kopa2.setOwner(kopnik3)

    kopa3 = kopa = await models.Kopa.create({
      question: 'CHE',
      planned: new Date(CHE),
      invited: new Date(CHE)
    })
    await kopa3.setPlace(unitTestZemla2);
    await kopa3.setOwner(kopnik2);

    /**
     * чужая копа, которая уже открылась
     */
    var kopa4 = await models.Kopa.create({
      question: 'близко позади чужая',
      planned: new Date(CHE - 1 * 3600 * 1000),
      invited: new Date(CHE - 1 * 3600 * 1000)
    });
    await kopa4.setPlace(unitTestZemla2);
    await kopa4.setOwner(kopnik3);

    var kopa5 = await models.Kopa.create({
      question: 'далеко позади',
      planned: new Date(CHE - 2 * 3600 * 1000),
      invited: new Date(CHE - 2 * 3600 * 1000)
    });
    await kopa5.setPlace(unitTestZemla2);
    await kopa5.setOwner(kopnik2);


    var kopa6 = await models.Kopa.create({
      question: 'далеко впереди',
      planned: new Date(FUTURE + 1 * 3600 * 1000),
    });
    await kopa6.setPlace(Zemla);
    await kopa6.setOwner(kopnik2);

    var kopa7 = await models.Kopa.create({
      question: 'далеко позади',
      planned: new Date(CHE - 2 * 3600 * 1000),
      invited: new Date(CHE - 2 * 3600 * 1000)
    });
    await kopa7.setPlace(Zemla);
    await kopa7.setOwner(kopnik2);
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
    owner_id: kopnik2.id,
    value: 'Хочу ...',
  });

  predlozhenie2 = await models.Predlozhenie.create({
    place_id: kopa3.id,
    owner_id: kopnik2.id,
    value: 'Предлагаю ...',
  });

  await models.Predlozhenie.create({
    place_id: kopa3.id,
    owner_id: kopnik2.id,
    value: 'Считаю ...',
  });
}

async function initGolos() {
  // await kopnik2.vote(predlozhenie,1);
  await kopnik4.vote(predlozhenie2, 1);
  await kopnik5.vote(predlozhenie2, 1);
}

async function initFile() {
  let file1 = await models.File.create({
    name:"1.txt",
    mimeType: "application/octet-stream",
    size: 1523456,
    owner_id: 2,
    kopa_id: 3,
    path: 'upload/unittest/1.txt',
  });

  let file2 = await models.File.create({
    name:"юникод с пробелами.txt",
    mimeType: "application/octet-stream",
    size: 10,
    owner_id: 2,
    kopa_id: 3,
    path: 'upload/unittest/юникод с пробелами.txt',
  });
}

/**
 * Хранимые процедуры и функции
 */
async function initStored() {
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
      replacements: {},
      type: models.Sequelize.QueryTypes.SELECT
    });

  await models.sequelize.query(`
        CREATE OR REPLACE FUNCTION get_full_zemla(IN zemla_id bigint, IN start_level int, IN end_level int) RETURNS text AS
        $BODY$
            select 
            string_agg(name, ', ') as result
            from (
                select * 
                from
                get_zemli(zemla_id) 
                where 
                level between start_level and end_level
                order by 
                level
            ) zemli
        $BODY$
        LANGUAGE sql VOLATILE NOT LEAKPROOF;
`,
    {
      replacements: {},
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
      replacements: {},
      type: models.Sequelize.QueryTypes.SELECT
    });
}

/**
 *
 * @return {Promise.<void>}
 */
async function setSequenceVals() {
  /**
   * запас под будущие тесты
   * Zemla_id_seq уже установлена в initZemla()
   */
  await models.sequelize.query(`select setval('"Kopa_id_seq"',100); select setval('"Kopnik_id_seq"',100); select setval('"Slovo_id_seq"',100); select setval('"Predlozhenie_id_seq"',100); select setval('"Golos_id_seq"',100); select setval('"File_id_seq"',100); select setval('"Registration_id_seq"',100); select setval('"File_id_seq"',100);`)
}

async function init() {
  await initSchema()
  await initStored()
  await initZemla()
  await initKopnikFromRegistration()
  // await setupUnitTest2Password()
  await initKopa()
  await  initSlovo()
  await  initPredlozhenie()
  await  initGolos()
  await initFile()

  await setSequenceVals()
}


module.exports.initSchema = initSchema;
module.exports.initZemla = initZemla;
module.exports.initKopnikFromRegistration = initKopnikFromRegistration
module.exports.init = init;

init()
  .catch(function (err) {
    console.error(err, err.stack);
  });
