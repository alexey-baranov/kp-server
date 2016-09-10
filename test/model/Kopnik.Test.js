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
    KOPNIK3 = 3;

describe('Kopnik', function () {
    before(function(){
        Cleaner.clean("Kopnik");
    });

    let someKopnik;

    describe('#create()', function () {

        it('should setup path and up voisko starshini', async function (done) {
            try {
                kopnik2 = await models.Kopnik.findById(KOPNIK2);

                someKopnik = await models.Kopnik.create({
                    name: "temp",
                    surname: "temp",
                    patronymic: "temp",
                    birth: 1900,
                    rodina_id: kopnik2.rodina_id,
                    starshina_id: kopnik2.id
                });
                assert.equal(someKopnik.path, "/2/");

                await kopnik2.reload();
                assert.equal(kopnik2.voiskoSize, 2, "kopnik2.voiskoSize, 2");
                done();
            }
            catch (err) {
                done(err);
            }
        });

         it('voisko size should bo 0', async function (done) {
             assert.equal(0, someKopnik.voiskoSize);
         });
    });

    describe("#setStarshina2()", function(){
        /*
         * перекидываю со второго на четвертого копника
         */
        it('should setupPath after change voiska starshin', async function (done) {
            try {
                kopnik4 = await models.Kopnik.findById(KOPNIK4);

                await someKopnik.setStarshina2(kopnik4);

                await someKopnik.reload();
                await kopnik2.reload();
                await kopnik4.reload();

                assert.equal(someKopnik.voiskoSize, 1, "someKopnik.voiskoSize, 1");
                assert.equal(kopnik2.voiskoSize, 1, "kopnik2.voiskoSize, 1");
                assert.equal(kopnik4.voiskoSize, 2, "kopnik4.voiskoSize, 2");

                assert.equal(someKopnik.path, "/4/", 'someKopnik.path, "/4/"');
                done();
            }
            catch (err) {
                done(err);
            }
        });

        it('should setup druzhe path after change starshina', async function (done) {
            try {
                let druzhe= await models.Kopnik.create({
                    name: "temp",
                    surname: "temp",
                    patronymic: "temp",
                    birth: 1900,
                    rodina_id: kopnik.rodina_id,
                    starshina_id: kopnik.id
                });

                await kopnik.setStarshina2(kopnik2);

                await druzhe.reload();

                assert.equal(druzhe.path, `/2/${kopnik.id}/`);
                done();
            }
            catch (err) {
                done(err);
            }
        });

        it('should return Voisko', async function (done) {
            try {
                let voisko= await kopnik2.getVoisko();

                assert.equal(voisko.length, 3);
                done();
            }
            catch (err) {
                done(err);
            }
        });
    });
});