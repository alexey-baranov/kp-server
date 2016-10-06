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
    return sequelize.define('Kopa', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        question: {
            type: DataTypes.TEXT
        },
        /** реально началась */
        invited: {
            type: DataTypes.DATE
        },
        note:{
            type: DataTypes.TEXT
        }
    });
};