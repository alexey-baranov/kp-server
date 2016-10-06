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
    return sequelize.define('Predlozhenie', {
            id: {
                type: DataTypes.BIGINT,
                primaryKey: true,
                autoIncrement: true
            },
            value: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            totalZa: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            totalProtiv: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            isFixed: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            note: {
                type: DataTypes.TEXT
            }
        },
        {
            instanceMethods: {
                /**
                 * фиксирует голосование как есть
                 * все войско голосует в этот момент как старниша
                 */
/*                fix: async function(){
                    if (this.isFixed){
                        throw new Error("Allready fixed");
                    }
                    let kopa= await this.getPlace();
                    let place= await kopa.getPlace();
                    for(let eachGolos of await this.getGolosa()){
                        let eachStarshina= await eachGolos.getOwner();
                        /!**
                         * последний like в запросе отвечате за то что в зачет идут голоса только тех
                         * копников войска, которые проживают на территории копы
                         *!/
                        await sequelize.query(`
                            insert into "Golos" (for_id, value, owner_id, parent_id, created_at, updated_at)
                            (
                                select ${this.id}, ${eachGolos.value}, k.id, ${eachGolos.id}, current_timestamp, current_timestamp
                                from 
                                    "Kopnik" k
                                     join "Zemla" d on d.id= k.dom_id
                                where
                                    k.path like '${eachStarshina.fullPath}%'
                                    and d.path||d.id||'/' like '${place.fullPath}%' 
                            )`,
                            {
                                replacements: {
                                    "path": this.path
                                },
                                type: sequelize.Sequelize.QueryTypes.INSERT
                            });
                    }

                    this.isFixed= true;
                    await this.save(["isFixed"]);
                },*/

                /**
                 * обновляет статистику
                 * фиксирует есл пора фиксировать
                 * @return {Promise}
                 */
                onGolosCreate: function () {
                    return;
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
                }
            }
        });
};