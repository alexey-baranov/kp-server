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
    var Company  = sequelize.define('Company', {
        uuid: {
            type: DataTypes.UUID,
            primaryKey: true
        }
    });

    return Company;
};