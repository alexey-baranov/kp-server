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
    let result= sequelize.define('Golos', {
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
        })

    result.associate= function(db){
        db.Golos.belongsTo(db.Kopnik, {
            as: "owner"
        });
        db.Golos.belongsTo(db.Golos, {
            as: "parent"
        });
        db.Golos.hasMany(db.Golos, {
            as: "children",
            foreignKey: "parent_id"
        });
        db.Golos.belongsTo(db.Predlozhenie, {
            as: "subject",
            foreignKey: "subject_id"
        });

        db.Golos.hasMany(db.File, {
            as: "attachments",
            foreignKey: "golos_id"
        });
    }

    return result
};