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
            state: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            email: {
                type: DataTypes.STRING
            },
            password: {
                type: DataTypes.STRING
            },

            name: {
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
            }
        },
        {
            indexes: [
            ],
            instanceMethods: {
            },
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
                    return `${this.name} ${this.surname}`;
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

    Registration.associate= function(db){
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
    return Registration;
}
