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
    return sequelize.define('File', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        path: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        note: {
            type: DataTypes.TEXT
        }
    });
};