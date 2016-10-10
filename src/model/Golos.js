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
    return sequelize.define('Golos', {
            id: {
                type: DataTypes.BIGINT,
                primaryKey: true,
                autoIncrement: true
            },
            value: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            reason: {
                type: DataTypes.TEXT,
            },
            note: {
                type: DataTypes.TEXT
            }
        },
        {
            hooks: {
                beforeCreate: async function (sender, options) {
                },
                beforeUpdate: function (sender, options) {
                },
                afterCreate: async function (sender, options) {
                }
            },
        });
};