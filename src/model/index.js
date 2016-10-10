'use strict';

var fs = require('fs');
var path = require('path');
var pg = require('pg');
delete pg.native;
var Sequelize = require('sequelize');
var basename = path.basename(module.filename);
var env = process.env.NODE_ENV || 'development';
var config = require(__dirname + '/../../cfg/config.json')[env];
var db = {};

Sequelize.cls = require('continuation-local-storage').createNamespace('Sequelize');

if (config.use_env_variable) {
    var sequelize = new Sequelize(process.env[config.use_env_variable]);
} else {
    var sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
    .readdirSync(__dirname)
    .filter(function (file) {
        return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
    })
    .forEach(function (file) {
        var model = sequelize['import'](path.join(__dirname, file));
        db[model.name] = model;
    });

Object.keys(db).forEach(function (modelName) {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

/**
 * земля
 */
{
    db.Zemla.belongsTo(db.Zemla, {
        as: "Parent"
    });
    db.Zemla.hasMany(db.Zemla, {
        as: "Children",
        foreignKey: "parent_id"
    });

    db.Zemla.hasMany(db.Kopnik, {
        as: "obshina",
        foreignKey: "dom_id"
    });

    db.Zemla.hasMany(db.Kopa, {
        as: "kopi",
        foreignKey: "place_id"
    });

    db.Zemla.hasMany(db.File, {
        as: "attachments",
        foreignKey: "zemla_id"
    });
}

/**
 * копный муж
 */
{

    db.Kopnik.belongsTo(db.Zemla, {
        as: "dom",
        foreignKey: "dom_id"
    });

    db.Kopnik.belongsTo(db.Kopnik, {
        as: "starshina"
    });

    db.Kopnik.hasMany(db.Kopnik, {
        as: "druzhina",
        foreignKey: "starshina_id"
    });

    db.Kopnik.hasMany(db.Kopa, {
        as: "invited",
        foreignKey: "inviter_id"
    });

    db.Kopnik.hasMany(db.Predlozhenie, {
        as: "authored",
        foreignKey: "author_id"
    });

    db.Kopnik.hasMany(db.Slovo, {
        as: "sayd",
        foreignKey: "owner_id"
    });

    db.Kopnik.hasMany(db.File, {
        as: "attachments",
        foreignKey: "kopnik_id"
    });
}

/**
 * копа
 */
{
    db.Kopa.belongsTo(db.Zemla, {
        as: "place",
        foreignKey: "place_id"
    });

    db.Kopa.belongsTo(db.Kopnik, {
        as: "inviter",
        foreignKey: "inviter_id"
    });

    db.Kopa.hasMany(db.Predlozhenie, {
        as: "result",
        foreignKey: "place_id"
    });

    db.Kopa.hasMany(db.Slovo, {
        as: "dialog",
        foreignKey: "place_id"
    });

    db.Kopa.hasMany(db.File, {
        as: "attachments",
        foreignKey: "kopa_id"
    });
}

/**
 * Слово
 */
{
    db.Slovo.belongsTo(db.Kopa, {
        as: "place",
        foreignKey: "place_id"
    });

    db.Slovo.belongsTo(db.Kopnik, {
        as: "owner"
    });

    db.Slovo.hasMany(db.File, {
        as: "attachments",
        foreignKey: "slovo_id"
    });
}
/**
 * предложение на голосование
 */
{
    db.Predlozhenie.belongsTo(db.Kopa, {
        as: "place",
        foreignKey: "place_id"
    });
    db.Predlozhenie.belongsTo(db.Kopnik, {
        as: "author",
        foreignKey: "author_id"
    });

    db.Predlozhenie.hasMany(db.Golos, {
        as: "golosa",
        foreignKey: "subject_id"
    });

    db.Predlozhenie.hasMany(db.File, {
        as: "attachments",
        foreignKey: "predlozhenie_id"
    });
}

/**
 * голос
 */
{
    db.Golos.belongsTo(db.Kopnik, {
        as: "owner"
    });
    db.Golos.belongsTo(db.Golos, {
        as: "parent"
    });
    db.Golos.hasMany(db.Golos, {
        as: "children",
        foreignKey: "parent_id"
    });
    db.Golos.belongsTo(db.Predlozhenie, {
        as: "subject",
        foreignKey: "subject_id"
    });

    db.Golos.hasMany(db.File, {
        as: "attachments",
        foreignKey: "golos_id"
    });
}

/**
 Файл
 */
{


}