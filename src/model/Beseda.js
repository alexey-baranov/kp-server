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
    let Kopa= sequelize.define('Kopa', {
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
    })

    Kopa.associate= function(db){
        db.Kopa.belongsTo(db.Zemla, {
            as: "place",
            foreignKey: "place_id"
        });

        db.Kopa.belongsTo(db.Kopnik, {
            as: "owner",
            foreignKey: "owner_id"
        })

        db.Kopa.hasMany(db.Predlozhenie, {
            as: "result",
            foreignKey: "place_id"
        })

        db.Kopa.hasMany(db.Slovo, {
            as: "dialog",
            foreignKey: "place_id"
        })

        db.Kopa.hasMany(db.File, {
            as: "attachments",
            foreignKey: "kopa_id"
        })
    }

    return Kopa
};
