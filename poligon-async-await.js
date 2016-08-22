/*async function someFunctionWithUncatchedError(){
    throw new Error(123);  //nothing output from hire to err stream/ silent break function and very hard to debug code
    try {
        throw new Error(123);   //this error will be handled
    }
    catch(er){
        console.error(er)
    }
}*/

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandel rejection in promise. Reason: ' + reason, promise);
});

new Promise(function(res,rej){
    console.log(1);
    asdfasdf("test error");
    console.log(2);
});


// someFunctionWithUncatchedError();