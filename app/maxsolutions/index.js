/**
 *  Maxsolutions API send SMS
 *
 *
 */
// Dependencies
var https = require('https');
var http = require('http');
var helpers = require('../../lib/helpers');



// Container all the library
var lib = {};

// Url api
lib.url = "http://api.maxsolutions.vn/Service.asmx/";
lib.apiUrl = "api.maxsolutions.vn/Service.asmx";
lib.serviceTypeId = 1;
lib.brandName = "TMVNGOCDUNG";
lib.loginName = "TMVNGOCDUNG1";
lib.passWord = "@MAXs123";

var url = lib.url;
var loginName = lib.loginName.toUpperCase();
var passWord = lib.passWord;
var brandName = lib.brandName;
var serviceTypeId = lib.serviceTypeId;


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


// Get Balance
lib.getBalance = function(callback) {
    var path = 'GetBalance';
    var sign = helpers.md5(loginName + '-' + helpers.md5(passWord));

    // Request api
    http.get(url + path + '?loginName='+loginName+'&Sign='+sign, (resp) => {
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


// Get Brandname
lib.getBrandName = function(callback) {
    var path = 'GetBrandName';
    var sign = helpers.md5(loginName + '-' + helpers.md5(passWord));

    // Request api
    http.get(url + path + '?loginName='+loginName+'&Sign='+sign, (resp) => {
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


// Send Sms
lib.sendSms = function(callback) {
    var path = 'SendSms2';
    var sign = helpers.md5(loginName + '-' + helpers.md5(passWord) + '-' + brandName + '-' + serviceTypeId);

    var jsoncontent = {
        'PhoneNumber' : "0352306562",
        'Message' : "Xin chao anh hieu em o ben tham my vien ngoc dung, co  suat uu dai danh cho anh",
        'SmsGuid' : "447CF3B8-4A14-5C2A-AED5-F307A888EF7D",
        'ContentType' : '1'
    };
    var strContent = JSON.stringify(jsoncontent);

    // Request api
    http.get(url + path + '?loginName='+loginName+'&brandName=' + brandName + "&serviceTypeId="+ serviceTypeId + "&content=" + strContent + '&Sign='+sign, (resp) => {
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


// Get status sms
lib.getStatus = function(callback) {
    var createDate = '20190104';
    var smsGuid = '447CF3B8-4A14-5C2A-AED5-F307A888EF7D';
    var path = 'GetSmsStatus';
    var sign = helpers.md5(loginName + '-' + helpers.md5(passWord) + '-' + smsGuid + '-' + serviceTypeId + '-' + createDate);

    // Request api
    http.get(url + path + '?loginName='+loginName+'&smsGuid='+ smsGuid +'&serviceTypeId='+serviceTypeId+'&createdDate='+createDate+'&Sign='+sign, (resp) => {
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