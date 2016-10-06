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

    KOPA=3;

describe('Kopnik', function () {
    before(function(){
        let result= Cleaner.clean("Kopnik");
        return result;
    });

    let someKopnik1,
        someKopnik2;

    describe('#create()', function () {

        it('should setup path and up voisko starshini', async function (done) {
            try {
                kopnik2 = await models.Kopnik.findById(KOPNIK2);

                someKopnik1 = await models.Kopnik.create({
                    name: "temp",
                    surname: "temp",
                    patronymic: "temp",
                    birth: 1900,
                    dom_id: kopnik2.dom_id,
                    starshina_id: kopnik2.id
                });
                assert.equal(someKopnik1.path, "/2/");
                assert.equal(someKopnik1.voiskoSize, 0, "someKopnik.voiskoSize, 0");

                await kopnik2.reload();
                assert.equal(kopnik2.voiskoSize, 2, "kopnik2.voiskoSize, 2");

                someKopnik2 = await models.Kopnik.create({
                    name: "temp",
                    surname: "temp",
                    patronymic: "temp",
                    birth: 1900,
                    dom_id: kopnik2.dom_id,
                    starshina_id: someKopnik1.id
                });
                assert.equal(someKopnik2.path, `/2/${someKopnik1.id}/`);

                await someKopnik1.reload();
                assert.equal(someKopnik1.voiskoSize, 1, "someKopnik1.voiskoSize, 1");

                await kopnik2.reload();
                assert.equal(kopnik2.voiskoSize, 3, "kopnik2.voiskoSize, 3");
                done();
            }
            catch (err) {
                done(err);
            }
        });

         it('voisko size should bo 0', async function () {
             assert.equal(0, someKopnik2.voiskoSize);
         });
    });

    describe("#setStarshina2()", function(){
        /*
         * перекидываю со второго на четвертого копника
         */
        it('should change voiskoSize', async function (done) {
            try {
                kopnik4 = await models.Kopnik.findById(KOPNIK4);

                await someKopnik1.setStarshina2(kopnik4);

                await someKopnik1.reload();
                await kopnik2.reload();
                await kopnik4.reload();

                assert.equal(kopnik2.voiskoSize, 1, "kopnik2.voiskoSize, 1");
                assert.equal(kopnik4.voiskoSize, 2, "kopnik4.voiskoSize, 2");

                done();
            }
            catch (err) {
                done(err);
            }
        });

        it('should setupPath', function(){
            assert.equal(someKopnik1.path, "/4/", 'someKopnik.path, "/4/"');
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
        let predlozhenie;

        it('should vote(+1)', async function () {
            predlozhenie = await models.Predlozhenie.create({
                place_id: KOPA,
                value: "temp " + new Date(),
                author_id: KOPNIK,
            });

            await kopnik2.vote(predlozhenie, 1);

            let golosa = await predlozhenie.getGolosa();

            assert.equal(golosa.length, 2, "golosa.length, 2");

            golosa.sort((a,b)=>a.id-b.id);
            assert.equal(golosa[1].value, golosa[0].value, "golosa[1].value, golosa[0].value");
            assert.equal(golosa[1].owner_id, KOPNIK3, "golosa[1].owner_id, KOPNIK3");
            assert.equal(golosa[1].parent_id, golosa[0].id, "golosa[1].parent_id, golos.id");
            assert.equal(predlozhenie.totalZa, 2, "predlozhenie.totalZa==2");
            assert.equal(predlozhenie.totalProtiv, 0, "predlozhenie.totalProtiv==0");
        });

        it('should revote(-1)', async function () {
            await kopnik2.vote(predlozhenie, -1);

            let golosa = await predlozhenie.getGolosa();

            assert.equal(golosa.length, 2, "golosa.length, 2");

            assert.equal(predlozhenie.totalZa, 0, "predlozhenie.totalZa==2");
            assert.equal(predlozhenie.totalProtiv, 2, "predlozhenie.totalProtiv==0");
        });

        it('should unvote(0)', async function () {
            await kopnik2.vote(predlozhenie, 0);

            let golosa = await predlozhenie.getGolosa();

            assert.equal(golosa.length, 0, "golosa.length, 0");
            assert.equal(predlozhenie.totalZa, 0, "predlozhenie.totalZa==2");
            assert.equal(predlozhenie.totalProtiv, 0, "predlozhenie.totalProtiv==0");
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