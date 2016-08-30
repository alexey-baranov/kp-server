/**
 * Created by alexey2baranov on 8/7/16.
 */

var env = process.env.NODE_ENV || 'development';
var autobahn = require('autobahn');
let config = require("../cfg/config.json")[env];

var connection = new autobahn.Connection({
    url: `${config.WAMP.schema}://${config.WAMP.host}:${config.WAMP.port}/${config.WAMP.path}`,
    realm: "kopa",
    use_es6_promises: true,
    max_retries: -1,
    max_retry_delay: 5,
    authmethods: ['ticket'],
    authid: "server",
    onchallenge: function(session, method, extra) {
            return "server";
    }
});

//self._options., self._options.authid
var INTERVAL;

connection.onopen = function (session, details) {
    console.log("connection.onopen"/*, session, details*/);

    session.register('com.myapp.add2', function(args) {
        return args[0] + args[1];
    }).then (()=>console.log('com.myapp.add2 registered'), console.error);
    var x=0;
    INTERVAL= setInterval(function(){
        session.publish("com.myapp.oncounter", [++x], {}, {
            acknowledge: true, //получить обещание - подтверждение
            exclude_me: false,  //получить самому свое сообщение
            disclose_me: true //открыть подписчикам свой Session#ID
        }).then ((publication)=>console.log("com.myapp.oncounter published", publication), session.log);
        console.log(x);
    },2500)

};

connection.onclose = function (reason, details) {
    console.log("connection.onclose", reason, details);
    clearInterval(INTERVAL);
};

connection.open();