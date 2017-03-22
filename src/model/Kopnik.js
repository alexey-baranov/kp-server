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
      rolee: {
        type: DataTypes.STRING,
        defaultValue: "kopnik",
      },
      email: {
        type: DataTypes.STRING,
        unique: true
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
      passport: {
        type: DataTypes.STRING,
        allowNull: false
      },
      skype:{
        type: DataTypes.STRING
      },
      voiskoSize: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      path: {
        type: DataTypes.TEXT
      },
      note: {
        type: DataTypes.TEXT
      }
    },
    {
      indexes: [
        {
          fields: ['path'],
          operator: 'text_pattern_ops'
        },
      ],
      instanceMethods: {
        /**
         * Старшина в доме для копника
         * @param zemla
         */
        async getStarshinaNaKope(kopa){
          let place= await kopa.getPlace()
          let result= await this.getStarshinaVDome(place)

          return result
        },
        /**
         * Старшина в доме для копника
         * @param zemla
         */
        async getStarshinaVDome(zemla){
          let dom= await this.getDom()
          /**
           * проверочка проживает ли копник вообще в этом доме
           * если залетный, то старшины не может быть
           */
          if (!dom.fullPath.startsWith(zemla.fullPath)) {
            throw new Error(`Kopnik ${this.fullName} doesn't live into ${zemla.name}`)
          }

          /**
           * и если старшина проживает на этом доме, то тоже не имеет права,
           * т.к. оно перешло к старшина
           * Старшины иду в reverce() порядке чтобы первым вышел самый старший
           * кто проживает в доме
           */

          let starshini= (await this.getStarshini()).reverse()
          for (let eachStarshina of starshini) {
            let eachStarshinaDom = await eachStarshina.getDom()
            if (eachStarshinaDom.fullPath.startsWith(zemla.fullPath)) {
              return eachStarshina
            }
          }
        },
        /**
         * На копе собираются несколько земель, поэтому сила уменьшается пропорционально общему количеству
         * @param kopa
         * @return {Promise.<void>}
         */
        async getSilaNaKope(kopa){
          return await this.getSilaNaZemle(await kopa.getPlace())
        },
        /**
         * является ли для копника земля домом
         * @param zemla
         */
        async isDom(zemla){
          let dom= await this.getDom()
          return dom.fullPath.startsWith(zemla.fullPath)
        },
        /**
         * относительная сила на земле зависит от общего числа копников в дружине и общего числа копников вообще на земле
         * (часть войска которая проживает на земле копы) / obshina_size
         *
         * @param {Zemla} zemla
         */
        async getSilaNaZemle(zemla){
          let dom= await this.getDom()

          //еопник не проживает на земле
          if (! await this.isDom(zemla)){
            return 0
          }

          let voiskoNaZemle= await sequelize.query(`
            select count(*) as count
            from 
              "Kopnik" dr
               join "Zemla" drDom on drDom.id= dr.dom_id
            where
              dr.path like :fullPath || '%'
              and drDom.path||drDom.id||'/' like :zemlaFullPath ||'%' 
            `,
            {
              replacements: {
                fullPath: this.fullPath,
                zemlaFullPath: zemla.fullPath,
              },
              type: sequelize.Sequelize.QueryTypes.INSERT
            })

          voiskoNaZemle= +voiskoNaZemle[0].count

          let result= (voiskoNaZemle+1)/zemla.obshinaSize
          return result
        },

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
                                    id in (select id from get_starshini(${this.id}))`,
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
                                    id in (select id from get_starshini(${this.id}))`,
            {
              replacements: {
                "path": this.path
              },
              type: sequelize.Sequelize.QueryTypes.UPDATE
            })
        },
        setupPath: async function (starshina) {
          if (starshina === undefined) {
            starshina = await this.getStarshina()
          }
          this.path = starshina ? starshina.fullPath : "/"
        },

        /**
         * состоит ли копник в войске
         */
        isKopnikInVoisko: function (kopnik) {
          let result = kopnik.path.startsWith(this.fullPath);
          return result;
        },

        /**
         * Устанавливает старшину в локальную переменную
         * устанавливает путь себе и всей дружине
         *
         * @param {Kopnik} value
         */
        setStarshina2: async function (value) {
          //проверяю не является ли старшина моим дружинником
          if (value && this.isKopnikInVoisko(value)) {
            throw new Error("Копник, которого назначают старшиной, в данный момент состоит в дружине. Чтобы выбрать его старшиной, сначала он должен выйти из дружины");
          }
          //проверяю не является ли копник сам себе старшиной
          if (value && this.id == value.id) {
            throw new Error("нельзя назначить себя старшиной");
          }
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
          `
                    
                    `;
          await sequelize.query(`
                                update "Kopnik"
                                set
                                    path= overlay(path placing :starshinaFullPath from 1 for :prevStarshinaFullPathLength)
                                where
                                    id = :THIS
                                    or path like :fullPath||'%'
`,
            {
              replacements: {
                "prevStarshinaFullPathLength": this.path.length,
                "starshinaFullPath": value ? value.fullPath : '/',
                "THIS": this.id,
                "fullPath": this.fullPath,
              },
              type: sequelize.Sequelize.QueryTypes.UPDATE
            });

          //установил локально путь, в БД он уже установлен выше
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
                                select *
                                    from get_starshini(${this.id})`,
            {
              replacements: {
                "path": this.path,
              },
              type: sequelize.Sequelize.QueryTypes.SELECT
            });
          let STARSHINI = starshiniAsPlain.map(eachStarshinaAsPlain => eachStarshinaAsPlain.id);
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
         *
         * @param {Zemla} value
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
          await value.obshinaUp(1, true)
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
         * и в определенный момент (когда голосование закончилось) фиксировать их дружину так, как проголосовал старшина
         *
         * 2-ой способ сразу фиксировать голоса всего войска
         * @throws {Error}  если был отказ от голоса, а голоса то не оказалось
         * @return {{golos, action:"add"|"update"|"remove" }} добавил или удалил или поменял голосили
         */
        vote: async function (predlozhenie, value) {
          let models = require("./index");
          let result = {};

          let kopa = await predlozhenie.getPlace();
          let place = await kopa.getPlace();
          let dom = await this.getDom();
          let starshini = await this.getStarshini();

          if (predlozhenie.state) {
            throw new Error("Predlozhenie is fixed. state=" + predlozhenie.state);
          }
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
              subject_id: predlozhenie.id,
              owner_id: this.id
            }
          });

          //проголосовать
          if (value) {
            //переголосовка
            if (golos) {
              result = {golos: golos, action: "update"};
              golos.value = value;
              await sequelize.query(`
                            update "Golos" 
                            set 
                                value= :value,
                                updated_at= current_timestamp
                            
                            where
                                subject_id= ${predlozhenie.id}
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
            //первый раз голосую
            else {
              //свой голос
              golos = await models.Golos.create({
                subject_id: predlozhenie.id,
                value: value,
                owner_id: this.id
              });
              result = {golos: golos, action: "add"};
              /**
               * и теперь все голоса моего войска
               * последний like в запросе отвечате за то что в зачет идут голоса только тех
               * копников, которые проживают на территории копы
               */
              await sequelize.query(`
                            insert into "Golos" (subject_id, value, owner_id, parent_id, created_at, updated_at)
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
          }
          //unvote(0)
          else {
            //отказ от предыдущего голоса => результат={remove:golos}
            if (golos) {
              result = {golos: golos, action: "remove"};
              await sequelize.query(`
                            delete from "Golos" 
                            where
                                subject_id= ${predlozhenie.id}
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
            //странная ситуация, когда делается отказ, а голоса нет => результат={} ничего не удалилось и не создалось
            else {
              throw new Error(`${this}can't uvote. golos not found`);
            }
          }


          //подсчет итогов голосования
          let totals = await sequelize.query(`
                        select
                            (select count(*) from "Golos" g where subject_id= ${predlozhenie.id} and value=1) "za",
                            (select count(*) from "Golos" g where subject_id= ${predlozhenie.id} and value=-1) "protiv"
                            `,
            {
              replacements: {
                "value": value
              },
              type: sequelize.Sequelize.QueryTypes.SELECT
            });
          predlozhenie.totalZa = parseInt(totals[0].za);
          predlozhenie.totalProtiv = parseInt(totals[0].protiv);

          if (predlozhenie.totalZa / place.obshinaSize > 7 / 8) {
            predlozhenie.state = 1;
          }
          else if (predlozhenie.totalProtiv / place.obshinaSize > 7 / 8) {
            predlozhenie.state = -1;
          }

          await predlozhenie.save(["totalZa", "totalProtiv", "state"]);

          return result;
        },

        /**
         * Заверить регистрацию создать по ней копника
         * @param {Registration} subject
         * @param {Number} state 1-da, 2-reject
         */
        async verifyRegistration(subject, state){
          //а уполномочен ли я заверять регистрацию
          let zemliAsRow = await sequelize.query(`
                            select p.verifier_id, p.id, p.name
                            from
                            (select * from get_zemli(:DOM) ) p
                            where
                            p.verifier_id= :THIS
                            limit 1`,
            {
              replacements: {DOM: subject.dom_id, THIS: this.id},
              type: sequelize.Sequelize.QueryTypes.SELECT
            })

          /**
           * Если нашлась хоть одна земля где я заверитель, то я ее заверю
           */
          for (let eachZemlaAsRow of zemliAsRow) {
            subject.state= state
            await subject.save(["state"])
            await subject.setVerifier(this)

            if (state>0) {
              let result = await Kopnik.create({
                email: subject.email,
                password: subject.password,
                name: subject.name,
                surname: subject.surname,
                patronymic: subject.patronymic,
                birth: subject.birth,
                passport: subject.passport,
                note: subject.note,

                dom_id: subject.dom_id,
              })

              await subject.setResult(result);
              return result
            }
            else{
              return
            }
          }
          throw new Error(`У вас нет прав заверять эту регистрацию`)
        },

        /**
         */
        async getUnverifiedRegistrations(){
          let models = require("./index")

          let result = await models.Registration.findAll({
            where: {
              verifier_id:  this.id,
              deleted_at: null,
              state: 0,
            },
            order: [
              ['id', 'asc']
            ],
            include: [{
              model: models.File,
              as: 'attachments'
            }]
          });
          return result
        }
      },
      hooks: {
        beforeCreate: async function (sender, options) {
          await sender.setupPath()
        },
        beforeUpdate: function (sender, options) {
          // return sender.setupPath()
        },
        afterCreate: async function (sender, options) {
          await sender.voiskoUp()
          let dom = await sender.getDom()
          await dom.obshinaUp(1, true)
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
      },

    })
  Kopnik.associate = function (db) {
    db.Kopnik.belongsTo(db.Zemla, {
      as: "dom",
    })

    db.Kopnik.belongsTo(db.Kopnik, {
      as: "starshina"
    })

    db.Kopnik.hasMany(db.Kopnik, {
      as: "druzhina",
      foreignKey: "starshina_id"
    })

    db.Kopnik.hasMany(db.Kopnik, {
      as: "druzhina",
      foreignKey: "starshina_id"
    })

    db.Kopnik.hasMany(db.File, {
      as: "attachments",
      foreignKey: "kopnik_id"
    })
  }
  return Kopnik;
};

let Golos = require("./Golos");
let Registration = require("./Registration");
