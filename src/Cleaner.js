/**
 * Created by alexey2baranov on 9/9/16.
 */
let models = require("./model")
let _ = require("lodash")


class Cleaner {
  static async clean(what=[]) {
    if (_.isString(what)) {
      what = [what];
    }

    if (what.length == 0 || what.indexOf("Slovo") != -1) {
      await models.sequelize.query(`
                delete from "Slovo"
                where
                  id in (
                    select s2.id 
                    from 
                      "Slovo" s2
                      join "Kopa" k2 on k2.id= s2.place_id
                    where
                      s2.id>1000
                      and k2.owner_id<1000
                  )
                 `,
        {type: models.Sequelize.QueryTypes.DELETE});
    }

    if (what.length == 0 || what.indexOf("Golos") != -1) {
      await models.sequelize.query(`
                delete from "Golos"
                where
                  id in (
                    select g2.id 
                    from 
                      "Golos" g2
                      join "Predlozhenie" p2 on p2.id= g2.subject_id
                      join "Kopa" k2 on k2.id= p2.place_id
                    where
                      g2.id>1000
                      and k2.owner_id<1000
                  )
                 `,
        {type: models.Sequelize.QueryTypes.DELETE});
    }

    if (what.length == 0 || what.indexOf("Predlozhenie") != -1) {
      await models.sequelize.query(`
                delete from "Predlozhenie"
                where
                  id in (
                    select p2.id 
                    from 
                      "Predlozhenie" p2
                      join "Kopa" k2 on k2.id= p2.place_id
                    where
                      p2.id>1000
                      and k2.owner_id<1000
                  )
                 `,
        {type: models.Sequelize.QueryTypes.DELETE});
    }

    if (what.length == 0 || what.indexOf("Registration") != -1) {
      await models.sequelize.query(`
                delete from "Registration"
                where
                  id in (
                    select r2.id 
                    from 
                      "Registration" r2
                      join "Zemla" z2 on z2.id=r2.dom_id
                    where
                      r2.id>1000
                      and z2.id<1000
                  )
`,
        {type: models.Sequelize.QueryTypes.DELETE});
    }

    if (what.length == 0 || what.indexOf("Session") != -1) {
      await models.sequelize.query(`
                delete from "Session"
                where
                  id in (
                    select s2.id 
                    from 
                      "Session" s2
                      join "kopnik" k2 on k2.id= s2.owner_id
                      join "Zemla" z2 on z2.id= k2.dom_id
                    where
                      s2.id>1000
                      and z2.id<1000
                  )
`,
        {type: models.Sequelize.QueryTypes.DELETE});
    }

    if (what.length == 0 || what.indexOf("Kopnik") != -1) {
      await models.sequelize.query(`
                delete from "Kopnik"
                where
                  id in (
                    select k2.id 
                    from 
                      "Kopnik" k2
                      join "Zemla" z2 on z2.id=k2.dom_id
                    where
                      k2.id>1000
                      and z2.id<1000
                  )
                 `,
        {type: models.Sequelize.QueryTypes.DELETE})

      await models.sequelize.query(`
                update "Kopnik" as k
                set 
                    "voiskoSize"= (select value from voisko_size where voisko_size.id=k.id)
                where
                  id < 1000`,
        {
          type: models.sequelize.Sequelize.QueryTypes.UPDATE
        })
    }

    if (what.length == 0 || what.indexOf("Kopa") != -1) {
      await models.sequelize.query(`
                delete from "Kopa" k
                where
                  k.id>1000
                  and k.owner_id<1000
                 `,
        {type: models.Sequelize.QueryTypes.DELETE});
    }


    /**
     */
    if (what.length == 0 || what.indexOf("Zemla") != -1) {
      await models.sequelize.query(`
                delete from "Zemla"
                where
                    id>1001
                    and (
                      parent_id<1000
                      or name like 'temp%'
                    )
                 `,
        {type: models.Sequelize.QueryTypes.DELETE});

      await models.sequelize.query(`
                    select 1
                    `,
        {
          type: models.sequelize.Sequelize.QueryTypes.UPDATE
        })
    }
  }
}

module.exports = Cleaner;
