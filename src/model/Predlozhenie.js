/**
 * Created by alexey2baranov on 8/8/16.
 */
/**
 *
 * @param {Sequelize} sequelize
 * @param {Object} DataTypes
 * @returns {Model}
 */
module.exports = function (sequelize, DataTypes) {
  let result = sequelize.define('Predlozhenie', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      totalZa: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      totalProtiv: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      state: {
        type: DataTypes.INTEGER,
      },
      note: {
        type: DataTypes.TEXT
      }
    },
    {
      instanceMethods: {
        /**
         * пересчитывает тоталЗа, тоталПротв и стейт и сохраняет в БД
         * @return {Promise.<void>}
         */
        async rebalance(){
          const models = require("./index")
          let golosa = await this.getGolosa(),
            za = golosa.filter(eachGolos => eachGolos.value),
            protiv = golosa.filter(eachGolos => !eachGolos.value),
            kopa = await this.getPlace(),
            zemla = await kopa.getPlace()

          if (za.length) {
            let zaCountAsArray = await sequelize.query(`
            select count(*) as count
            from
              "Kopnik" k
              join "Kopnik" v on v.path like k.path||k.id||'%'
              join "Zemla" vd on vd.id= v.dom_id and (vd.path like :ZEMLA_FULL_PATH||'%' or vd.id=:ZEMLA)
            where
              k.id in (:ZA)`,
              {
                replacements: {
                  "ZEMLA_FULL_PATH": zemla.fullPath,
                  "ZEMLA": zemla.id,
                  "ZA": za.map(each => each.owner_id)
                },
                type: sequelize.Sequelize.QueryTypes.SELECT
              })
            this.totalZa = +zaCountAsArray[0].count + za.length
          }
          else {
            this.totalZa = 0
          }

          if (protiv.length) {
            protivCountAsArray = await sequelize.query(`
            select count(*) as count
            from
              "Kopnik" k
              join "Kopnik" v on v.path like k.path||k.id||'%'
              join "Zemla" vd on vd.id= v.dom_id and (vd.path like :ZEMLA_FULL_PATH||'%' or vd.id=:ZEMLA)
            where
              k.id in (:PROTIV)`,
              {
                replacements: {
                  "ZEMLA_FULL_PATH": zemla.fullPath,
                  "ZEMLA": zemla.id,
                  "PROTIV": protiv.map(each => each.owner_id)
                },
                type: sequelize.Sequelize.QueryTypes.SELECT
              })
            this.totalProtiv = +protivCountAsArray[0].count + protiv.length
          }
          else {
            this.totalProtiv = 0
          }

          if (this.totalZa / zemla.obshinaSize >= 7 / 8) {
            this.state = 1
          }
          else if (this.totalProtiv / zemla.obshinaSize >= 7 / 8) {
            this.state = -1
          }
          else {
            this.state = null
          }

          await this.save(["totalZa", "totalProtiv", "state"])
        },


      }
    })

  result.associate = function (db) {
    db.Predlozhenie.belongsTo(db.Kopa, {
      as: "place",
      foreignKey: "place_id"
    });
    db.Predlozhenie.belongsTo(db.Kopnik, {
      as: "owner",
      foreignKey: "owner_id"
    });

    db.Predlozhenie.hasMany(db.Golos, {
      as: "golosa",
      foreignKey: "subject_id"
    });

    db.Predlozhenie.hasMany(db.File, {
      as: "attachments",
      foreignKey: "predlozhenie_id"
    });
  }

  return result
};
