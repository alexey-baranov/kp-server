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
    }, {
        instanceMethods: {
            /**
             * поднимает войско старшины и его старшин на величину своего войска
             * (после входа в дружину)
             * @return {Promise}
             */
            voiskoUp: function(){
                return sequelize.query(`
                                update "Kopnik"
                                    set "voiskoSize"= "voiskoSize"+${this.voiskoSize+1}
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
            voiskoDown: function(){
                return sequelize.query(`
                                update "Kopnik"
                                    set "voiskoSize"= "voiskoSize"-${this.voiskoSize+1}
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
                //сначала уронил войско старшины
                await this.voiskoDown();

                this._starshina = value;
                if (value) {
                    this.starshina_id = value.id;
                }
                else {
                    this.starshina_id = null;
                }
                await this.setupPath(value);
                await this.save(["path", "starshina_id"]);

                //теперь поднял войско нового старшины
                await this.voiskoUp();

                let druzhina = await this.getDruzhina();

                for (let eachDruzhe of druzhina) {
                    await eachDruzhe.setupPath(this);
                    await eachDruzhe.save(["path"]);
                }
            },

            /**
             * возвращает массив старшин от непосредственного до самого верхнего
             * @return {*}
             */
            getStarshini: async function(){
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
                let STARSHINI= starshiniAsPlain.map(eachStarshinaAsPlain=>eachStarshinaAsPlain.id);
                let result= Kopnik.findAll({
                    where:{
                        id:{
                            $in:STARSHINI
                        }
                    },
                    order:[["path", "desc"]]
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
        },
        hooks: {
            beforeCreate: async function (sender, options) {
                await sender.setupPath();
                await sender.voiskoUp();
            },
            beforeUpdate: function (sender, options) {
                // return sender.setupPath();
            }
        },
        getterMethods: {
            fullName: function () {
                return `${this.name} ${this.surname}`;
            },
            fullPath: function () {
                return `${this.path}${this.id}/`;
            },
            starshina: async function () {
                if (this._starshina === undefined) {
                    return null;
                }
                else {
                    return this._starshina;
                }
            },
        },
        setterMethods: {
            starshina: async function (value) {
                throw new Error("Async await setters not supported!");
                this._starshina = value;
                if (value) {
                    this.starshina_id = value.id;
                }
                else {
                    this.starshina_id = null;
                }
                await this.setupPath();

                let druzhina = await this.getDruzhina();
                console.log("druzhina:", druzhina);
                for (let eachDruzhe in druzhina) {
                    await (eachDruzhe.starshina = this);
                }
                let x = 1;
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