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
  let result = sequelize.define('PushSubscription', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    value: {
      type: DataTypes.JSON,
    }
  }, {
    indexes: [
      // {
      //   unique: false,
      //   fields: ['authid']
      // }
    ]
  })

  result.associate = function (db) {
    db.PushSubscription.belongsTo(db.Kopnik, {
      as: "owner",
    })
     db.PushSubscription.belongsTo(db.Session, {
     // as: "owner",
     })
  }

  result.maxCountPerKopnik = 5

  return result
};
