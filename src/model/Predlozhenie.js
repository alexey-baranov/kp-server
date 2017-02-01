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
    let result= sequelize.define('Predlozhenie', {
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
        })

    result.associate= function(db){
        db.Predlozhenie.belongsTo(db.Kopa, {
            as: "place",
            foreignKey: "place_id"
        });
        db.Predlozhenie.belongsTo(db.Kopnik, {
            as: "author",
            foreignKey: "author_id"
        });

        db.Predlozhenie.hasMany(db.Golos, {
            as: "golosa",
            foreignKey: "subject_id"
        });

        db.Predlozhenie.hasMany(db.File, {
            as: "attachments",
            foreignKey: "predlozhenie_id"
        });
    }

    return result
};