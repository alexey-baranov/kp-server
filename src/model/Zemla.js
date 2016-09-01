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
    let Zemla = sequelize.define('Zemla', {
            id: {
                type: DataTypes.BIGINT,
                primaryKey: true,
                autoIncrement: true
            },
            path: {
                type: DataTypes.TEXT,
                // allowNull: false, //sequelize не умеет принимать parent внутрь create(), поэтому path всегда сначала записывается null, a model.build().setParent() и того хоже работает
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            /**
             * Максимальное количество коп за 1 год
             */
            intensity: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1000
            },
            note: {
                type: DataTypes.TEXT
            }
        },
        {
            getterMethods: {
                /**
                 * Полный путь земли пример /1/12/123/
                 */
                fullPath: function () {
                    return this.path + this.id + "/";
                }
            },
        });


    Zemla.Instance.prototype.setParentAndPath = async function (parent) {
        if (!parent){
            throw new Error("parent is null");
        }
        await this.setParent(parent);
        this.path = parent.fullPath;

        return this;
    };

    return Zemla;
};