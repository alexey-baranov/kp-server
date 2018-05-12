/**
 * Created by alexey2baranov on 08.12.16.
 */

var config = require(__dirname + '/../cfg')
let log4js = require("log4js"),
    FIASImporter= require("./util/import/Russia/zemla/FIASImporter");

log4js.configure(config.log)

let fiasImporter= new FIASImporter()

    fiasImporter.getHouseRowsByGUID(__dirname + '/../fias/AS_HOUSE_20170305_cf62cc8e-6cb9-4b8c-8338-0765c06d134b.XML', [
      "4cdf6040-0ad1-4592-9ba6-aab4a1e2d321",
      "4ffc802f-117b-4e22-acb9-1b8fa70bca44",
      "668fff0c-452a-4ca3-b968-ef487bb3c3cb",
      "7ba3bb7f-d9f3-4c24-85ba-877c5b6ca16d",
      "bc92d19b-7d71-440b-ae4b-96a8ecce7a72",
      "cf442162-ac4e-4ce2-a11e-28ad38bec7bb",
      "e77cf129-edf2-46db-9e04-21c3b1cb2d8c"
    ])
      .then(result=>{
        console.info("result", JSON.stringify(result))
      });
