/**
 * Created by alexey2baranov on 8/26/16.
 */
"use strict";

var assert = require('chai').assert;
let autobahn = require("autobahn");
let config = require("../../cfg")
let _ = require("lodash");
let models = require("../../src/model");
let Cleaner = require("../../src/Cleaner");

// let WAMP = require("../../src/WAMPFactory").getWAMP();
let kopnik2,
    kopnik4,
    KOPNIK = 2,
    KOPNIK2 = 2,
    KOPNIK3 = 3,
    KOPNIK4 = 4,

    KOPA = 3;

describe('Predlozhenie', function () {
    before(function () {
        let result = Cleaner.clean();
        return result;
    });

    let someKopnik1,
        someKopnik2;

    describe("fix()", function () {
        let predlozhenie,
            golos;

        before(async function () {
            predlozhenie = await models.Predlozhenie.create({
                place_id: KOPA,
                value: "temp " + new Date(),
                owner_id: KOPNIK,
            });

            golos = await models.Golos.create({
                for_id: predlozhenie.id,
                owner_id: KOPNIK,
                value: 1,
            });
        });

/*        it('should fix()', async function () {
            await predlozhenie.fix();
            let golosa = await predlozhenie.getGolosa();

            assert.equal(predlozhenie.isFixed, true, "predlozhenie.isFixed, true");
            assert.equal(golosa.length, 2, "golosa.length");

            golosa.sort((a,b)=>a.id-b.id);
            assert.equal(golosa[1].value, golosa[0].value, "golosa[1].value, golosa[0].value");
            assert.equal(golosa[1].owner_id, KOPNIK3, "golosa[1].owner_id, KOPNIK3");
            assert.equal(golosa[1].parent_id, golos.id, "golosa[1].parent_id, golos.id");
        });*/
    });
});
