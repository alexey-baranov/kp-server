let axios = require('axios'),
  log4js= require("log4js")

  config= require("../../cfg")

let api = axios.create({
  baseURL: `${config.server.schema}://${config.server.host}:${config.server.port}/api`,
  /* other custom settings */
});


api.interceptors.request.use(function (config) {
  // Do something before request is sent
  log4js.getLogger("api").debug(config.method.toUpperCase(), config.baseURL+"/"+config.url)
  return config;
}, function (error) {
  // Do something with request error
  log4js.getLogger("api").error(error.config.method.toUpperCase(), error.config.url, error.status, error.statusText)
  log4js.getLogger("api").error(error.toString())
  return Promise.reject(error);
});

// Add a response interceptor
api.interceptors.response.use(function (response) {
  // Do something with response data
  log4js.getLogger("api").debug(response.config.method.toUpperCase(), response.config.url, response.status, response.statusText)
  return response;
}, function (error) {
  /*
   * бывает три вида ошибок:
   * 1. вообще нет сети error network (error.response=null, error.code='ECONNREFUSED')
   * 2. нет страницы 404 (error.response.data string 'not found')
   * 3. серверная ошибка обработанная express (error.response.data = {name, message, stack})
   */
  if (error.response) {
    log4js.getLogger("api").error(error.config.method.toUpperCase(), error.config.url, error.response.status, error.response.statusText)
    if (typeof error.response.data=="object") {
      log4js.getLogger("api").error("server side", error.response.data.stack)
    }
  }
  else{
    log4js.getLogger("api").error(error.config.method.toUpperCase(), error.config.url, error.code)
  }
  return Promise.reject(error)
})


module.exports = api;
