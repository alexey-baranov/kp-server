/**
 * Created by alexey2baranov on 9/9/16.
 */
let models= require("./model");
let _= require("lodash");


class Cleaner{
    static async clean(what) {
        if (_.isString(what)){
            what= [what];
        }

        if (what.length == 0 || what.indexOf("Slovo") != -1) {
            await models.sequelize.query(`
                delete from "Slovo"
                where
                    place_id<5
                    and (
                        value like 'temp%'
                    )
                 `,
                {type: models.Sequelize.QueryTypes.DELETE});
        }

        if (what.length == 0 || what.indexOf("Predlozhenie") != -1) {
            await models.sequelize.query(`
                delete from "Predlozhenie"
                where
                    place_id<5
                    and (
                        value like 'temp%'
                    )
                 `,
                {type: models.Sequelize.QueryTypes.DELETE});
        }

        if (what.length == 0 || what.indexOf("Golos") != -1) {
            await models.sequelize.query(`
                delete from "Slovo"
                where
                    (
                        note like 'temp%'
                    )
                 `,
                {type: models.Sequelize.QueryTypes.DELETE});
        }

        if (what.length == 0 || what.indexOf("Zemla") != -1) {
            await models.sequelize.query(`
                delete from "Zemla"
                where
                    name like 'temp%'
                 `,
                {type: models.Sequelize.QueryTypes.DELETE});

            await models.sequelize.query(`
                update "Zemla"
                set 
                    "obshinaSize"= case id when 2 then 5 when 4 then 1 ELSE 0 END
                where
                    id in (2,3,4)`,
                {
                    type: models.sequelize.Sequelize.QueryTypes.UPDATE
                });
        }

        if (what.length == 0 || what.indexOf("Kopnik") != -1) {
            await models.sequelize.query(`
                delete from "Kopnik"
                where
                    name like 'temp%'
                 `,
                {type: models.Sequelize.QueryTypes.DELETE});

            await models.sequelize.query(`
                update "Kopnik"
                set 
                    "voiskoSize"= case id when 2 then 3 when 3 then 1 ELSE 0 END
                where
                    id>1 
                    and id<=5`,
                {
                    type: models.sequelize.Sequelize.QueryTypes.UPDATE
                });
        }

    }
}

module.exports= Cleaner;