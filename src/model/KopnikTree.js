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
  let KopnikTree = sequelize.define('KopnikTree', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    deep: {
      type: DataTypes.INTEGER
    },
  })

  KopnikTree.associate = function (db) {
  }
  return KopnikTree;
}