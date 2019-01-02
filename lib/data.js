/*
 * Library for storing and editing data
 *
 */

// Dependencies
var fs = require('fs');
var path = require('path');
var helpers = require('./helpers');

// Container for module (to be exported)
var lib = {};

// Base directory of data folder
lib.baseDir = path.join(__dirname,'/../.data/');

// Write data to a file
lib.create = function(dir,file,data,callback){
    // Open the file for writing
    fs.open(lib.baseDir+dir+'/'+file+'.json', 'wx', function(err, fileDescriptor){
        if(!err && fileDescriptor){
            // Convert data to string
            var stringData = JSON.stringify(data);

            // Write to file and close it
            fs.writeFile(fileDescriptor, stringData,function(err){
                if(!err){
                    fs.close(fileDescriptor,function(err){
                        if(!err){
                            callback(false);
                        } else {
                            callback('Error closing new file');
                        }
                    });
                } else {
                    callback('Error writing to new file');
                }
            });
        } else {
            callback('Could not create new file, it may already exist');
        }
    });

};

// Read data from a file
lib.read = function(dir,file,callback){
    fs.readFile(lib.baseDir+dir+'/'+file+'.json', 'utf8', function(err,data){
        if(!err && data){
            var parsedData = helpers.parseJsonToObject(data);
            callback(false,parsedData);
        } else {
            callback(err,data);
        }
    });
};

// Update data in a file
lib.update = function(dir,file,data,callback){

    // Open the file for writing
    fs.open(lib.baseDir+dir+'/'+file+'.json', 'r+', function(err, fileDescriptor){
        if(!err && fileDescriptor){
            // Convert data to string
            var stringData = JSON.stringify(data);

            // Truncate the file
            fs.ftruncate(fileDescriptor,function(err){
                if(!err){
                    // Write to file and close it
                    fs.writeFile(fileDescriptor, stringData,function(err){
                        if(!err){
                            fs.close(fileDescriptor,function(err){
                                if(!err){
                                    callback(false);
                                } else {
                                    callback('Error closing existing file');
                                }
                            });
                        } else {
                            callback('Error writing to existing file');
                        }
                    });
                } else {
                    callback('Error truncating file');
                }
            });
        } else {
            callback('Could not open file for updating, it may not exist yet');
        }
    });

};

// Delete a file
lib.delete = function(dir,file,callback){

    // Unlink the file from the filesystem
    fs.unlink(lib.baseDir+dir+'/'+file+'.json', function(err){
        callback(err);
    });

};

// List all the items in a directory
lib.list = function(dir,callback){
    fs.readdir(lib.baseDir+dir+'/', function(err,data){
        if(!err && data && data.length > 0){
            var trimmedFileNames = [];
            data.forEach(function(fileName){
                trimmedFileNames.push(fileName.replace('.json',''));
            });
            callback(false,trimmedFileNames);
        } else {
            callback(err,data);
        }
    });
};

// Where the data with condition
lib.find = function(dir,objData, callback) {

    // Get the key args
    var keyArgs = typeof(objData) == 'object' && Object.keys(objData).length > 0 ? Object.keys(objData) : [];
    if (keyArgs.length > 0) {
        lib.list(dir, function (err, list) {
            if (!err && list !== undefined && list.length > 0) {
                var result = [],
                    cntr = 0;
                // Foreach the list item ,reading data and push to result
                list.forEach(function (filename) {
                    lib.read(dir,filename, function (err , data) {
                        if (!err && data) {
                            // Check the query with data return a boolean
                            var check = ObjExistInObject(objData, data);
                            if (check === true) {
                                result.push(data);
                            }
                        }
                        ++cntr;
                        // End the foreach
                        if (cntr === list.length) {
                            // see if we're done processing all the results
                            resultQuery(result);
                        }
                    });
                });
            } else {
                callback({"Error" : "Nothing in here"});
            }
        });
    } else {
        callback({"Error" : "Missing key to query"});
    }

    // Checks Obj with dataObj
    /**
     * Check object has key and value same with another  object
     * @param obj
     * @param checkObject
     * @returns {boolean}
     * @constructor
     */
    function ObjExistInObject(obj, checkObject) {
        var check = false;
        var args = Object.keys(obj);
        // Check the same value
        // Foreach the key array
        args.forEach(function (key) {
            var objNeedToCheck = obj[key];
            // TODO : Need to check an object , array
            if (checkObject.hasOwnProperty(key) && checkObject[key] === objNeedToCheck) {
                check = true;
            } else {
                check = false;
            }
        });
        return check;
    }

    /**
     * callback the args results
     * @param args
     */
    function resultQuery(args) {
        if (args.length > 0) {
            callback(false ,args);
        } else {
            callback({"Error" : "Notfind any thing"});
        }
    }
};


// Export the module
module.exports = lib;
