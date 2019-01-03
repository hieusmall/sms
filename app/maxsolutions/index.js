/**
 *  Maxsolutions API send SMS
 *
 *
 */
// Dependencies
var https = require('https');
var http = require('http');
var helpers = require('./../../lib/helpers');



// Container all the library
var lib = {};

// Url api
lib.url = "http://api.maxsolutions.vn/Service.asmx/";
lib.apiUrl = "api.maxsolutions.vn/Service.asmx";
lib.serviceTypeId = 1;
lib.loginName = "TMVNGOCDUNG1";
lib.passWord = "@MAXs123";

var url = lib.url;
var loginName = lib.loginName.toUpperCase();
var passWord = lib.passWord;



// CheckConnection
lib.checkConnection = function (callback) {
    var path = 'CheckConnection';
    var sign = helpers.md5(loginName + '-' + helpers.md5(passWord));

    // Request api
    http.get(url + path +'?loginName='+loginName+'&Sign='+sign , (resp) => {
        let data = '';

        // A chunk of data has been recieved.
        resp.on('data', (chunk) => {
            data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on('end', () => {
            callback(false, data);
        });

    }).on("error", (err) => {
        callback(err);
    });
};


// Exports the module
module.exports = lib;