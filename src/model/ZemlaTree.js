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
  let ZemlaTree = sequelize.define('ZemlaTree', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    deep: {
      type: DataTypes.INTEGER
    },
  },
    {
      indexes: [
        //индексы для быстрого поиска строк необходимы индексы на внешние ключи
        {
          unique: false,
          fields: ['bolshe_id'],
        },
        {
          unique: false,
          fields: ['menshe_id'],
        }
      ]})

  ZemlaTree.associate = function (db) {
  }
  return ZemlaTree;
}
