'use strict';

var fs        = require('fs');
var path      = require('path');
var Sequelize = require('sequelize');
var basename  = path.basename(module.filename);
var env       = process.env.NODE_ENV || 'development';
var config    = require(__dirname + '/../config/config.json')[env];
var db        = {};

Sequelize.cls = require('continuation-local-storage').createNamespace('Sequelize');

if (config.use_env_variable) {
  var sequelize = new Sequelize(process.env[config.use_env_variable]);
} else {
  var sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(function(file) {
    var model = sequelize['import'](path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(function(modelName) {
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
    as: "owners",
    foreignKey: "own_id"
  });

    db.Zemla.hasMany(db.Kopa, {
        //as: "Meetings",
        // foreignKey: "head_id"
    });

  db.Zemla.hasMany(db.File, {
    as: "Attachments",
    foreignKey: "zemla_id"
  });
}

/**
 * копный муж
 */
{

  db.Kopnik.belongsTo(db.Zemla, {
    as: "own",
    foreignKey: "own_id"
  });

  db.Kopnik.belongsTo(db.Kopnik, {
    as: "starshina"
  });

  db.Kopnik.hasMany(db.Kopnik, {
    as: "druzhina",
    foreignKey: "starshina_id"
  });

  db.Kopnik.hasMany(db.Predlozhenie, {
    as: "offers",
    foreignKey: "owner_id"
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
    // as: "Location"
  });


  db.Kopa.hasMany(db.Predlozhenie, {
    as: "offers",
    foreignKey: "kopa_id"
  });

    db.Kopa.hasMany(db.File, {
    as: "attachments",
    foreignKey: "kopa_id"
  });
}

/**
 * сообщение
 */
{
  db.Slovo.belongsTo(db.Kopa, {
    // as: "Location"
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
    // as: "Location"
    foreignKey: "kopa_id"
  });
  db.Predlozhenie.belongsTo(db.Kopnik, {
      as: "owner",
      foreignKey: "owner_id"
  });

    db.Predlozhenie.hasMany(db.Golos, {
        as: "votes",
        foreignKey: "target_id"
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

  db.Golos.belongsTo(db.Predlozhenie, {
      as: "target",
      foreignKey: "target_id"
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