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
      },
      telegram: {
        type: DataTypes.STRING,
        unique: true
      },
      whatsapp: {
        type: DataTypes.STRING,
      },
      viber: {
        type: DataTypes.STRING,
      },
      skype: {
        type: DataTypes.STRING
      },
      password: {
        type: DataTypes.STRING
      },
      name: {
        type: DataTypes.STRING
      },
      prozvishe: {
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
              throw new Error("Копный муж должен быть от 30 лет и старше");
            }
          }
        }
      },
      passport: {
        type: DataTypes.STRING,
        allowNull: false
      },
      voiskoSize: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      note: {
        type: DataTypes.TEXT
      }
    },
    {
      indexes: [

      ],
      hooks: {
        beforeCreate: async function (sender, options) {
          if (sender.starshina_id){
            throw new Error("Нельзя создавать копника с назначенным старшиной")
          }
        },
        beforeUpdate: function (sender, options) {
          // return sender.setupPath()
        },
        afterCreate: async function (sender, options) {
          let models = require("./index")

          await sender.starshiiVoiskoUp()
          // let dom = await sender.getDom()
          // await dom.obshinaUp(1, true)

          await models.KopnikTree.create({
            starshii_id: sender.id,
            mladshii_id: sender.id,
            deep: 0
          })
        }
      },
      getterMethods: {
        fullName: function () {
          return `${this.surname} ${this.name} ${this.patronymic}`
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


    /**
     * Старшина в доме для копника
     * @param zemla
     */
    /*        async getStarshinaVDome(zemla){
              let dom = await this.getDom()
              /!**
               * проверочка проживает ли копник вообще в этом доме
               * если залетный, то старшины не может быть
               *!/
              if (!dom.fullPath.startsWith(zemla.fullPath)) {
                throw new Error(`Kopnik ${this.surname} ${this.name} ${this.patronymic} doesn't live into ${zemla.name}`)
              }

              /!**
               * и если старшина проживает на этом доме, то тоже не имеет права,
               * т.к. оно перешло к старшина
               * Старшины иду в reverce() порядке чтобы первым вышел самый старший
               * кто проживает в доме
               *!/

              let starshini = (await this.getStarshini()).reverse()
              for (let eachStarshina of starshini) {
                let eachStarshinaDom = await eachStarshina.getDom()
                if (eachStarshinaDom.fullPath.startsWith(zemla.fullPath)) {
                  return eachStarshina
                }
              }
            },*/
    /**
     * На копе собираются несколько земель, поэтому сила уменьшается пропорционально общему количеству
     * @param kopa
     * @return {Promise.<void>}
     */
    /*        async getSilaNaKope(kopa){
              return await this.getSilaNaZemle(await kopa.getPlace())
            },*/
    /*        /!**
             * является ли для копника земля домом
             * @param zemla
             *!/
            async isDom(zemla){
              let dom = await this.getDom()
              return dom.fullPath.startsWith(zemla.fullPath)
            },*/
    /**
     * относительная сила на земле зависит от общего числа копников в дружине и общего числа копников вообще на земле
     * (часть войска которая проживает на земле копы) / obshina_size
     *
     * @param {Zemla} zemla
     */
    /*        async getSilaNaZemle(zemla){
              let dom = await this.getDom()

              //еопник не проживает на земле
              if (!await this.isDom(zemla)) {
                return 0
              }

              let voiskoSizeNaZemle = await sequelize.query(`
                select count(*) as count
                from
                  "KopnikTree" tree
                  join "Kopnik" dr on dr.id= tree.mladshii_id
                  join "Zemla" drDom on drDom.id= dr.dom_id
                where
                  tree.starshii_id= :THIS
                  and drDom.path||drDom.id||'/' like :zemlaFullPath ||'%'
                `,
                {
                  replacements: {
                    THIS: this.id,
                    zemlaFullPath: zemla.fullPath,
                  },
                  type: sequelize.Sequelize.QueryTypes.SELECT
                })

              voiskoSizeNaZemle = +voiskoSizeNaZemle[0].count

              let result = (voiskoSizeNaZemle) / zemla.obshinaSize
              return result
            },*/

    /**
     * поднимает войско старшины и его старшин на величину своего войска
     * (после входа в дружину)
     * @return {Promise}
     */
    Kopnik.prototype.starshiiVoiskoUp= function () {
      return sequelize.query(`
                update "Kopnik"
                    set "voiskoSize"= "voiskoSize"+${this.voiskoSize + 1}
                where
                    id in (select starshii_id from "KopnikTree" where mladshii_id= :THIS and starshii_id<> :THIS)`,
        {
          replacements: {
            "THIS": this.id
          },
          type: sequelize.Sequelize.QueryTypes.UPDATE
        });
    },
    /**
     * опускает войско старшины и его старшин на величину своего войска
     * (после выхода из дружины)
     * @return {Promise}
     */
    Kopnik.prototype.starshiiVoiskoDown= function () {
      return sequelize.query(`
                update "Kopnik"
                  set "voiskoSize"= "voiskoSize"-${this.voiskoSize + 1}
                where
                  id in (select starshii_id from "KopnikTree" where mladshii_id= :THIS and starshii_id<> :THIS)`,
        {
          replacements: {
            "THIS": this.id
          },
          type: sequelize.Sequelize.QueryTypes.UPDATE
        })
    },

    /**
     * состоит ли копник в войске
     */
    Kopnik.prototype.isKopnikInVoisko= function (kopnik) {
      let result= sequelize.query(`
                                select *
                                from
                                  "KopnikTree"
                                where
                                  starshii_id= :THIS
                                  and mladshii_id= :KOPNIK
                                  and mladshii_id <> :THIS
                                   `,
        {
          replacements: {
            "THIS": this.id,
            "KOPNIK": kopnik.id
          },
          type: sequelize.Sequelize.QueryTypes.SELECT
        })
      return result.length>0;
    },
    /**
     * перестроил дерево старшин
     * @param {Kopnik} value
     *
     * @return {object} {prevStarshini, newStarshini, modifiedResults}
     * в modifiedResults - разголосованные и просоо перебалансированные предложения
     * это могут быть элементы двух типов
     * 1. golos, action: "remove" totalZa, totalProtiv для предложений которые я или дружина голосовали, а они теперь под голосованием старшины
     * 2. totalZa, totalProtiv для предложений проголосовванных новыми старшинами, где произошоо усиление
     *
     */
    Kopnik.prototype.setStarshina2= async function (value) {
      let models = require("./index"),
        /**
         * это объединенная карта из разголосованых мной и моей дружиной предложений
         * (то есть таих где мой голос и голоса моей дружины больше не учитывается)
         * и перебалансированные предложения новых старшин
         * (там баланс поменялся в их пользу хотя по количество голосовавших не изменилось)
         * PREDLOZHENIE -> {predlozhenie, voteResult:[, ...]}
         * @type {Map}
         */
        modifiedPredlozhenia = new Map()

      //проверяю не является ли старшина моим дружинником
      if (value && this.isKopnikInVoisko(value)) {
        throw new Error("Копник, которого назначают старшиной, в данный момент состоит в дружине. Чтобы выбрать его старшиной, сначала он должен выйти из дружины");
      }
      //проверяю не является ли копник старшина одним и тем же
      if (value && this.id == value.id) {
        throw new Error("нельзя назначить себя старшиной")
      }
      //предыдущие старшины, поотом пересчитаю их голосования
      let prevStarshini = await this.getStarshii()
      //сначала уронил войско старшин
      await this.starshiiVoiskoDown()

      if (value) {
        this.starshina_id = value.id
      }
      else {
        this.starshina_id = null;
      }
      await this.save({fields: ["starshina_id"]})

      /**
       * перестроил дерево копников
       * https://www.percona.com/blog/2011/02/14/moving-subtrees-in-closure-table/
       */
      let SQL= `
            DELETE FROM "KopnikTree"
            WHERE mladshii_id IN (SELECT mladshii_id FROM "KopnikTree" WHERE starshii_id = :THIS)
            AND starshii_id NOT IN (SELECT mladshii_id FROM "KopnikTree" WHERE starshii_id = :THIS);
            `
      if (value){
        SQL+= `
            INSERT INTO "KopnikTree" (starshii_id, mladshii_id, deep, created_at, updated_at)
            SELECT supertree.starshii_id, subtree.mladshii_id, supertree.deep+subtree.deep+1, :NOW, :NOW
            FROM
              "KopnikTree" AS supertree,
              "KopnikTree" AS subtree
            WHERE
              subtree.starshii_id = :THIS
              AND supertree.mladshii_id = :STARSHINA;
            `
      }
      await sequelize.query(SQL,
        {
          replacements: {
            "THIS": this.id,
            "STARSHINA": value?value.id:null,
            "NOW": new Date()
          },
          type: sequelize.Sequelize.QueryTypes.UPDATE
        })

      //теперь поднял войско новых старшин
      await this.starshiiVoiskoUp();
    },
    /**
     * возвращает массив старшин от непосредственного до самого верхнего
     * @return {*}
     */
    Kopnik.prototype.getStarshii= async function () {
      let starshiniAsPlain = await sequelize.query(`
            select *
            from 
            "KopnikTree" tree
            where
            mladshii_id=:THIS
            and starshii_id<>:THIS
            `,
        {
          replacements: {
            "THIS": this.id,
          },
          type: sequelize.Sequelize.QueryTypes.SELECT
        });
      let STARSHINI = starshiniAsPlain.map(eachStarshinaAsPlain => eachStarshinaAsPlain.starshii_id)
      let result = Kopnik.findAll({
        where: {
          id: {
            $in: STARSHINI
          }
        },
        order: [["voiskoSize", "asc"]]
      });

      return result;
    },
    /**
     * Возвращает все войско,
     * то есть дружину и дружину дружинников и т.д. все х по дереву
     *
     * @param {Kopnik} value
     */
    Kopnik.prototype.getVoisko=async function () {
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
    Kopnik.prototype.setDom2= async function (value) {
      //сначала уронил общины прежнеих родительских земель
      let prevDom = await this.getDom();
      if (prevDom) {
        // await prevDom.obshinaDown(1, true)
      }

      if (value) {
        this.dom_id = value.id;
      }
      else {
        this.dom_id = null;
      }
      await this.save(["dom_id"]);

      //теперь поднял общины новой земли и ее родительских земель
      // await value.obshinaUp(1, true)
    },
    /**
     * возвращает массив домов от непосредственного до самого верхнего
     * @return {*}
     */
    Kopnik.prototype.getDoma= async function () {
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
    Kopnik.prototype.vote= async function (predlozhenie, value) {
      let models = require("./index")
      let result = {}

      let kopa = await predlozhenie.getPlace()
      let dom = await this.getDom()
      let starshini = await this.getStarshii()

      if (predlozhenie.state) {
        throw new Error("Predlozhenie is fixed. state=" + predlozhenie.state);
      }
      /**
       * проверочка имеет ли прово копник вообще голосовать на этой копе
       * если залетный, то не имеет
       */
      if (!dom.fullPath.startsWith(place.fullPath)) {
        throw new Error(`${place} is not ${this} dom `)
      }



      let golos = await models.Golos.findOne({
        where: {
          subject_id: predlozhenie.id,
          owner_id: this.id
        }
      });

      //проголосовать ЗА или ПРОТИВ
      if (value) {
        //переголосовка
        if (golos) {
          golos.value = value
          await golos.save(["value"])

          result = {golos: golos, action: "update"}
        }
        //первый раз голосую
        else {
          //свой голос
          golos = await models.Golos.create({
            subject_id: predlozhenie.id,
            value: value,
            owner_id: this.id
          })
          result = {golos: golos, action: "add"};
        }
      }
      //unvote(0)
      else {
        //отказ от предыдущего голоса
        if (golos) {
          result = {golos: golos, action: "remove"};
          await golos.destroy()
        }
        //странная ситуация, когда делается отказ, а голоса нет => результат={} ничего не удалилось и не создалось
        else {
          throw new Error(`${this}can't uvote. golos not found`);
        }
      }

      //подсчет итогов голосования
      await predlozhenie.rebalance()
      return result
    },
    /**
     * Заверить регистрацию
     * Заверить можно если я хотя бы на одной земле заверитель
     * создать по ней копника
     * @param {Registration} subject
     * @param {Number} state 1-da, 2-reject
     *
     * @returns {Kopnik | null} созданный копник или ничего, если регистрация отклонена
     */
    Kopnik.prototype.verifyRegistration = async function (subject, state){
      //а уполномочен ли я заверять регистрацию
      let zemli_ = await sequelize.query(`
                            select p.verifier_id, p.id, p.name
                            from
                            (select * from get_zemli(:DOM) ) p
                            where
                            p.verifier_id= :THIS
                            limit 1`,
        {
          replacements: {DOM: subject.dom_id, THIS: this.id}
        })

      /**
       * Если нашлась хоть одна земля где я заверитель, то я ее заверю
       */
      if (zemli_.length) {
        subject.state = state
        await subject.save(["state"])
        await subject.setVerifier(this)

        //создаю копника если положительная регистрация
        if (state > 0) {
          let result = await Kopnik.create({
            email: subject.email,
            skype: subject.skype,
            whatsapp: subject.whatsapp,
            viber: subject.viber,
            telegram: subject.telegram,
            password: subject.password,
            name: subject.name,
            prozvishe: subject.prozvishe,
            surname: subject.surname,
            patronymic: subject.patronymic,
            birth: subject.birth,
            passport: subject.passport,

            dom_id: subject.dom_id,
          })

          await subject.setResult(result);
          return result
        }
      }
      //я не заверитель
      else{
        throw new Error(`У вас нет прав заверять эту регистрацию`)
      }
    }

    /**
     */
    Kopnik.prototype.getUnverifiedRegistrations = async function(){
      let models = require("./index")

      let result = await models.Registration.findAll({
        where: {
          verifier_id: this.id,
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

    db.Kopnik.hasMany(db.PushSubscription, {
      as: "subscriptions",
      foreignKey: "owner_id"
    })

    db.Kopnik.belongsToMany(db.Kopnik, { through: db.KopnikTree, as: "starshii", foreignKey: "starshii_id" })
    db.Kopnik.belongsToMany(db.Kopnik, { through: db.KopnikTree, as: "mladshii", foreignKey: "mladshii_id" })

    db.Kopnik.belongsToMany(db.Kopnik, { through: db.KopnikKopa, as: "kopnik", foreignKey: "kopnik_id" })
  }
  return Kopnik
}

// let Golos = require("./Golos")
// let Registration = require("./Registration")
