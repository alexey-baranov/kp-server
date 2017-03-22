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
    },
    authid: {
      type: DataTypes.STRING,
    },
    authmethod: {
      type: DataTypes.STRING,
    },
    authprovider: {
      type: DataTypes.STRING,
    },
    authrole: {
      type: DataTypes.STRING,
    },
    transport: {
      type: DataTypes.JSON,
    },

    note: {
      type: DataTypes.TEXT
    }
  }, {
    indexes: [
      {
        unique: false,
        fields: ['authid']
      }
    ]
  })

  result.associate = function (db) {
    db.Session.belongsTo(db.Kopnik, {
      as: "owner",
    });
  }

  return result
};
