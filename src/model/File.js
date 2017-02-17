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
  let File = sequelize.define('File', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    /**
     * Относительный путь
     * относительно корневой папки проекта
     */
    path: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    note: {
      type: DataTypes.TEXT
    },
    mimeType: {
      type: DataTypes.STRING
    },
    size: {
      type: DataTypes.BIGINT
    }
  }, {
    indexes: [
      {
        fields: ['path']
      },
    ],
    instanceMethods: {}
  })

  File.associate = function (db) {
    db.File.belongsTo(db.Kopnik, {
      as: "owner",
    })
    db.File.belongsTo(db.Zemla, {
    })
    db.File.belongsTo(db.Kopnik, {
    })
    db.File.belongsTo(db.Kopa, {
    })
    db.File.belongsTo(db.Predlozhenie, {
    })
    db.File.belongsTo(db.Slovo, {
    })
  }

  return File
};
