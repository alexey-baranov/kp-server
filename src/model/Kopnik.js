/**
 * Created by alexey2baranov on 8/8/16.
 */
/**
 *
 * @param {Sequelize} sequelize
 * @param {Object} DataTypes
 * @returns {Model}
 */
module.exports = function(sequelize, DataTypes) {
    return sequelize.define('Kopnik', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        email: {
            type: DataTypes.STRING
        },
        password:{
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
                isOlder: function(value){
                    if (new Date().getFullYear()-value < 30){
                        throw new Error("Возраст копного мужа должен быть от 30 лет и больше");
                    }
                }
            }
        },
        note:{
            type: DataTypes.TEXT
        }
    }, {
        underscored: true,
        getterMethods:{
            fullName:function(){return `${this.name} ${this.surname}`;}
        },
        validate: {
            totalValidation: function() {
                if (!this.name || !this.surname) {
                    throw new Error('Не указано имя')
                }
            }
        }
    });
};