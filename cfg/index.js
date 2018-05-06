/**
 * Created by alexey2baranov on 22.03.17.
 */


if (!process.env.NODE_ENV){
  throw new Error("NODE_ENV is not defined")
}

let main= require("./main")
let privateConfig= require("./private")
let mergedConfig= require("lodash").merge({}, main, privateConfig)

module.exports = mergedConfig[process.env.NODE_ENV]
