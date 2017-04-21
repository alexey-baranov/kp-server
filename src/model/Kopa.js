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
  let Kopa = sequelize.define('Kopa', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      question: {
        type: DataTypes.TEXT
      },
      /** реально началась */
      invited: {
        type: DataTypes.DATE
      },
      note: {
        type: DataTypes.TEXT
      }
    },
    {
      instanceMethods: {
        /**
         * пока заглушка - первые 100 копников
         */
        async getGolosovanti(){
          let place = await this.getPlace(),
            result = await place.getGolosovanti()

          return result
        }
      },
      hooks: {
        /**
         * удалить все слова и предложения
         * иначе они маячат внутри setStarshina() когда переголосовка текущих предложений
         * @param sender
         * @param options
         * @return {Promise.<void>}
         */
        async beforeDestroy (sender, options) {
          let childs = (await sender.getDialog()).concat(await sender.getResult())
          await Promise.all(childs.map(eachChild => eachChild.destroy()))
        }
      }
    }
  )

  Kopa.associate = function (db) {
    db.Kopa.belongsTo(db.Zemla, {
      as: "place",
      foreignKey: "place_id"
    });

    db.Kopa.belongsTo(db.Kopnik, {
      as: "owner",
      foreignKey: "owner_id"
    })

    db.Kopa.hasMany(db.Predlozhenie, {
      as: "result",
      foreignKey: "place_id"
    })

    db.Kopa.hasMany(db.Slovo, {
      as: "dialog",
      foreignKey: "place_id"
    })

    db.Kopa.hasMany(db.File, {
      as: "attachments",
      foreignKey: "kopa_id"
    })
  }

  return Kopa
};
