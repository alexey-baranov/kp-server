/**
 * Created by alexey2baranov on 8/26/16.
 */

var assert = require('chai').assert;
let autobahn = require("autobahn");
let config = require("../../cfg/config.json")[process.env.NODE_ENV || 'development'];
let _ = require("lodash");
let models = require("../../src/model");
let Cleaner= require("../../src/Cleaner");

// let WAMP = require("../../src/WAMPFactory").getWAMP();
let kopnik2,
    kopnik4,
    KOPNIK = 2,
    KOPNIK2 = 2,
    KOPNIK3 = 3,
    KOPNIK4=4,

    KOPA=3,
    ZEMLA2=2;


describe('Kopnik', function () {
    before(function(){
        let result= Cleaner.clean();
        return result;
    });

    let someKopnik1,
        someKopnik2;

    describe('#create()', function () {

        it('should setup path', async function (done) {
            try {
                someKopnik1 = await models.Kopnik.create({
                    name: "temp",
                    surname: "temp",
                    patronymic: "temp",
                    birth: 1900,
                    dom_id: ZEMLA2,
                });
                assert.equal(someKopnik1.path, "/");

                someKopnik2 = await models.Kopnik.create({
                    name: "temp",
                    surname: "temp",
                    patronymic: "temp",
                    birth: 1900,
                    dom_id: ZEMLA2,
                });
                assert.equal(someKopnik2.path, "/");

                done();
            }
            catch (err) {
                done(err);
            }
        });
    });

    describe("#setStarshina2()", function(){
        it('should setup path and up voisko starshini', async function (done) {
            try {
                await someKopnik2.setStarshina2(someKopnik1);

                assert.equal(someKopnik2.path, `/${someKopnik1.id}/`);

                await someKopnik1.reload();
                assert.equal(someKopnik1.voiskoSize, 1, "someKopnik1.voiskoSize, 1");
                done();
            }
            catch (err) {
                done(err);
            }
        });

        /*
         * перекидываю обоих на второго
         */
        it('should setup path for druzhe', async function (done) {
            try {
                kopnik2 = await models.Kopnik.findById(KOPNIK2);

                await someKopnik1.setStarshina2(kopnik2);

                await someKopnik1.reload();
                await someKopnik2.reload();
                await kopnik2.reload();

                assert.equal(kopnik2.voiskoSize, 5, "kopnik2.voiskoSize, 5");
                assert.equal(someKopnik1.path, `/2/`, "someKopnik1.path, `/2/`");
                assert.equal(someKopnik2.path, `/2/${someKopnik1.id}/`, "someKopnik2.path, `/2/${someKopnik1.id}/`");

                done();
            }
            catch (err) {
                done(err);
            }
        });

        /*
         * перекидываю со второго на четвертого копника
         */
        it('should change voisko size down', async function (done) {
            try {
                kopnik4 = await models.Kopnik.findById(KOPNIK4);

                await someKopnik1.setStarshina2(kopnik4);

                await someKopnik1.reload();
                await someKopnik2.reload();
                await kopnik2.reload();

                assert.equal(kopnik2.voiskoSize, 3, "kopnik2.voiskoSize, 3");
                assert.equal(someKopnik1.path, '/4/', "someKopnik1.path, '/4/'");
                assert.equal(someKopnik2.path, `/4/${someKopnik1.id}/`, "someKopnik2.path, `/4/${someKopnik1.id}/`");

                done();
            }
            catch (err) {
                done(err);
            }
        });

        it('should setup druzhe path after change starshina', async function (done) {
            try {
                await someKopnik2.reload();
                assert.equal(someKopnik2.path, `/4/${someKopnik1.id}/`);
                done();
            }
            catch (err) {
                done(err);
            }
        });
    });


    describe("voting", function(){
        let somePredlozhenie;

        it('should vote(+1)', async function () {
            somePredlozhenie = await models.Predlozhenie.create({
                place_id: KOPA,
                value: "temp " + new Date(),
                author_id: KOPNIK,
            });

            let result= await kopnik2.vote(somePredlozhenie, 1);

            let golosa = await somePredlozhenie.getGolosa();

            assert.equal(golosa.length, 3, "golosa.length, 3");

            golosa.sort((a,b)=>a.id-b.id);
            assert.equal(golosa[1].value, golosa[0].value, "golosa[1].value, golosa[0].value");
            assert.equal(golosa[1].parent_id, golosa[0].id, "golosa[1].parent_id, golos.id");
            assert.equal(somePredlozhenie.totalZa, 3, "predlozhenie.totalZa==2");
            assert.equal(somePredlozhenie.totalProtiv, 0, "predlozhenie.totalProtiv==0");

            // assert.equal(result.golos instanceof models.Golos, true, "result.golos instanceof models.Golos");
            assert.equal(result.action, "add", "result.action, add");
        });

        it('should revote(-1)', async function () {
            let result= await kopnik2.vote(somePredlozhenie, -1);

            let golosa = await somePredlozhenie.getGolosa();

            assert.equal(golosa.length, 3, "golosa.length, 3");

            assert.equal(somePredlozhenie.totalZa, 0, "predlozhenie.totalZa==0");
            assert.equal(somePredlozhenie.totalProtiv, 3, "predlozhenie.totalProtiv==3");

            // assert.equal(result.golos instanceof models.Golos, true, "result.golos instanceof models.Golos");
            assert.equal(result.action, "update", "result.action, update");
        });

        it('should unvote(0)', async function () {
            let result= await kopnik2.vote(somePredlozhenie, 0);

            let golosa = await somePredlozhenie.getGolosa();

            assert.equal(golosa.length, 0, "golosa.length, 0");
            assert.equal(somePredlozhenie.totalZa, 0, "predlozhenie.totalZa==2");
            assert.equal(somePredlozhenie.totalProtiv, 0, "predlozhenie.totalProtiv==0");


            // assert.equal(result.golos instanceof models.Golos, true, "result.golos instanceof models.Golos");
            assert.equal(result.action, "remove", "result.action, remove");
        });


    });

    describe("getStarshini()", function(done){
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
});
