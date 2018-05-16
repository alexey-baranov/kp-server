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
  let result = sequelize.define('Session', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      token: {
        type: DataTypes.STRING,
      },
      visited: {
        type: DataTypes.DATE,
      },
      ip: {
        type: DataTypes.STRING,
      },
      userAgent:{
        type: DataTypes.STRING,
      }
    },
    {
      indexes: [{
          unique: true,
          fields: ['token']
        }]
    }
  )

  result.associate = function (db) {
    db.Session.belongsTo(db.Kopnik, {
      as: "owner",
    })

    db.Session.belongsTo(db.PushSubscription, {
      // as: "pushSubscription",
    })
  }

  return result
}
