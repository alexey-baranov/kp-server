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
    return sequelize.define('Zemla', {
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
         * Максимальное количество коп за 1 год
         */
        intensity: {
            type: DataTypes.INTEGER,
            allowNull:false,
            defaultValue: 1000
        },
        note: {
            type: DataTypes.TEXT
        }
    });
};