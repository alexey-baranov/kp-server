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

let
  kopnik,
  kopa,
  kopa3,
  kopa8,
  slovo,
  predlozhenie,
  predlozhenie2,
  predlozhenie4,
  golos;

async function initSchema() {
  await models.sequelize.query(`DROP FUNCTION if exists get_zemli(bigint); DROP FUNCTION if exists get_full_zemla(bigint, integer); DROP FUNCTION if exists get_starshini(bigint);`,
    {
      type: models.Sequelize.QueryTypes.SELECT
    });

  await models.PushSubscription.drop({cascade:true})
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

async function initZemli() {
  unitTestZemla1 = await models.Zemla.create({name: 'Rus', path: "/", level: -1})
  Zemla = unitTestZemla2 = await (await models.Zemla.create({name: 'Country1', level: 0})).setParent2(unitTestZemla1)
  unitTestZemla3 = await (await models.Zemla.create({name: 'Region1', level: 1, country_id: 2})).setParent2(unitTestZemla2)
  unitTestZemla4 = await (await models.Zemla.create({name: 'Country2', level: 0})).setParent2(unitTestZemla1)

  let town1= await (await models.Zemla.create({name: 'Town1', level: 4, country_id: 2})).setParent2(unitTestZemla3)
  let street1= await (await models.Zemla.create({name: 'Street1', level: 7, country_id: 2})).setParent2(town1)
  let house1= await (await models.Zemla.create({name: 'House1', level: 99, country_id: 2})).setParent2(street1)
}

async function initRussia() {
  Russia = await models.Zemla.create({name: 'Россия', level: 0})
}

async function initKopnikFromRegistration() {
  await models.Kopnik.create({
    name: 'Unit',
    surname: 'Test',
    patronymic: '1',
    passport: "1234",
    skype: "alexey__baranov",
    dom_id: unitTestZemla4.id,
    email: 'unittest1@domain.ru',
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
  await models.sequelize.query(`update "Zemla" set verifier_id=2 where id =1`)

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

  let registration8 = await models.Registration.create({
    name: 'permission denied on load',
    surname: 'Test',
    patronymic: '8',
    passport: "1234",
    dom_id: unitTestZemla4.id,
    email: 'unittest8@domain.ru',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
    birth: 1983
  })

  await models.sequelize.query(`update "Zemla" set verifier_id=6 where id =4`)
}

async function initAlexeyBaranov(){
  alexey2baranov = await models.Kopnik.create({
    name: 'Алексей',
    surname: 'Баранов',
    patronymic: 'Юрьевич',
    passport: "6311",
    skype: "alexey__baranov",
    telegram: "alexey2baranov",
    dom_id: Russia.id,
    email: 'alexey2baranov@gmail.com',
    password: bcrypt.hashSync("qwerty", bcrypt.genSaltSync(/*14*/)),
    birth: 1983
  })
}

async function setupUnitTest2Password(){
  let unittest2= await models.Kopnik.findById(2)
  unittest2.password=  bcrypt.hashSync(config.unittest2.password, bcrypt.genSaltSync(/*14*/))

  unittest2.save()
}

async function initKopa() {
  let FUTURE = new Date(2026, 9 - 1, 1).getTime(),
    CHE = new Date(2016, 9 - 1, 1).getTime();

  {
    var kopa1 = await models.Kopa.create({
      question: 'далеко в будущем',
      planned: new Date(FUTURE + 2 * 3600 * 1000)
    });
    // await kopa1.setPlace(unitTestZemla2);
    await kopa1.setOwner(kopnik2);

    /**
     * чужая копа, которая еще не открылась
     */
    var kopa2 = await models.Kopa.create({
      question: 'близко в будущем чужая',
      planned: new Date(FUTURE + 1 * 3600 * 1000)
    })
    // await kopa2.setPlace(unitTestZemla2)
    await kopa2.setOwner(kopnik3)

    kopa3 = kopa = await models.Kopa.create({
      question: 'CHE',
      planned: new Date(CHE),
      invited: new Date(CHE)
    })
    // await kopa3.setPlace(unitTestZemla2);
    await kopa3.setOwner(kopnik2);

    /**
     * чужая копа, которая уже открылась
     */
    var kopa4 = await models.Kopa.create({
      question: 'близко позади чужая',
      planned: new Date(CHE - 1 * 3600 * 1000),
      invited: new Date(CHE - 1 * 3600 * 1000)
    });
    // await kopa4.setPlace(unitTestZemla2);
    await kopa4.setOwner(kopnik3);

    var kopa5 = await models.Kopa.create({
      question: 'далеко позади',
      planned: new Date(CHE - 2 * 3600 * 1000),
      invited: new Date(CHE - 2 * 3600 * 1000)
    });
    // await kopa5.setPlace(unitTestZemla2);
    await kopa5.setOwner(kopnik2);


    var kopa6 = await models.Kopa.create({
      question: 'далеко впереди',
      planned: new Date(FUTURE + 1 * 3600 * 1000),
    });
    // await kopa6.setPlace(unitTestZemla1);
    await kopa6.setOwner(kopnik2);

    var kopa7 = await models.Kopa.create({
      question: 'далеко позади',
      planned: new Date(CHE - 2 * 3600 * 1000),
      invited: new Date(CHE - 2 * 3600 * 1000)
    });
    // await kopa7.setPlace(unitTestZemla1);
    await kopa7.setOwner(kopnik2);

    kopa8 = await models.Kopa.create({
      question: 'открыл шестой копник на четверной земле',
      invited: new Date(CHE - 2 * 3600 * 1000),
      // place_id: 4,
      owner_id: 6
    });
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

  await models.Slovo.create({
    place_id: kopa8.id,
    owner_id: kopnik6.id,
    value: 'permission denied',
  })

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


  predlozhenie4 = await models.Predlozhenie.create({
    place_id: kopa8.id,
    owner_id: kopnik6.id,
    value: 'permission denied',
  });
}

async function initGolos() {
  // await kopnik2.vote(predlozhenie,1);
  // await kopnik4.vote(predlozhenie2, 1);
  // await kopnik5.vote(predlozhenie2, 1);
  // await kopnik6.vote(predlozhenie4, 1);
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
    CREATE OR REPLACE FUNCTION public.get_voisko_size(kopnik_id bigint)
      RETURNS BIGINT AS
    $BODY$
    
      SELECT count(*)-1
      FROM 
        "KopnikTree" kt
      WHERE 
        kt.starshii_id = kopnik_id
    
    $BODY$
      LANGUAGE sql VOLATILE
      COST 100;
    ALTER FUNCTION public.get_voisko_size(bigint)
      OWNER TO postgres;
  `)

  await models.sequelize.query(`
    CREATE OR REPLACE FUNCTION public.get_obshina_size(zemla_id bigint)
      RETURNS BIGINT AS
    $BODY$
    
    select count(*)
    from 
      "Kopnik" k 
      join "ZemlaTree" zt on zt.menshe_id=k.dom_id
    where 
      zt.bolshe_id= zemla_id
      and k.deleted_at is null
    
    $BODY$
      LANGUAGE sql VOLATILE
      COST 100;
    ALTER FUNCTION public.get_obshina_size(bigint)
      OWNER TO postgres;
  `)

  await models.sequelize.query(`
    CREATE OR REPLACE FUNCTION public.get_zemli(zemla_id bigint)
      RETURNS setof "Zemla" AS
    $BODY$
    
    select z.*
    from 
      "Zemla" z 
      join "ZemlaTree" zt on zt.bolshe_id=z.id
    where 
      zt.menshe_id=zemla_id
    order by
      deep desc
    
    $BODY$
      LANGUAGE sql VOLATILE
      COST 100;
    ALTER FUNCTION public.get_zemli(bigint)
      OWNER TO postgres;
      
    CREATE OR REPLACE FUNCTION public.get_bolshii(zemla_id bigint)
      RETURNS setof "Zemla" AS
    $BODY$
    
    select *
    from 
      get_zemli(zemla_id)
    where 
      id<>zemla_id
    
    $BODY$
      LANGUAGE sql VOLATILE
      COST 100;
    ALTER FUNCTION public.get_bolshii(bigint)
      OWNER TO postgres;
`)

  await models.sequelize.query(`
        CREATE OR REPLACE FUNCTION public.get_zemla_full_name(
            zemla_id bigint,
            start_level integer,
            end_level integer)
          RETURNS text AS
        $BODY$
                    select 
                    string_agg(name, ', ') as result
                    from (
                        select * 
                        from
                        "Zemla" z 
                        join "ZemlaTree" zt on zt.bolshe_id = z.id
                        where 
                        zt.menshe_id=zemla_id
                        and z.level between start_level and end_level
                        order by 
                        level
                    ) zemli
                $BODY$
          LANGUAGE sql VOLATILE
          COST 100;
        ALTER FUNCTION public.get_zemla_full_name(bigint, integer, integer)
          OWNER TO postgres;
          
        CREATE OR REPLACE FUNCTION public.get_zemla_full_name_reverse(
            zemla_id bigint,
            start_level integer,
            end_level integer)
          RETURNS text AS
        $BODY$
                    select 
                    string_agg(name, ', ') as result
                    from (
                        select * 
                        from
                        "Zemla" z 
                        join "ZemlaTree" zt on zt.bolshe_id = z.id
                        where 
                        zt.menshe_id=zemla_id
                        and z.level between start_level and end_level
                        order by 
                        level desc
                    ) zemli
                $BODY$
          LANGUAGE sql VOLATILE
          COST 100;
        ALTER FUNCTION public.get_zemla_full_name_reverse(bigint, integer, integer)
          OWNER TO postgres;          
`)

  await models.sequelize.query(`
        CREATE OR REPLACE FUNCTION public.get_starshii(kopnik_id bigint)
          RETURNS setof "Kopnik" AS
        $BODY$
        
        select k.*
        from 
          "Kopnik" k 
          join "KopnikTree" kt on kt.starshii_id=k.id
        where 
          kt.mladshii_id=kopnik_id
          and kt.starshii_id<>kopnik_id
        order by
          deep desc
        $BODY$
          LANGUAGE sql VOLATILE
          COST 100;
        ALTER FUNCTION public.get_starshii(bigint)
          OWNER TO postgres;
`)
}

/**
 * запас под будущие тесты
 *
 * @return {Promise.<void>}
 */
async function setSequenceVals() {
  /**
   * Zemla_id_seq уже установлена в initZemla()
   */
  await models.sequelize.query(`select setval('"File_id_seq"',1000)`)
  await models.sequelize.query(`select setval('"Golos_id_seq"',1000)`)
  await models.sequelize.query(`select setval('"Kopa_id_seq"',1000);`)
  await models.sequelize.query(`select setval('"Kopnik_id_seq"',1000);`)
  await models.sequelize.query(`select setval('"KopnikKopa_id_seq"',1000);`)
  await models.sequelize.query(`select setval('"KopnikTree_id_seq"',1000);`)
  await models.sequelize.query(`select setval('"Predlozhenie_id_seq"',1000);`)
  await models.sequelize.query(`select setval('"PushSubscription_id_seq"',1000);`)
  await models.sequelize.query(`select setval('"Registration_id_seq"',1000);`)
  await models.sequelize.query(`select setval('"Slovo_id_seq"',1000);`)
  await models.sequelize.query(`select setval('"Zemla_id_seq"',1000);`)
  await models.sequelize.query(`select setval('"ZemlaTree_id_seq"',1000);`)
}

async function init() {
  await initSchema()
  await initStored()
  await initZemli()
  await initKopnikFromRegistration()
  // await setupUnitTest2Password()
  await initKopa()
  await  initSlovo()
  await  initPredlozhenie()
  await  initGolos()
  await initFile()
  await setSequenceVals()

  await initRussia()
  await initAlexeyBaranov()
}


module.exports.initSchema = initSchema;
module.exports.initZemli = initZemli;
module.exports.initKopnikFromRegistration = initKopnikFromRegistration
module.exports.init = init;

init()
  .then(()=>{
    console.log("all done")
  })
  .catch(function (err) {
    console.error(err, err.stack);
  })
