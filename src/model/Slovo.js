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
    let result= sequelize.define('Slovo', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        note: {
            type: DataTypes.TEXT
        }
    })

    result.associate= function(db){
        db.Slovo.belongsTo(db.Kopa, {
            as: "place",
            foreignKey: "place_id"
        });

        db.Slovo.belongsTo(db.Kopnik, {
            as: "owner"
        });

        db.Slovo.hasMany(db.File, {
            as: "attachments",
            foreignKey: "slovo_id"
        });
    }

    return result
};