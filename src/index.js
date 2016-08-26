/**
 * Created by alexey2baranov on 8/20/16.
 */

process.on('unhandledRejection', (reason, promise) => {
    console.error('Master: rejection in promise. Reason: ' + reason, promise);
});

let Server= require("./Server");

let server= new Server();

server.connect();