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
        /** заявителем была предложена () */
        birth: {
            type: DataTypes.DATE,
            allowNull: false
        },
        /** запланирована на */
        planned: {
            type: DataTypes.DATE,
            allowNull: false
        },
        /** реально началась */
        started: {
            type: DataTypes.DATE
        },
        /** закрыта */
        closed: {
            type: DataTypes.DATE
        },
        isOpen: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        note:{
            type: DataTypes.TEXT
        }
    });
};