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
    endpoint: {
      type: DataTypes.TEXT,
    },
  }, {
    indexes: [
      // {
      //   unique: false,
      //   fields: ['authid']
      // }
    ]
  })

  result.associate = function (db) {
    db.Session.belongsTo(db.Kopnik, {
      as: "owner",
    });
  }

  result.maxCountPerKopnik= 5

  return result
};
