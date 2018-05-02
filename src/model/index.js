'use strict'

var fs = require('fs')
var path = require('path')
var pg = require('pg')
delete pg.native
var Sequelize = require('sequelize')
var basename = path.basename(module.filename)
var env = process.env.NODE_ENV || 'development'
var config = require(__dirname + '/../../cfg')
var db = {}

// Sequelize.cls = require('continuation-local-storage').createNamespace('Sequelize')
const namespace = require('cls-hooked').createNamespace('Sequelize')
Sequelize.useCLS(namespace)

var sequelize = new Sequelize(config.database, config.username, config.password, config)


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
