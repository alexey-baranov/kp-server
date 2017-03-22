/**
 * Created by alexey2baranov on 8/26/16.
 */

var assert = require('chai').assert;
let expect= require("chai").expect
let autobahn = require("autobahn");
let config = require("../../cfg")
let _ = require("lodash");
let models = require("../../src/model");
let Cleaner = require("../../src/Cleaner");

let WAMP = require("../../src/WAMPFactory").getWAMP();

let kopnik2,
  kopnik4,
  KOPNIK = 2,
  KOPNIK2 = 2,
  KOPNIK3 = 3,
  KOPNIK4 = 4,

  KOPA = 3,
  ZEMLA2 = 2;


describe('Kopnik', function () {
  before(async function () {
    await new Promise((res, rej) => {
      WAMP.onopen = function () {
        res()
      }
      WAMP.open()
    })
    await Cleaner.clean()
  })

  after(async function () {
    await new Promise((res, rej) => {
      WAMP.onclose = function () {
        res()
      }
      WAMP.close()
    })
  })

  let someKopnik1,
    someKopnik2;

  describe("#getStarshinaVDome()", function () {
    it('should return null', async() => {
      let kopnik2= await models.Kopnik.findById(2)
      let starshinaVDome= await kopnik2.getStarshinaVDome(await models.Zemla.findById(2))

      assert.equal(starshinaVDome, null)
    })
    it('should return most starshina', async() => {
      let kopnik7= await models.Kopnik.findById(7)
      let starshinaVDome= await kopnik7.getStarshinaVDome(await models.Zemla.findById(1))

      assert.equal(starshinaVDome.id, 2, "starshinaVDome.id, 2")
    })
    it('should throw error', (done) => {
      let zemla2
      models.Zemla.findById(2)
        .then(localZemla2=>{
          zemla2= localZemla2
          return models.Kopnik.findById(6)
        })
        .then ((kopnik6)=>{
          return kopnik6.getStarshinaVDome(zemla2)
        })
        .then((starshinaVDome)=>{
          done(new Error(starshinaVDome))
        },
          ()=>done())
    })
  })

  describe("#getStarshinaNaKope()", function () {
    it('should return null', async() => {
      let kopnik2= await models.Kopnik.findById(2)
      let starshinaNaKope= await kopnik2.getStarshinaNaKope(await models.Kopa.findById(3))

      assert.equal(starshinaNaKope, null)
    })
    it('should return most starshina', async() => {
      let kopnik7= await models.Kopnik.findById(7)
      let starshinaNaKope= await kopnik7.getStarshinaNaKope(await models.Kopa.findById(3))

      assert.equal(starshinaNaKope.id, 2, "starshinaNaKope.id, 2")
    })
    it('should throw error', (done) => {
      (async ()=>{
        let kopa3= await models.Kopa.findById(3)
        let kopnik6 = await models.Kopnik.findById(6)
        try {
          kopnik6.getStarshinaNaKope(kopa3)
          done(new Error(starshinaNaKope))
        }
        catch(err){
          done()
        }
      })()
    })
  })

  describe("#isDom()", function () {
    it("sould return false for foreign zemla", async () => {
      kopnik2 = await models.Kopnik.findById(2)
      let isDom = await kopnik2.isDom(await models.Zemla.findById(4))

      assert.equal(isDom, false, "isDom, fasle")
    })

    it("sould return true for dom", async () => {
      let isDom = await kopnik2.isDom(await models.Zemla.findById(2))
      assert.equal(isDom, true, "isDom, true")
      isDom = await kopnik2.isDom(await models.Zemla.findById(1))
      assert.equal(isDom, true, "isDom 1, true")
    })
  })

  describe("#getSilaNaZemle()", function () {
    it("sould return 0 for foreign zemla", async () => {
      kopnik2 = await models.Kopnik.findById(2)
      let sila = await kopnik2.getSilaNaZemle(await models.Zemla.findById(4))

      assert.equal(sila, 0, "sila, 0")
    })

    it("sould return 3/5 for dom", async () => {
      let sila = await kopnik2.getSilaNaZemle(await models.Zemla.findById(2))

      assert.equal(sila, 3/5, "sila, 3/5")
    })
  })

  describe("#getSilaNaKope()", function () {
    it("sould return 3/5", async () => {
      kopnik2 = await models.Kopnik.findById(2)
      let sila = await kopnik2.getSilaNaKope(await models.Kopa.findById(3))
      assert.equal(sila, 3/5, "sila, 3/5")
    })
  })

  describe('#create()', function () {
    it('should setup path', async function () {
        someKopnik1 = await models.Kopnik.create({
          name: "temp",
          surname: "temp",
          patronymic: "temp",
          birth: 1900,
          passport: "1234",
          dom_id: ZEMLA2,
        })
        assert.equal(someKopnik1.path, "/")

        someKopnik2 = await models.Kopnik.create({
          name: "temp",
          surname: "temp",
          patronymic: "temp",
          birth: 1900,
          passport: "1234",
          dom_id: ZEMLA2,
        })
        assert.equal(someKopnik2.path, "/")
    })
  })

  describe("#setStarshina2()", function () {
    it('should setup path and up voisko starshini', async function () {
        await someKopnik2.setStarshina2(someKopnik1);

        assert.equal(someKopnik2.path, `/${someKopnik1.id}/`);

        await someKopnik1.reload();
        assert.equal(someKopnik1.voiskoSize, 1, "someKopnik1.voiskoSize, 1");
    })

    /*
     * перекидываю обоих на второго
     */
    it('should setup path for druzhe', async function () {
        kopnik2 = await models.Kopnik.findById(KOPNIK2);

        await someKopnik1.setStarshina2(kopnik2);

        await someKopnik1.reload();
        await someKopnik2.reload();
        await kopnik2.reload();

        assert.equal(kopnik2.voiskoSize, 5, "kopnik2.voiskoSize, 5");
        assert.equal(someKopnik1.path, `/2/`, "someKopnik1.path, `/2/`");
        assert.equal(someKopnik2.path, `/2/${someKopnik1.id}/`, "someKopnik2.path, `/2/${someKopnik1.id}/`");
    })

    /*
     * перекидываю со второго на четвертого копника
     */
    it('should change voisko size down', async function () {
        kopnik4 = await models.Kopnik.findById(KOPNIK4);

        await someKopnik1.setStarshina2(kopnik4);

        await someKopnik1.reload();
        await someKopnik2.reload();
        await kopnik2.reload();

        assert.equal(kopnik2.voiskoSize, 3, "kopnik2.voiskoSize, 3");
        assert.equal(someKopnik1.path, '/4/', "someKopnik1.path, '/4/'");
        assert.equal(someKopnik2.path, `/4/${someKopnik1.id}/`, "someKopnik2.path, `/4/${someKopnik1.id}/`");
    })

    it('should setup druzhe path after change starshina', async function () {
        await someKopnik2.reload();
        assert.equal(someKopnik2.path, `/4/${someKopnik1.id}/`);
    })
  })

  describe("voting", function () {
    let somePredlozhenie;

    it('should vote(+1)', async function () {
      somePredlozhenie = await models.Predlozhenie.create({
        place_id: KOPA,
        value: "temp " + new Date(),
        owner_id: KOPNIK,
      });

      let result = await kopnik2.vote(somePredlozhenie, 1);

      let golosa = await somePredlozhenie.getGolosa();

      assert.equal(golosa.length, 3, "golosa.length, 3");

      golosa.sort((a, b) => a.id - b.id);
      assert.equal(golosa[1].value, golosa[0].value, "golosa[1].value, golosa[0].value");
      assert.equal(golosa[1].parent_id, golosa[0].id, "golosa[1].parent_id, golos.id");
      assert.equal(somePredlozhenie.totalZa, 3, "predlozhenie.totalZa==2");
      assert.equal(somePredlozhenie.totalProtiv, 0, "predlozhenie.totalProtiv==0");

      // assert.equal(result.golos instanceof models.Golos, true, "result.golos instanceof models.Golos");
      assert.equal(result.action, "add", "result.action, add");
    });

    it('should revote(-1)', async function () {
      let result = await kopnik2.vote(somePredlozhenie, -1);

      let golosa = await somePredlozhenie.getGolosa();

      assert.equal(golosa.length, 3, "golosa.length, 3");

      assert.equal(somePredlozhenie.totalZa, 0, "predlozhenie.totalZa==0");
      assert.equal(somePredlozhenie.totalProtiv, 3, "predlozhenie.totalProtiv==3");

      // assert.equal(result.golos instanceof models.Golos, true, "result.golos instanceof models.Golos");
      assert.equal(result.action, "update", "result.action, update");
    });

    it('should unvote(0)', async function () {
      let result = await kopnik2.vote(somePredlozhenie, 0);

      let golosa = await somePredlozhenie.getGolosa();

      assert.equal(golosa.length, 0, "golosa.length, 0");
      assert.equal(somePredlozhenie.totalZa, 0, "predlozhenie.totalZa==2");
      assert.equal(somePredlozhenie.totalProtiv, 0, "predlozhenie.totalProtiv==0");


      // assert.equal(result.golos instanceof models.Golos, true, "result.golos instanceof models.Golos");
      assert.equal(result.action, "remove", "result.action, remove");
    });


  });

  describe("getStarshini()", function () {
    /*        it('should return starshini from closer', async function (done) {
     try {
     let starshini= await someKopnik2.getStarshini();
     assert.equal(starshini.length, 2, "");
     assert.equal(starshini[0], someKopnik1, "starshini[0], someKopnik1");
     assert.equal(starshini[1], kopnik4, "starshini[1], kopnik4");
     done();
     }
     catch (err) {
     done(err);
     }
     });*/
  });
})
