/**
 * Created by alexey2baranov on 21.02.17.
 */
let _= require("lodash")
let fs= require("fs")
let Mustache= require("mustache")

let config = require("../cfg/config.json")[process.env.NODE_ENV]

class TemplateError {
  constructor(template, view) {
    let template= fs.readFileSync(__dirname+"/../tmpl/"+path, "utf-8")

    let result= Mustache.render(template, view)

    template= TemplateError.renderTemplate(HTML, templateView)
  }
}

module.exports= TemplateError
