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
    return sequelize.define('Predlozhenie', {
            id: {
                type: DataTypes.BIGINT,
                primaryKey: true,
                autoIncrement: true
            },
            value: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            totalZa: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            totalProtiv: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            state: {
                type: DataTypes.INTEGER,
            },
            note: {
                type: DataTypes.TEXT
            }
        },
        {
            instanceMethods: {

            }
        });
};