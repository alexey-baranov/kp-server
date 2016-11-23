/**
 * Created by alexey2baranov on 8/20/16.
 */
let log4js= require("log4js");

log4js.configure(__dirname+'/../cfg/log.json', {
    reloadSecs: 60,
    cwd: __dirname+"/.."
});

// global.AUTOBAHN_DEBUG = true;

process.on('unhandledRejection', (reason, promise) => {
    console.error('unhandledRejection handler. Reason:', reason, promise);
});
/*process.on('uncaughtException', function(err) {
    console.log('uncaughtException handler', err)
});*/

let Server= require("./Server");

let server= new Server();

server.start();