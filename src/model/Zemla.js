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
            obshinaSize: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false
            },
            path: {
                type: DataTypes.TEXT,
                // allowNull: false, //sequelize не умеет принимать parent внутрь create(), поэтому path всегда сначала записывается null, a model.build().setParent() и того хоже работает
            },
            note: {
                type: DataTypes.TEXT
            }
        },
        {
            instanceMethods: {
                /**
                 * поднимает общину своих родительских земель на величину своей общины
                 * (после входа в состав земли)
                 * @return {Promise}
                 */
                obshinaUp: function (on, includeMe) {
                    return sequelize.query(`
                                update "Zemla"
                                    set "obshinaSize"= "obshinaSize"+ :delta
                                where
                                    :path like path||id||'/%'
                                    or (
                                        :includeMe 
                                        and id= ${this.id}
                                    )
`,
                        {
                            replacements: {
                                "path": this.path,
                                "delta": on === undefined ? this.obshinaSize : on,
                                "includeMe": includeMe ? true : false,
                            },
                            type: sequelize.Sequelize.QueryTypes.UPDATE
                        });
                },

                /**
                 * опускает общину своих родительских земель на величину своей общины
                 * (после выхода из состава родительской земли)
                 * @return {Promise}
                 */
                obshinaDown: function (on, includeMe) {
                    return sequelize.query(`
                                update "Zemla"
                                    set "obshinaSize"= "obshinaSize"- :delta
                                where
                                    :path like path||id||'/%'
                                    or (
                                        :includeMe 
                                        and id= ${this.id}
                                    )`,
                        {
                            replacements: {
                                "path": this.path,
                                "delta": on === undefined ? this.obshinaSize : on,
                                "includeMe": includeMe ? true : false,
                            },
                            type: sequelize.Sequelize.QueryTypes.UPDATE
                        });
                },
                setupPath: async function (parent) {
                    if (parent === undefined) {
                        parent = await this.getParent();
                    }
                    this.path = parent ? parent.fullPath : "/";
                },
                /**
                 * Устанавливает родителя в локальную переменную
                 * устанавливает путь себе и всем дочкам
                 *
                 * @param {Kopnik} value
                 */
                setParent2: async function (value) {
                    //сначала уронил общину родительских земель
                    await this.obshinaDown();

                    if (value) {
                        this.parent_id = value.id;
                    }
                    else {
                        this.parent_id = null;
                    }
                    await this.save(["parent_id"]);

                    //сменил путь себе и дочкам
                    await sequelize.query(`
                                update "Zemla"
                                set
                                    path= replace(path, :prevParentFullPath, :parentFullPath)
                                where
                                    id = :THIS
                                    or path like :fullPath||'%'
                                `,
                        {
                            replacements: {
                                "prevParentFullPath": this.path,
                                "parentFullPath": value.fullPath,
                                "THIS": this.id,
                                "fullPath": this.fullPath,
                            },
                            type: sequelize.Sequelize.QueryTypes.UPDATE
                        });

                    //установил локально путь
                    this.setupPath(value);
                    //теперь поднял общину новых родительских земель
                    await this.obshinaUp();
                    return this;
                },

                /**
                 * возвращает массив старшин от непосредственного до самого верхнего
                 * @return {*}
                 */
                getParents: async function () {
                    let parentsAsPlain = await sequelize.query(`
                                select z.*
                                    from "Zemla" as z
                                where
                                    :path like z.path||z.id||'/%'
                                `,
                        {
                            replacements: {
                                "path": this.path,
                            },
                            type: sequelize.Sequelize.QueryTypes.SELECT
                        });
                    let PARENTS = parentsAsPlain.map(eachParentAsPlain=>eachParentAsPlain.id);
                    let result = Zemla.findAll({
                        where: {
                            id: {
                                $in: PARENTS
                            }
                        },
                        order: [["path", "desc"]]
                    });

                    return result;
                },
            },
            hooks: {
                beforeCreate: async function (sender, options) {
                    await sender.setupPath();
                    await sender.obshinaUp();
                },
                beforeUpdate: function (sender, options) {
                    // return sender.setupPath();
                }
            },
            getterMethods: {
                /**
                 * Полный путь земли пример /1/12/123/
                 */
                fullPath: function () {
                    return this.path + this.id + "/";
                }
            },
        });

    return Zemla;
};