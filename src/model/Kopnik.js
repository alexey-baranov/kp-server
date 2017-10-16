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
      skype: {
        type: DataTypes.STRING
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
      instanceMethods: {
        /**
         * Старшина на копе
         * @param zemla
         */
        async getStarshinaNaKope(kopa){
          let place = await kopa.getPlace()
          let result = await this.getStarshinaVDome(place)

          return result
        },
        /**
         * Старшина в доме для копника
         * @param zemla
         */
        async getStarshinaVDome(zemla){
          let dom = await this.getDom()
          /**
           * проверочка проживает ли копник вообще в этом доме
           * если залетный, то старшины не может быть
           */
          if (!dom.fullPath.startsWith(zemla.fullPath)) {
            throw new Error(`Kopnik ${this.surname} ${this.name} ${this.patronymic} doesn't live into ${zemla.name}`)
          }

          /**
           * и если старшина проживает на этом доме, то тоже не имеет права,
           * т.к. оно перешло к старшина
           * Старшины иду в reverce() порядке чтобы первым вышел самый старший
           * кто проживает в доме
           */

          let starshini = (await this.getStarshini()).reverse()
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
          let dom = await this.getDom()
          return dom.fullPath.startsWith(zemla.fullPath)
        },
        /**
         * относительная сила на земле зависит от общего числа копников в дружине и общего числа копников вообще на земле
         * (часть войска которая проживает на земле копы) / obshina_size
         *
         * @param {Zemla} zemla
         */
        async getSilaNaZemle(zemla){
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
        /**
         * состоит ли копник в войске
         */
        isKopnikInVoisko: function (kopnik) {
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
        setStarshina2: async function (value) {
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
          //проверяю не является ли копник сам себе старшиной
          if (value && this.id == value.id) {
            throw new Error("нельзя назначить себя старшиной")
          }
          //предыдущие старшины, поотом пересчитаю их голосования
          let prevStarshini = await this.getStarshini()
          //сначала уронил войско старшин
          await this.voiskoDown()

          if (value) {
            /**
             * предложения, на которых надо отменить мой голос
             * или надо отменить голос моих дружинников,
             * потому что за них голосуют мои новые старшины
             */
            let zemliUnderStarshini = []
            for (let eachStarshina of [value].concat(await value.getStarshini())) {
              zemliUnderStarshini = zemliUnderStarshini.concat(await eachStarshina.getDoma())
            }
            /**
             * все мои предложения на землях под старшиной
             * все предложения моей дружины на землях под старшиной
             * будут разголосованы.
            */
            let unvotePredlozheniaAsArray = await sequelize.query(`
              select p.id as "PREDLOZHENIE", tree.mladshii_id as "VOTER"
              from
                "Predlozhenie" p
                join "Kopa" k on k.id= p.place_id
                join "Zemla" z on z.id= k.place_id
                join "Golos" g on g.subject_id= p.id
                join "KopnikTree" tree on tree.mladshii_id = g.owner_id 
              where
                p.state is null
                and z.id in (:ZEMLI_UNDER_STARSHINI)
                and p.deleted_at is null
                and k.deleted_at is null
                and z.deleted_at is null
                and g.deleted_at is null
                and tree.starshii_id = :THIS
`,
              {
                replacements: {
                  "ZEMLI_UNDER_STARSHINI": zemliUnderStarshini.map(each => each.id),
                  "THIS": this.id,
                  "THIS_FULL_PATH": this.fullPath,
                },
                type: sequelize.Sequelize.QueryTypes.SELECT
              })

            /**
             * возможно тоо два и более моих дружинника раньше голосовали на своей земле самостоятельно
             * а после того как я выбрал старшину из их земли, они оба должны разголосовать предложения на своей земле
             * таким образом на каждое предложение возможно несколько разголосовок
             */
            for (let eachUnvotePredlozhenieAsArray of unvotePredlozheniaAsArray) {
              let eachUnvotePredlozhenie = await models.Predlozhenie.findById(eachUnvotePredlozhenieAsArray["PREDLOZHENIE"]),
                eachVoter = await models.Kopnik.findById(eachUnvotePredlozhenieAsArray["VOTER"]),
                eachUnvoteResult = await eachVoter.vote(eachUnvotePredlozhenie, 0)
              if (!modifiedPredlozhenia.has(eachUnvotePredlozhenie.id)) {
                modifiedPredlozhenia.set(eachUnvotePredlozhenie.id, {
                  predlozhenie: eachUnvotePredlozhenie,
                  voteResult: []
                })
              }
              modifiedPredlozhenia.get(eachUnvotePredlozhenie.id).voteResult.push(eachUnvoteResult)
            }
            this.starshina_id = value.id
          }
          else {
            this.starshina_id = null;
          }
          await this.save(["starshina_id"])

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
            INSERT INTO "KopnikTree" (starshii_id, mladshii_id, created_at, updated_at)
            SELECT supertree.starshii_id, subtree.mladshii_id, :NOW, :NOW
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
          await this.voiskoUp();
          //новые старшины для переголосовки текущих голосований
          let starshini = await this.getStarshini()

          /**
           * предложения новых старшин
           */
          let starshiniPredlozheniaAsArray = await sequelize.query(`
            select p.*
            from 
              "Predlozhenie" p
              join "Golos" g on g.subject_id= p.id
            where
              p.deleted_at is null
              and g.deleted_at is null
              and p.state is null
              and g.owner_id in (:STARSHINI)
`,
            {
              replacements: {
                "STARSHINI": prevStarshini.concat(starshini).map(each => each.id).concat(-1),
              },
              type: sequelize.Sequelize.QueryTypes.SELECT
            })

          let starshiniPredlozhenia = await models.Predlozhenie.findAll({
            where: {
              id: {
                $in: starshiniPredlozheniaAsArray.map(each => each.id)
              }
            }
          })

          for (let eachStarshinaPredlozhenie of starshiniPredlozhenia) {
            await eachStarshinaPredlozhenie.rebalance()

            if (!modifiedPredlozhenia.has(eachStarshinaPredlozhenie.id)) {
              modifiedPredlozhenia.set(eachStarshinaPredlozhenie.id, {
                predlozhenie: eachStarshinaPredlozhenie
              })
            }
            else {
              modifiedPredlozhenia.get(eachStarshinaPredlozhenie.id).predlozhenie= eachStarshinaPredlozhenie
            }
          }

          return {
            prevStarshini,
            starshini,
            modifiedPredlozhenia
          }
        },
        /**
         * возвращает массив старшин от непосредственного до самого верхнего
         * @return {*}
         */
        getStarshini: async function () {
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
            await prevDom.obshinaDown(1, true)
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
          let models = require("./index")
          let result = {}

          let kopa = await predlozhenie.getPlace()
          let place = await kopa.getPlace()
          let dom = await this.getDom()
          let starshini = await this.getStarshini()

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

          /**
           * и если старшина проживает на этом доме, то тоже не имеет права,
           * т.к. им распоряжается старшина
           *
           */
          for (let eachStarshina of starshini) {
            let eachStarshinaDom = await eachStarshina.getDom()
            if (eachStarshinaDom.fullPath.startsWith(place.fullPath)) {
              throw new Error(`${place.id}:${place.name} is dom for my starshina ${eachStarshina.fullName}`)
            }
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
            subject.state = state
            await subject.save(["state"])
            await subject.setVerifier(this)

            if (state > 0) {
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
            else {
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
      },
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

          await sender.voiskoUp()
          let dom = await sender.getDom()
          await dom.obshinaUp(1, true)

          await models.KopnikTree.create({
            starshii_id: sender.id,
            mladshii_id: sender.id,
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

    db.Kopnik.hasMany(db.File, {
      as: "attachments",
      foreignKey: "kopnik_id"
    })

    db.Kopnik.belongsToMany(db.Kopnik, { through: db.KopnikTree, as: "starshii", foreignKey: "starshii_id" })
    db.Kopnik.belongsToMany(db.Kopnik, { through: db.KopnikTree, as: "mladshii", foreignKey: "mladshii_id" })
  }
  return Kopnik
}

// let Golos = require("./Golos")
// let Registration = require("./Registration")
