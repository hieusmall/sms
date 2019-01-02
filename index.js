/*
 * Primary file for API
 *
 */

// Dependencies
var server = require('./lib/server');
console.log("Hello world");
// Declare the app
var app = {};

// Init function
app.init = function(callback){

    // Start the server
    server.init();

};

// Self invoking only if required directly
if(require.main === module){
    app.init(function(){});
}


// Export the app
module.exports = app;
