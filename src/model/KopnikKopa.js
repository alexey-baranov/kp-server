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
  let KopnikKopa = sequelize.define('KopnikKopa', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
  })

  KopnikKopa.associate = function (db) {
  }
  return KopnikKopa;
}
