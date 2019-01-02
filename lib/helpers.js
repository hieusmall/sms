/**
 *  Helpers for various tasks
 *
 * */

// Dependencies
var crypto = require('crypto');
var config = require('./config');
var https = require('https');
var querystring = require('querystring');
var fs = require('fs');
var path = require('path');


// container for all the helpers
var helpers = {};


// Sample for testing that simply returns a number
helpers.getANumber = function() {
    return 1;
};


// Create a SHA256 hash
helpers.hash = function(str) {
    if (typeof(str) == 'string' && str.length > 0) {
        var hash = crypto.createHmac('sha256',config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

// Parse a Json string to an object in all cases without throwing
helpers.parseJsonToObject = function(str) {
    try {
        var obj = JSON.parse(str);
        return obj;
    }catch(e){
        return {};
    }
};


helpers.createRandomString = function(strLength) {
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if (strLength) {
        // Define all the possible character that could go into a string
        var possibleCharacters = 'qwertyuiopasdfghjklzxcvbnm0123456789';

        // Start the final string
        var str = '';
        for (i = 1;i <= strLength; i++) {
            // Get a random character from the possibleCharacters string
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            // Append this characters to the final string
            str += randomCharacter;
        }

        // Return the final string
        return str;
    } else {
        return false;
    }
};


// Send an SMS message via Twilio
helpers.sendTwilioSms = function(phone,msg,callback) {
    // validate parameter

    phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false ;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false ;
    if (phone && msg) {
        // Configure the request payload
        var payload = {
            'From' : config.twilio.fromPhone,
            'To' : "+84"+phone,
            'Body' : msg
        };

        // Stringify the payload
        var stringPayload = querystring.stringify(payload);

        // configure the request details
        var requestDetails = {
            'protocol' : 'https:',
            'hostname' : 'api.twilio.com',
            'method' : 'POST',
            'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'Messages.json',
            'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
            'headers' : {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Length' : Buffer.byteLength(stringPayload)
            }
        }

        // Instantinate the request object
        var req = https.request(requestDetails, function (res) {
            // Grab the status of the sent request
            var status = res.statusCode;

            // Callback successfully if the request went through
            if  (status == 200 || status == 201) {
                callback(false);
            } else {
                callback("Status code returned was "+status);
            }
        });

        // Bind to the error event so it doesnt get thrown
        req.on('error', function (e) {
            callback(e);
        });

        // Add the payload
        req.write(stringPayload);

        // End the request
        req.end();
    } else {
        callback('Given parameter were missing or invalid');
    }
};


// Get the string content a template
helpers.getTemplate = function(templateName,data,callback){
    templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
    data = typeof(data) == 'object' && data !== null ? data : {};
    if(templateName){
        var templatesDir = path.join(__dirname,'/../templates/');
        fs.readFile(templatesDir+templateName+'.html', 'utf8', function(err,str){
            if(!err && str && str.length > 0){
                // Do interpolation on the string
                var finalString = helpers.interpolate(str,data);
                callback(false,finalString);
            } else {
                callback('No template could be found');
            }
        });
    } else {
        callback('A valid template name was not specified');
    }
};


// Add the universal header and footer to a string , and pass provided data object to the header and footer
helpers.addUniversalTemplates = function(str, data, callback) {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data !== null ? data : {} ;

    //Get the header
    helpers.getTemplate('_header', data, function (err, headerString) {
        if (!err && headerString) {
            // Get the footer
            helpers.getTemplate('_footer', data, function (err, footerString) {
                if (!err && footerString) {
                    // Add them all together
                    var fullString = headerString + str + footerString;
                    callback(false, fullString);
                } else {
                    callback("Could not find the footer template");
                }
            });
        } else {
            callback("Could not find the header template");
        }
    });
}


// take a given string a data object and find/replace all the keys withing it
helpers.interpolate = function(str, data) {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data !== null ? data : {};

    // Add the templateGlobals do the data object, prepending their key name with "global
    for (var keyName in config.templateGlobals) {
        if (config.templateGlobals.hasOwnProperty(keyName)) {
            data['global.' + keyName] = config.templateGlobals[keyName];
        }
    }

    // For each key in the data object , insert its value into the string at the corresponding placeholder
    for(var key in data) {
        if (data.hasOwnProperty(key) && typeof(data[key]) == 'string') {
            var replace = data[key];
            var find = '{'+ key +'}';
            str = str.replace(find, replace);
        }
    }

    return str;
};


// Get the contents of a static ( public ) asset
helpers.getStaticAsset = function(fileName, callback) {
    fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;
    if (fileName) {
        var publicDir = path.join(__dirname, '/../public/');
        fs.readFile(publicDir+fileName, function (err, data) {
            if (!err && data) {
                callback(false, data);
            } else {
                callback("No file could be found");
            }
        });
    } else {
        callback('A valid file name was not specified');
    }
};

// Export the module
module.exports = helpers;