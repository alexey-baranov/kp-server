/**
 * Created by alexey2baranov on 8/29/16.
 */
new Promise(function(res){
    let x=1;

})
    .then((result)=>{
        console.log("promise done "+result);
    },(result)=>{
        console.log("promise errror "+result);
    });



/*


let log4js= require("log4js");

log4js.configure(__dirname+'/../cfg/log.json', {
    reloadSecs: 60,
    cwd: __dirname+"/.."
});

var logger = log4js.getLogger();
logger.error("error from root logger");
logger.info("info from root logger");

var serverLogger = log4js.getLogger("view");
serverLogger.error("error from root logger");
serverLogger.info("multi info", "multi info","multi info","info from root logger");

try{
    throw new Error("asdfasdfasdf");
}
catch(er){
    // serverLogger.error("some stupid error", er);
}
setInterval(()=>{
    serverLogger.debug("multi info", "multi info","multi info","info from root logger");
},1000);
*/
