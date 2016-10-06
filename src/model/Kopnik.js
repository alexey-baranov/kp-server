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
    let Kopnik = sequelize.define('Kopnik', {
            id: {
                type: DataTypes.BIGINT,
                primaryKey: true,
                autoIncrement: true
            },
            email: {
                type: DataTypes.STRING
            },
            password: {
                type: DataTypes.STRING
            },
            name: {
                type: DataTypes.STRING
            },
            surname: {
                type: DataTypes.STRING
            },
            patronymic: {
                type: DataTypes.STRING
            },
            voiskoSize: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false
            },
            birth: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    isOlder: function (value) {
                        if (new Date().getFullYear() - value < 30) {
                            throw new Error("Возраст копного мужа должен быть от 30 лет и больше");
                        }
                    }
                }
            },

            path: {
                type: DataTypes.TEXT,
            },
            note: {
                type: DataTypes.TEXT
            }
        },
        {
            instanceMethods: {
                /**
                 * поднимает войско старшины и его старшин на величину своего войска
                 * (после входа в дружину)
                 * @return {Promise}
                 */
                voiskoUp: function () {
                    return sequelize.query(`
                                update "Kopnik"
                                    set "voiskoSize"= "voiskoSize"+${this.voiskoSize + 1}
                                where
                                    :path like path||id||'/%'`,
                        {
                            replacements: {
                                "path": this.path
                            },
                            type: sequelize.Sequelize.QueryTypes.UPDATE
                        });
                },

                /**
                 * опускает войско старшины и его старшин на величину своего войска
                 * (после выхода из дружины)
                 * @return {Promise}
                 */
                voiskoDown: function () {
                    return sequelize.query(`
                                update "Kopnik"
                                    set "voiskoSize"= "voiskoSize"-${this.voiskoSize + 1}
                                where
                                    :path like path||id||'/%'`,
                        {
                            replacements: {
                                "path": this.path
                            },
                            type: sequelize.Sequelize.QueryTypes.UPDATE
                        });
                },
                setupPath: async function (starshina) {
                    if (starshina === undefined) {
                        starshina = await this.getStarshina();
                    }
                    this.path = starshina ? starshina.fullPath : "/";
                },
                /**
                 * Устанавливает старшину в локальную переменную
                 * устанавливает путь себе и всей дружине
                 *
                 * @param {Kopnik} value
                 */
                setStarshina2: async function (value) {
                    //сначала уронил войско старшин
                    await this.voiskoDown();

                    if (value) {
                        this.starshina_id = value.id;
                    }
                    else {
                        this.starshina_id = null;
                    }
                    await this.save(["starshina_id"]);

                    //сменил путь себе и войску
                    await sequelize.query(`
                                update "Kopnik"
                                set
                                    path= replace(path, :prevStarshinaFullPath, :starshinaFullPath)
                                where
                                    id = :THIS
                                    or path like :fullPath||'%'
                                `,
                        {
                            replacements: {
                                "prevStarshinaFullPath": this.path,
                                "starshinaFullPath": value.fullPath,
                                "THIS": this.id,
                                "fullPath": this.fullPath,
                            },
                            type: sequelize.Sequelize.QueryTypes.UPDATE
                        });

                    //установил локально путь
                    this.setupPath(value);
                    //теперь поднял войско новых старшин
                    await this.voiskoUp();
                    return this;
                },

                /**
                 * возвращает массив старшин от непосредственного до самого верхнего
                 * @return {*}
                 */
                getStarshini: async function () {
                    let starshiniAsPlain = await sequelize.query(`
                                select k.*
                                    from "Kopnik" as k
                                where
                                    :path like k.path||k.id||'/%'
                                `,
                        {
                            replacements: {
                                "path": this.path,
                            },
                            type: sequelize.Sequelize.QueryTypes.SELECT
                        });
                    let STARSHINI = starshiniAsPlain.map(eachStarshinaAsPlain=>eachStarshinaAsPlain.id);
                    let result = Kopnik.findAll({
                        where: {
                            id: {
                                $in: STARSHINI
                            }
                        },
                        order: [["path", "desc"]]
                    });

                    return result;
                },

                /**
                 * Возвращает все войско,
                 * то есть дружину и дружину дружинников и т.д. все х по дереву
                 *
                 * @param {Kopnik} value
                 */
                getVoisko: async function () {
                    throw new Error("getVoisko может возвращать несколько миллионов копников поэтому нужно избегать этого метода");

                    let result = Kopnik.findAll({
                        where: {
                            path: {
                                $like: `${this.fullPath}%`
                            }
                        }
                    });
                    return result;
                },

                /**
                 * Устанавливает старшину в локальную переменную
                 * устанавливает путь себе и всей дружине
                 *
                 * @param {Kopnik} value
                 */
                setDom2: async function (value) {
                    //сначала уронил общины прежнеих родительских земель
                    let prevDom = await this.getDom();
                    if (prevDom) {
                        await prevDom.obshinaDown(1, true);
                    }

                    if (value) {
                        this.dom_id = value.id;
                    }
                    else {
                        this.dom_id = null;
                    }
                    await this.save(["dom_id"]);

                    //теперь поднял общины новой земли и ее родительских земель
                    await this.obshinaUp(1, true);
                },

                /**
                 * возвращает массив домов от непосредственного до самого верхнего
                 * @return {*}
                 */
                getDoma: async function () {
                    let dom = await this.getDom();
                    let result = await dom.getParents();
                    result.unshift(dom);

                    return result;
                },

                /**
                 * голосует за предложение
                 * перешло из Golos.create() потому что голосование не всегда связано с созданием голоса,
                 * иногда это переголосование и нужно поменять Golos#value= !value а не создавать новый
                 *
                 * 1-ый способ сохранять только голоса старшин
                 * и в самый последний момент фиксировать их дружину так? как проголосовал старшина
                 *
                 * 2-ой способ сразу фиксировать голоса всего войска
                 * @return {*}
                 */
                vote: async function (predlozhenie, value) {
                    let models = require("./index");

                    let kopa = await predlozhenie.getPlace();
                    let place = await kopa.getPlace();
                    let dom = await this.getDom();
                    let starshini = await this.getStarshini();

                    /**
                     * проверочка имеет ли прово копник вообще голосовать на этой копе
                     * если залетный, то не имеет
                     */
                    if (!dom.fullPath.startsWith(place.fullPath)) {
                        throw new Error(`${place} is not ${this} dom `);
                    }

                    /**
                     * и если старшина проживает на этом доме, то тоже не имеет права,
                     * т.к. им распоряжается старшина
                     *
                     */
                    for (let eachStarshina of starshini) {
                        let eachStarshinaDom = await eachStarshina.getDom();
                        if (eachStarshinaDom.fullPath.startsWith(place.fullPath)) {
                            throw new Error(`${place} is dom for my starshina ${eachStarshina}`);
                        }
                    }


                    let golos = await models.Golos.findOne({
                        where: {
                            for_id: predlozhenie.id,
                            owner_id: this.id
                        }
                    });

                    if (golos) {
                        if (value) {
                            golos.value = value;
                            await sequelize.query(`
                            update "Golos" 
                            set 
                                value= :value,
                                updated_at= current_timestamp
                            
                            where
                                for_id= ${predlozhenie.id}
                                and (
                                    id= ${golos.id}
                                    or parent_id = ${golos.id}
                                )`,
                                {
                                    replacements: {
                                        "value": value
                                    },
                                    type: sequelize.Sequelize.QueryTypes.UPDATE
                                });
                        }
                        //unvote(0)
                        else {
                            await sequelize.query(`
                            delete from "Golos" 
                            where
                                for_id= ${predlozhenie.id}
                                and (
                                    id= ${golos.id}
                                    or parent_id = ${golos.id}
                                )`,
                                {
                                    replacements: {
                                        "value": value
                                    },
                                    type: sequelize.Sequelize.QueryTypes.DELETE
                                });
                        }
                    }
                    else {
                        //свой голос
                        golos = await models.Golos.create({
                            for_id: predlozhenie.id,
                            value: value,
                            owner_id: this.id
                        });
                        /**
                         * и теперь все голоса моего войска
                         * последний like в запросе отвечате за то что в зачет идут голоса только тех
                         * копников, которые проживают на территории копы
                         */
                        await sequelize.query(`
                            insert into "Golos" (for_id, value, owner_id, parent_id, created_at, updated_at)
                            (
                                select ${predlozhenie.id}, :value, k.id, ${golos.id}, current_timestamp, current_timestamp
                                from 
                                    "Kopnik" k
                                     join "Zemla" d on d.id= k.dom_id
                                where
                                    k.path like '${this.fullPath}%'
                                    and d.path||d.id||'/' like '${place.fullPath}%' 
                            )`,
                            {
                                replacements: {
                                    "value": value
                                },
                                type: sequelize.Sequelize.QueryTypes.INSERT
                            });
                    }
                    //подсчет итогов голосования
                    let totals = await sequelize.query(`
                        select 
                            (select count(*) from "Golos" g where for_id= ${predlozhenie.id} and value=1) "za",
                            (select count(*) from "Golos" g where for_id= ${predlozhenie.id} and value=-1) "protiv"
                            `,
                        {
                            replacements: {
                                "value": value
                            },
                            type: sequelize.Sequelize.QueryTypes.SELECT
                        });
                    predlozhenie.totalZa = parseInt(totals[0].za);
                    predlozhenie.totalProtiv = parseInt(totals[0].protiv);

                    await predlozhenie.save(["totalZa", "totalProtiv"]);
                },
            },
            hooks: {
                beforeCreate: async function (sender, options) {
                    await sender.setupPath();
                },
                beforeUpdate: function (sender, options) {
                    // return sender.setupPath();
                },
                afterCreate: async function (sender, options) {
                    await sender.voiskoUp();
                    let dom = await sender.getDom();
                    await dom.obshinaUp(1, true);
                }
            },
            getterMethods: {
                fullName: function () {
                    return `${this.name} ${this.surname}`;
                },
                fullPath: function () {
                    return `${this.path}${this.id}/`;
                },
            },
            validate: {
                totalValidation: function () {
                    if (!this.name || !this.surname) {
                        throw new Error('Не указано имя')
                    }
                }
            }
        });

    return Kopnik;
};

let Golos = require("./Golos");