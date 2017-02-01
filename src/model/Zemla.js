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
            AOGUID:{
                type: DataTypes.STRING,
                unique: true,
            },
            PARENTGUID:{
                type: DataTypes.STRING,
            },
            SHORTNAME:{
                type: DataTypes.STRING,
            },
            //имя без "г", "ул" и пр.
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            /**
             * Уровень адресного объекта (страна, город, улица, дом и т.д.)
             */
            level: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
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
            indexes: [
                //HMAO 1192053
                //быстрый поиск подземель
                {
                    unique: false,
                    fields: ['path'],
                    operator: 'text_pattern_ops'
                },
                {
                    unique: false,
                    fields: ["level"],
                },
                {
                    unique: false,
                    fields: ['name'],
                    operator: 'varchar_pattern_ops'
                },
                //индексы для быстрого удаления строк необходимы индексы на внешние ключи
                {
                    unique: false,
                    fields: ['parent_id'],
                },
                {
                    unique: false,
                    fields: ['country_id'],
                },
            ],
            instanceMethods: {
                /**
                 * поднимает общину своих родительских земель (и свою взависимотси от параметра includeMe)
                 * на величину своей общины (после входа в состав земли)
                 * @return {Promise}
                 */
                obshinaUp: function (on, includeMe) {
                    return sequelize.query(`
                                update "Zemla"
                                    set "obshinaSize"= "obshinaSize"+ :delta
                                where
                                    id in (
                                        select id from get_zemli(${this.id}) 
                                        where ${includeMe?'true':'false'} or id<>${this.id}
                                    )`,
                        {
                            replacements: {
                                "delta": on === undefined ? this.obshinaSize : on,
                                "includeMe": includeMe ? true : false,
                            },
                            type: sequelize.Sequelize.QueryTypes.UPDATE
                        });
                },

                /**
                 * опускает общину своих родительских земель (и свою взависимотси от параметра includeMe)
                 * на величину своей общины (после выхода из состава родительской земли)
                 * @return {Promise}
                 */
                obshinaDown: function (on, includeMe) {
                    return sequelize.query(`
                                update "Zemla"
                                    set "obshinaSize"= "obshinaSize"- :delta
                                where
                                    id in (
                                        select id from get_zemli(${this.id}) 
                                        where ${includeMe?'true':'false'} or id<>${this.id}
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
                 * возвращает массив родительских земель от непосредственного до самого верхнего
                 * @return {*}
                 */
                getParents: async function () {
                    let parentsAsPlain = await sequelize.query(`
                                select *
                                from get_zemli(${this.id})
                                where id <> ${this.id}
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
                    // await sender.obshinaUp(); //что апать то? у новой земли еще нет общины
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
        })

    Zemla.associate=function(db){
        db.Zemla.belongsTo(db.Zemla, {
            as: "Parent"
        })

        db.Zemla.hasMany(db.Zemla, {
            as: "Children",
            foreignKey: "parent_id"
        })

        db.Zemla.belongsTo(db.Zemla, {
            as: "Country"
        })

        // уполномоченый заверять регистрации
        // db.Zemla.belongsTo(db.Kopnik, {
        //     as: "Verifier"
        // })

        db.Zemla.hasMany(db.Kopnik, {
            as: "obshina",
            foreignKey: "dom_id"
        })

        db.Zemla.hasMany(db.Kopa, {
            as: "kopi",
            foreignKey: "place_id"
        })

        db.Zemla.hasMany(db.File, {
            as: "attachments",
            foreignKey: "zemla_id"
        })
    }

    return Zemla;
};