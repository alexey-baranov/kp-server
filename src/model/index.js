'use strict'

var fs = require('fs')
var path = require('path')
var pg = require('pg')
delete pg.native
var basename = path.basename(module.filename)
var env = process.env.NODE_ENV || 'development'
var config = require(__dirname + '/../../cfg')

var db = {}

const Promise = require('bluebird');
const Sequelize = require('sequelize')
const cls = require('cls-hooked')
const namespace = cls.createNamespace('Sequelize')
const clsBluebird = require('cls-bluebird')
clsBluebird(namespace, Promise)

// Sequelize.cls = require('continuation-local-storage').createNamespace('Sequelize')
Sequelize.useCLS(namespace)
Sequelize.Promise.config({
  warnings: false
})

var sequelize = new Sequelize(config.database.database, config.database.username, config.database.password, config.database)


fs
    .readdirSync(__dirname)
    .filter(function (file) {
        return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js')
    })
    .forEach(function (file) {
        var model = sequelize['import'](path.join(__dirname, file))
        db[model.name] = model
    })

Object.keys(db).forEach(function (modelName) {
    if (db[modelName].associate) {
        db[modelName].associate(db)
    }
})

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db
