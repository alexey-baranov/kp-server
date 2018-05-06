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
      AOGUID: {
        type: DataTypes.STRING
      },
      PARENTGUID: {
        type: DataTypes.STRING,
      },
      SHORTNAME: {
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
      /**
       obshinaSize: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
       */
      /*      path: {
              type: DataTypes.TEXT,
              // allowNull: false, //sequelize не умеет принимать parent внутрь create(), поэтому path всегда сначала записывается null, a model.build().setParent() и того хоже работает
            },*/
      note: {
        type: DataTypes.TEXT
      }
    },
    {
      indexes: [
        {
          unique: false,
          fields: ["level"],
        },
        {
          unique: false,
          fields: ['name'],
          operator: 'varchar_pattern_ops'
        },
        {
          unique: true,
          fields: ['AOGUID'],
          operator: 'varchar_pattern_ops'
        },
        {
          unique: false,
          fields: ['PARENTGUID'],
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
      hooks: {
        beforeCreate: async function (sender, options) {
        },
        beforeUpdate: function (sender, options) {
          // return sender.setupPath();
        },

        afterCreate: async function (sender, options) {
          let models = require("./index")
          await models.ZemlaTree.create({
            bolshe_id: sender.id,
            menshe_id: sender.id,
            deep: 0,
          })

          if (sender.parent_id) {
            await sender.setParent2(await sender.getParent())
          }

          // проверить что раньше - этот код или строка в вызывающей функции
          // done
          let x = 1
        }
      },
      getterMethods: {},
    })

  /**
   * Устанавливает родителя в локальную переменную
   *
   * @param {Kopnik} value
   */
  Zemla.prototype.setParent2 = async function (value) {
    //сначала уронил общину родительских земель
    // await this.obshinaDown()

    this.parent_id = value ? value.id : null
    await this.save({fields: ["parent_id"]})

    /**
     * перестроил дерево земель
     * https://www.percona.com/blog/2011/02/14/moving-subtrees-in-closure-table/
     */
    let SQL = `
            DELETE FROM "ZemlaTree"
            WHERE menshe_id IN (SELECT menshe_id FROM "ZemlaTree" WHERE bolshe_id = :THIS)
            AND bolshe_id NOT IN (SELECT menshe_id FROM "ZemlaTree" WHERE bolshe_id = :THIS);
            `
    if (value) {
      SQL += `
            INSERT INTO "ZemlaTree" (bolshe_id, menshe_id, deep, created_at, updated_at)
            SELECT supertree.bolshe_id, subtree.menshe_id, supertree.deep+subtree.deep+1, :NOW, :NOW
            FROM
              "ZemlaTree" AS supertree,
              "ZemlaTree" AS subtree
            WHERE
              subtree.bolshe_id = :THIS
              AND supertree.menshe_id = :PARENT;
            `
    }
    await sequelize.query(SQL,
      {
        replacements: {
          "THIS": this.id,
          "PARENT": value ? value.id : null,
          "NOW": new Date()
        },
        type: sequelize.Sequelize.QueryTypes.UPDATE
      })

    //теперь поднял общину новых родительских земель
    // await this.obshinaUp()

    return this
  },

    /**
     * поднимает общину своих родительских земель (и свою взависимотси от параметра includeMe)
     * на величину своей общины (после входа в состав земли)
     * @return {Promise}
     */
    /*        obshinaUp: function (on, includeMe) {
              return sequelize.query(`
                                    update "Zemla"
                                        set "obshinaSize"= "obshinaSize"+ :delta
                                    where
                                        id in (
                                            select id from get_zemli(${this.id})
                                            where ${includeMe ? 'true' : 'false'} or id<>${this.id}
                                        )`,
                {
                  replacements: {
                    "delta": on === undefined ? this.obshinaSize : on,
                    "includeMe": includeMe ? true : false,
                  },
                  type: sequelize.Sequelize.QueryTypes.UPDATE
                });
            },*/

    /**
     * опускает общину своих родительских земель (и свою взависимотси от параметра includeMe)
     * на величину своей общины (после выхода из состава родительской земли)
     * @return {Promise}
     */
    /*        obshinaDown: function (on, includeMe) {
              return sequelize.query(`
                                    update "Zemla"
                                        set "obshinaSize"= "obshinaSize"- :delta
                                    where
                                        id in (
                                            select id from get_zemli(${this.id})
                                            where ${includeMe ? 'true' : 'false'} or id<>${this.id}
                                        )`,
                {
                  replacements: {
                    "path": this.path,
                    "delta": on === undefined ? this.obshinaSize : on,
                    "includeMe": includeMe ? true : false,
                  },
                  type: sequelize.Sequelize.QueryTypes.UPDATE
                });
            },*/

    /**
     * возвращает массив родительских земель от непосредственного до самого верхнего
     * @return {*}
     */
    Zemla.prototype.getParents= async function () {
      let models = require("./index")

      let parentsAsPlain = await sequelize.query(`
            select *
            from
              "ZemlaTree" tree
            where
              menshe_id = :THIS
              and bolshe_id <> :THIS
            order by
              deep
            `,
        {
          replacements: {
            "THIS": this.id,
          },
          type: sequelize.Sequelize.QueryTypes.SELECT
        });


      let PARENTS = parentsAsPlain.map(eachParentAsPlain => eachParentAsPlain.bolshe_id)
      let result = await Zemla.findAll({
        where: {
          id: {
            $in: PARENTS
          }
        },
      })
      result.sort((a, b) => {
        return PARENTS.indexOf(a.id) < PARENTS.indexOf(b.id) ? -1 : 1
      })
      return result
    },

    /**
     * пока заглушка - первые 100 копников
     */
    /*async getGolosovanti(){
      let models = require("../model")

      let golosovantiAsRow = await sequelize.query(`
        select g.*
        from
          "Kopnik" g
          join "Zemla" dom on dom.id= g.dom_id
        where
          dom.id= :THIS
          or dom.path like :fullPath || '%'
        order by
          "voiskoSize"
        limit 100
        `,
        {
          replacements: {
            "THIS": this.id,
            "fullPath": this.fullPath
          },
          type: sequelize.Sequelize.QueryTypes.SELECT
        })

      let GOLOSOVANTI = golosovantiAsRow.map(eachGolosovant => eachGolosovant.id)


      let result = await models.Kopnik.findAll({
        where: {
          id: {
            $in: GOLOSOVANTI
          }
        }
      })

      return result

      /!**
       * (
       *  что копник сам проживает на земле
       * )
       * and (
       *  что старшины нет
       *  or(
       *      старшина не проживает на земле
       *    )
       * )
       *!/
      golosovantiAsRow = await sequelize.query(`
        select *
        from
          "Kopnik" g
          join "Zemla" dom on dom.id= g.dom_id
          left join "Kopnik" s on s.id= g.starshina_id
          left join "Zemla" stDom on stDom.id= s.dom_id
        where
          (
            dom.id= :THIS
            or dom.path like :fullPath || '%'
          )
          and (
            starhina_id is null
            or not (
              stDom.id= :THIS
              or stDom.path like :fullPath || '%'
            )
          )
        )`,
        {
          replacements: {
            "path": this.path,
            "delta": on === undefined ? this.obshinaSize : on,
            "includeMe": includeMe ? true : false,
          },
          type: sequelize.Sequelize.QueryTypes.UPDATE
        });
    },*/


  Zemla.associate = function (db) {
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

    db.Zemla.belongsToMany(db.Zemla, {through: db.ZemlaTree, as: "bolshe", foreignKey: "bolshe_id"})
    db.Zemla.belongsToMany(db.Zemla, {through: db.ZemlaTree, as: "menshe", foreignKey: "menshe_id"})
  }

  return Zemla
}
