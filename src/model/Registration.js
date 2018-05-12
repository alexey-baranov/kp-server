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
  let Registration = sequelize.define('Registration', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING
      },
      prozvishe: {
        type: DataTypes.STRING
      },
      surname: {
        type: DataTypes.STRING
      },
      patronymic: {
        type: DataTypes.STRING
      },
      birth: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isOlder(value) {
            if (new Date().getFullYear() - value < 30) {
              throw new Error("Возраст копного мужа должен быть от 30 лет и больше");
            }
          },
        }
      },
      passport: {
        type: DataTypes.STRING,
        allowNull: false
      },
      note: {
        type: DataTypes.TEXT
      },
      password: {
        type: DataTypes.STRING
      },
      email: {
        type: DataTypes.TEXT
      },
      skype: {
        type: DataTypes.TEXT
      },
      viber: {
        type: DataTypes.TEXT
      },
      whatsapp: {
        type: DataTypes.TEXT
      },
      telegram: {
        type: DataTypes.TEXT
      },
      state: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      indexes: [],
      hooks: {
        beforeCreate: async function (sender, options) {
        },
        beforeUpdate: function (sender, options) {
        },
        afterCreate: async function (sender, options) {
          //notify me
        }
      },
      getterMethods: {
        fullName: function () {
          return `${this.surname} ${this.name} ${this.patronymic}`;
        },
      },
      validate: {
        totalValidation: function () {
          if (!this.name || !this.surname) {
            throw new Error('Не указано имя')
          }
        }
      },
    })


  Registration.prototype.getClosestVerifier = async function () {
    let models = require("../model")

    let dom = await this.getDom()
    let resultAsArray = await sequelize.query(`
            select 
              ver.*
            from 
              "ZemlaTree" zt 
              join "Zemla" z on z.id= zt.bolshe_id 
              join "Kopnik" ver on ver.id=z.verifier_id
            where
              zt.menshe_id=:DOM
            order by 
              zt.deep
            limit 1
            `,
      {
        replacements: {
          "DOM": dom.id
        }
      })

    if (!resultAsArray.length) {
      throw new Error("Невозмоно найти заверителя для вашего дома")
    }
    let result = await models.Kopnik.findById(resultAsArray[0].id)
    return result
  }

  Registration.prototype.setupVerifier = async function () {
    let verifier = await this.getClosestVerifier()

/*
    this.verifier_id = verifier.id
    await sequelize.query(`
            update "Registration"
            set
              verifier_id= :VERIFIER
            where
              id= :THIS
            `,
      {
        replacements: {
          "VERIFIER": verifier.id,
          "THIS": this.id
        },
        type: sequelize.Sequelize.QueryTypes.UPDATE
      })
*/
    await this.setVerifier(verifier)

    return verifier
  }


  Registration.associate = function (db) {
    db.Registration.belongsTo(db.Zemla, {
      as: "dom",
      foreignKey: "dom_id"
    })

    db.Registration.belongsTo(db.Kopnik, {
      as: "verifier",
    })

    db.Registration.belongsTo(db.Kopnik, {
      as: "result",
    })

    db.Registration.hasMany(db.File, {
      as: "attachments",
      foreignKey: "registration_id"
    })
  }
  return Registration
}
