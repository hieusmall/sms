/*
 * Request Handlers
 *
 */

// Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');
var dns = require('dns');
var _url = require('url');
var _performance = require('perf_hooks').performance;
var util = require('util');
var debug = util.debuglog('performance');


// Define all the handlers
var handlers = {};


/*
 * HTML Handlers
 *
 */
// Favicon
handlers.favicon = function(data,callback){
    // Reject any request that isn't a GET
    if(data.method == 'get'){
        // Read in the favicon's data
        helpers.getStaticAsset('favicon.ico',function(err,data){
            if(!err && data){
                // Callback the data
                callback(200,data,'favicon');
            } else {
                callback(500);
            }
        });
    } else {
        callback(405);
    }
};


// Public assets
handlers.public = function(data,callback){
    // Reject any request that isn't a GET
    if(data.method == 'get'){
        // Get the filename being requested
        var trimmedAssetName = data.trimmedPath.replace('public/','').trim();
        if(trimmedAssetName.length > 0){
            // Read in the asset's data
            helpers.getStaticAsset(trimmedAssetName,function(err,data){
                if(!err && data){

                    // Determine the content type (default to plain text)
                    var contentType = 'plain';

                    if(trimmedAssetName.indexOf('.css') > -1){
                        contentType = 'css';
                    }

                    if(trimmedAssetName.indexOf('.png') > -1){
                        contentType = 'png';
                    }

                    if(trimmedAssetName.indexOf('.jpg') > -1){
                        contentType = 'jpg';
                    }

                    if(trimmedAssetName.indexOf('.ico') > -1){
                        contentType = 'favicon';
                    }

                    // Callback the data
                    callback(200,data,contentType);
                } else {
                    callback(404);
                }
            });
        } else {
            callback(404);
        }

    } else {
        callback(405);
    }
};


/*
 * JSON API Handlers
 *
 */
// Ping
handlers.ping = function(data,callback){
    callback(200);
};

// Error example (this is why we're wrapping the handler caller in a try catch)
handlers.exampleError = function(data,callback){
    var err = new Error('This is an example error.');
    throw(err);
};


// Users
handlers.users = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data,callback);
    } else {
        callback(405);
    }
};


handlers._users = {};


// Users - post
// Required data: firstName, lastName, phone, email , password
// Optional data: none
handlers._users.post = function(data, callback) {
    // Check that all required fields are filled out
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var email = typeof (data.payload.email) == 'string' && 0 < data.payload.email.trim().length <= 100 ? data.payload.email.trim() : false ;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (firstName && lastName && phone && email && password) {
        // Get an id
        var uid = helpers.createRandomString(15);

        // Hash the password
        var hashedPassword = helpers.hash(password);

        // Create the user object
        if(hashedPassword){
            var userObject = {
                'id' : uid,
                'firstName' : firstName,
                'lastName' : lastName,
                'phone' : phone,
                'email' : email,
                'hashedPassword' : hashedPassword,
                'created_at' : new Date(Date.now()),
                'updated_at' : new Date(Date.now())
            };

            // Make sure the user doesnt already exist
            // Checks the unique data
            _data.find("users", {email : userObject.email}, function (err) {
                if (err) {
                    _data.find("users", {phone : userObject.phone}, function (err) {
                        if (err) {
                            // Store the user
                            _data.create('users',uid,userObject,function(err){
                                if(!err){
                                    callback(200);
                                } else {
                                    callback(500,{'Error' : 'Could not create the new user'});
                                }
                            });
                        } else {
                            callback(400, {'Error ' : 'Phone has exist'});
                        }
                    })
                } else {
                    callback(400,{'Error' : 'Email has exist'});
                }
            });
        } else {
            callback(500,{'Error' : 'Could not hash the user\'s password.'});
        }
    } else {
        callback(400,{'Error' : 'Missing required fields'});
    }
};


// Required data: id
// Optional data: id
handlers._users.get = function(data,callback){
    // Check that phone number is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 15 ? data.queryStringObject.id.trim() : false;

    if(id){
        // Get token from headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token,id,function(tokenIsValid){
            if(tokenIsValid){
                // Lookup the user
                _data.read('users',id,function(err,data){
                    if(!err && data){
                        // Remove the hashed password from the user user object before returning it to the requester
                        delete data.hashedPassword;
                        callback(200,data);
                    } else {
                        callback(404);
                    }
                });
            } else {
                callback(403,{"Error" : "Missing required token in header, or token is invalid."})
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required field'})
    }
};


// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = function(data,callback){
    // Check for required field
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 15 ? data.payload.id.trim() : false;

    // Check for optional fields
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false ;
    var email = typeof (data.payload.email) == 'string' && 0 < data.payload.email.trim().length <= 100 ? data.payload.email.trim() : false ;

    // Error if id is invalid
    if(id){
        // Error if nothing is sent to update
        if(firstName || phone || email || lastName || password){

            // Get token from headers
            var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

            // Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token,id,function(tokenIsValid){
                if(tokenIsValid){

                    // Lookup the user
                    _data.read('users',id,function(err,userData){
                        if(!err && userData){
                            // Update the fields if necessary
                            if(firstName){
                                userData.firstName = firstName;
                            }
                            if(lastName){
                                userData.lastName = lastName;
                            }
                            if (phone) {
                                userData.phone = phone;
                            }
                            if (email) {
                                userData.email = email;
                            }
                            if(password){
                                userData.hashedPassword = helpers.hash(password);
                            }
                            userData.updated_at = new Date(Date.now());

                            _data.find('users', {phone: phone}, function (err) {
                                if (err) {
                                    _data.find('users', {email : email}, function (err) {
                                        if (err) {
                                            // Store the new updates
                                            _data.update('users',id,userData,function(err){
                                                if(!err){
                                                    callback(200);
                                                } else {
                                                    callback(500,{'Error' : 'Could not update the user.'});
                                                }
                                            });
                                        } else {
                                            callback(400,{'Error' : 'Email maybe has exist.'});
                                        }
                                    })
                                }  else {
                                    callback(400,{'Error' : 'Phone maybe has exist.'});
                                }
                            });
                        } else {
                            callback(400,{'Error' : 'Specified user does not exist.'});
                        }
                    });
                } else {
                    callback(403,{"Error" : "Missing required token in header, or token is invalid."});
                }
            });
        } else {
            callback(400,{'Error' : 'Missing fields to update.'});
        }
    } else {
        callback(400,{'Error' : 'Missing required field.'});
    }

};


// Required data: phone
// Cleanup old checks associated with the user
handlers._users.delete = function(data,callback){
    // Check that phone number is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 15 ? data.queryStringObject.id.trim() : false;
    if(id){
        // Get token from headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token,id,function(tokenIsValid){
            if(tokenIsValid){
                // Lookup the user
                _data.read('users',id,function(err,userData){
                    if(!err && userData){
                        // Delete the user's data
                        _data.delete('users',id,function(err){
                            if(!err){
                                callback(200);
                            } else {
                                callback(500,{'Error' : 'Could not delete the specified user'});
                            }
                        });
                    } else {
                        callback(400,{'Error' : 'Could not find the specified user.'});
                    }
                });
            } else {
                callback(403,{"Error" : "Missing required token in header, or token is invalid."});
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required field'})
    }
};


// Auth User
// Get current user
handlers._users.currentUser = function(tokenId, callback) {
    // Check the tokens exist and get the uid
    if (tokenId) {
        _data.read("tokens", tokenId, function (err, tokenData) {
            if (!err && tokenData) {
                handlers._tokens.verifyToken(tokenId, tokenData.uid, function (tokenIsValid) {
                    if (tokenIsValid) {
                        _data.read("users", tokenData.uid, function (err, userData) {
                            if  (!err && userData) {
                                delete userData.hashedPassword;
                                callback(false, userData);
                            } else {
                                callback({"Error : " : "Cannot find this user"});
                            }
                        })
                    } else {
                        callback({"Error :" : "Token is expire"});
                    }
                });
            }  else {
                callback({"Error : " : "Missing token"});
            }
        });
    }
};


// Tokens
handlers.tokens = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method](data,callback);
    } else {
        callback(405);
    }
};


// Container for all the tokens methods
handlers._tokens  = {};


// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function(data,callback){
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(phone && password){
        // Lookup the user who matches that phone number
        _data.find("users", {phone : phone}, function (err, result) {
            var userData = result[0];
            if(!err && userData){
                // Hash the sent password, and compare it to the password stored in the user object
                var hashedPassword = helpers.hash(password);
                if(hashedPassword == userData.hashedPassword){
                    // If valid, create a new token with a random name. Set an expiration date 1 hour in the future.

                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;
                    var tokenObject = {
                        'uid' : userData.id,
                        'id' : tokenId,
                        'expires' : expires,
                        'begin' : new Date(Date.now())
                    };

                    // Store the token
                    _data.create('tokens',tokenId,tokenObject,function(err){
                        if(!err){
                            callback(200,tokenObject);
                        } else {
                            callback(500,{'Error' : 'Could not create the new token'});
                        }
                    });
                } else {
                    callback(400,{'Error' : 'Password did not match the specified user\'s stored password'});
                }
            } else {
                callback(400,{'Error' : 'Could not find the specified user.'});
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required field(s).'})
    }
};


// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function(data,callback){
    // Check that id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        // Lookup the token
        _data.read('tokens',id,function(err,tokenData){
            if(!err && tokenData){
                callback(200,tokenData);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required field, or field invalid'})
    }
};


// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function(data,callback){
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if(id && extend){
        // Lookup the existing token
        _data.read('tokens',id,function(err,tokenData){
            if(!err && tokenData){
                // Check to make sure the token isn't already expired
                if(tokenData.expires > Date.now()){
                    // Set the expiration an hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    // Store the new updates
                    _data.update('tokens',id,tokenData,function(err){
                        if(!err){
                            callback(200);
                        } else {
                            callback(500,{'Error' : 'Could not update the token\'s expiration.'});
                        }
                    });
                } else {
                    callback(400,{"Error" : "The token has already expired, and cannot be extended."});
                }
            } else {
                callback(400,{'Error' : 'Specified user does not exist.'});
            }
        });
    } else {
        callback(400,{"Error": "Missing required field(s) or field(s) are invalid."});
    }
};


// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function(data,callback){
    // Check that id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        // Lookup the token
        _data.read('tokens',id,function(err,tokenData){
            if(!err && tokenData){
                // Delete the token
                _data.delete('tokens',id,function(err){
                    if(!err){
                        callback(200);
                    } else {
                        callback(500,{'Error' : 'Could not delete the specified token'});
                    }
                });
            } else {
                callback(400,{'Error' : 'Could not find the specified token.'});
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required field'})
    }
};


// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id,userId,callback){
    // Lookup the token
    _data.read('tokens',id,function(err,tokenData){
        if(!err && tokenData){
            // Check that the token is for the given user and has not expired
            if(tokenData.uid == userId && tokenData.expires > Date.now()){
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};


// Checks Tokens is exist and verify this token
handlers._tokens.checkToken = function(id) {
    // Look up the token
    _data.read('tokens',id, function (err, tokenData) {
        // Read the users by token.uid
        handlers._tokens.verifyToken(id, tokenData.uid, function (tokenIsValid) {
            if (tokenIsValid) {
                return true;
            } else {
                return false;
            }
        });
    })
};


// Customers
handlers.customers = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._customers[data.method](data,callback);
    } else {
        callback(405);
    }
};


// Container for all the customers methods
handlers._customers = {};

// Customers - get
// Required data: id
// Optional data: none
handlers._customers.get = function(data, callback) {
    // Check that phone number is valid
    var id = typeof(data.queryStringObject.id) == "string" && data.queryStringObject.id.trim().length >= 10 ? data.queryStringObject.id.trim() : false;
    var token = typeof (data.headers.token) == "string" && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;

    _data.read("tokens", token, function (err, tokenData) {
        if (!err && tokenData) {
            handlers._tokens.verifyToken(token, tokenData.uid, function (tokenIsValid) {
                if (tokenIsValid) {
                    if (id) {
                        // Lookup the user
                        _data.read('customers',id,function(err,customerData){
                            if(!err && customerData){
                                callback(200, customerData);
                            } else {
                                callback(400, {"Error : " : "Not find any customer"});
                            }
                        });
                    } else {
                        callback(400, {"Error : " : "missing required fields"});
                    }
                } else {
                    callback(500, {"Error : " : "Tokens is invalid"});
                }
            });
        } else {
            callback(500, {"Error : " : "Tokens is invalid"});
        }
    }) ;
};


// Customers - post
// Required data: phone
// Optional data: sex , birthday, email, services , paid,
// Defaults data : created_at , updated_at, level, status
handlers._customers.post = function(data, callback) {
    // Check that all required fields are filled out
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var name = typeof (data.payload.name) == 'string' && data.payload.name.trim().length >= 6 ? data.payload.name.trim() : false;

    // Check optional data
    var email = typeof (data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;
    var services = typeof(data.payload.services) == 'object' && data.payload.services instanceof Array && data.payload.services.length > 0 ? data.payload.services : false;
    var sex = typeof (data.payload.sex) == 'string' && data.payload.sex.trim().length > 0 && ["male","female"].includes(data.payload.sex) ? data.payload.sex : false;

    // check the default data
    var status = 0; // Status of customers
    var level = 0;  // Level of customers
    var paid = 0;   // Moneys customers paid
    var avatar = null;  // Avatar image of customer

    // Get token from headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    _data.read("tokens", token, function (err, tokenData) {
        if (!err && tokenData) {
            // Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token,tokenData.uid,function(tokenIsValid) {
                if (tokenIsValid) {
                    if (name && phone) {
                        var id = helpers.createRandomString(10);

                        // Create the customers object
                        var customerObject = {
                            id : id,
                            phone : phone,
                            name : name,
                            status : status,
                            level : level,
                            paid : paid,
                            avatar : avatar,
                            userId : tokenData.uid,
                            created_at : new Date(Date.now()),
                            updated_at : new Date(Date.now())
                        };

                        // Check the default data
                        if (email) {
                            customerObject.email = email;
                        }
                        if (services) {
                            customerObject.services = services ;
                        }
                        if (sex) {
                            customerObject.sex = sex;
                        }

                        // Make sure the customers doesnt already exist
                        // Checks the unique data
                        _data.find("customers", {email : customerObject.email}, function (err) {
                            if (!err) {
                                callback(400, {'Error' : 'Email has exist'});
                            } else {
                                _data.find("customers", {phone: customerObject.phone}, function (err) {
                                    if (!err) {
                                        callback(400, {'Error' : 'Phone number has exist'});
                                    } else {
                                        // Store the customers
                                        _data.create('customers',id ,customerObject,function(err){
                                            if(!err){
                                                callback(200, customerObject);
                                            } else {
                                                callback(500, {'Error' : 'Could not create the new customers', data : data.payload});
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    } else {
                        callback(400, {"Error" : "Missing required field", data : data.payload});
                    }
                } else {
                    callback(400, {"Error : " : "Tokens is invalid"});
                }
            });
        } else {
            callback(400, {"Error : " : "Tokens is invalid"});
        }
    });
};


// Customers - put
// required data : id
handlers._customers.put = function(data, callback) {
    var id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length >= 10 ? data.payload.id.trim() : false;
    var token = typeof (data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token : false;

    // Check all optional fields
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var name = typeof (data.payload.name) == 'string' && data.payload.name.trim().length >= 6 ? data.payload.name.trim() : false;
    var email = typeof (data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;
    var services = typeof(data.payload.services) == 'object' && data.payload.services instanceof Array && data.payload.services.length > 0 ? data.payload.services : false;
    var sex = typeof (data.payload.sex) == 'string' && data.payload.sex.trim().length > 0 && ["male","female"].includes(data.payload.sex) ? data.payload.sex : false;
    var status = typeof(data.payload.status) == 'number' && data.payload.status > 0 ? data.payload.status : false; // Status of customers
    var level = typeof(data.payload.level) == 'number' && data.payload.level > 0 ? data.payload.level : false;
    var paid = typeof(data.payload.paid) == 'number' && data.payload.paid > 0 ? data.payload.paid : false;
    var avatar = typeof (data.payload.avatar) == 'string' && data.payload.avatar.trim().length > 0 ? data.payload.avatar.trim() : false;

    // Check the tokens
    _data.read("tokens", token, function (err, tokenData) {
        if (!err && tokenData) {
            handlers._tokens.verifyToken(token, tokenData.uid, function (tokenIsValid) {
                if (tokenIsValid) {
                    // Check the id of customer
                    if (id) {
                        // Error if nothing is sent to update
                        if(email || name || phone || services || sex || status || level || paid || avatar) {
                            // Lookup the user
                            _data.read('customers',id,function(err,customerData){
                                if(!err && customerData){
                                    // Update the fields if necessary
                                    if(email)
                                        customerData.email = email;
                                    if(phone)
                                        customerData.phone = phone;
                                    if(services)
                                        customerData.services = services;
                                    if(sex)
                                        customerData.sex = sex;
                                    if (status)
                                        customerData.status = status;
                                    if (level)
                                        customerData.level = level;
                                    if (paid)
                                        customerData.paid = paid;
                                    if (avatar)
                                        customerData.avatar = avatar;

                                    // Update the time
                                    customerData.updated_at = new Date(Date.now());
                                    // Checks the unique data
                                    _data.find("customers",{phone : phone}, function (err) {
                                        if (!err) {
                                            callback(400, {'Error' : 'Phone has exist.'});
                                        } else {
                                            _data.find("customers",{email : email}, function (err) {
                                                if (!err) {
                                                    callback(400, {'Error' : 'Email has exist.'});
                                                } else {
                                                    // Store the new updates
                                                    _data.update('customers',id,customerData,function(err){
                                                        if(!err){
                                                            callback(200, customerData);
                                                        } else {
                                                            callback(500, {'Error' : 'Could not update the customer.'});
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                } else {
                                    callback(400,{"Error : " : "Not find any customer"});
                                }
                            });
                        } else {
                            callback(400, {'Error' : 'Missing fields to update.'});
                        }
                    } else {
                        callback(400, {"Error : " : "missing required fields"});
                    }
                } else {
                    callback(500, "Token is invalid");
                }
            })
        }  else {
            callback(500, "Token is invalid");
        }
    });
};


// Customers - delete
// Required data : id
handlers._customers.delete = function(data, callback) {
    var id = typeof (data.queryStringObject.id) == "string" && data.queryStringObject.id.trim().length >= 10 ? data.queryStringObject.id.trim() : false ;
    var token = typeof (data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token : false;

    // Check the tokens
    _data.read("tokens", token, function (err, tokenData) {
        if (!err && tokenData) {
            handlers._tokens.verifyToken(token, tokenData.uid, function (tokenIsValild) {
                if (tokenIsValild) {
                    // Check the id customers
                    if (id) {
                        // Lookup the token
                        _data.read('customers',id,function(err,tokenData){
                            if(!err && tokenData){
                                // Delete the token
                                _data.delete('customers',id,function(err){
                                    if(!err){
                                        callback(200);
                                    } else {
                                        callback(500,{'Error' : 'Could not delete the specified customer'});
                                    }
                                });
                            } else {
                                callback(400,{'Error' : 'Could not find the specified customer.'});
                            }
                        });
                    } else {
                        callback(400, {"Error :" : "Missing required fields "});
                    }
                } else {
                    callback(400, {"Error : " : "Token has expire"});
                }
            })
        } else {
            callback(500, {"Error : " : "Token is invalid"});
        }
    });
};


// SMS
handlers.sms = function(data, callback) {
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        var token = typeof (data.headers.token) == "string" && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;

        // Check the Current Users
        handlers._users.currentUser(token, function (err, userData) {
            if (!err && userData) {
                // Check the temlate Params sms
                var acceptableSmsType = ['tracking'];
                var smstype = typeof (data.headers.smstype) == 'string' && data.headers.smstype.trim().length > 0 && acceptableSmsType.indexOf(data.headers.smstype) > -1 ? data.headers.smstype.trim() : false;

                data.currentUser = userData;
                if (smstype === acceptableSmsType[0]) {
                    handlers.smsTracking(data, callback);
                } else {
                    handlers._sms[data.method](data,callback);
                }
            } else {
                callback(400, {"Error : " : "Cannot get current users"});
            }
        });


    } else {
        callback(405);
    }
};


// Container all the sms
handlers._sms = {};


// SMS - post
handlers._sms.post = function(data, callback) {
    var token = typeof (data.headers.token) && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false ;

    // Check the tokens is valid
    _data.read("tokens", token,function (err, tokenData) {
        if (err && tokenData) {
            handlers.verifyToken(token, tokenData.uid, function (tokenIsValid) {
                if (tokenIsValid) {

                } else {
                    callback(500, {"Error : " : "Token is invalid"});
                }
            })
        } else {
            callback(500, {"Error : " : "Token is invalid"});
        }
    });
};


/**
 * Sms Tracking API
 * @type {{}}
 */
// Container for all the sms tracking function
handlers.smsTracking = function(data, callback) {
    var acceptableParams = ['smsLogs','listCustomers','templateSms'];
    var path = typeof (data.headers.path) == 'string' && data.headers.path.trim().length > 0 && acceptableParams.indexOf(data.headers.path) > -1 ? data.headers.path.trim() : false;
    if (path === 'smsLogs') {
        handlers.smsLogs(data, callback);
    }
    if (path == 'listCustomers') {
        handlers._listCustomers[data.method](data, callback);
    }
    if (path == 'templateSms') {
        handlers._templateSms[data.method](data, callback);
    }
};


// SMS LOGS
handlers.smsLogs = function(data, callback) {
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._smsLogs[data.method](data,callback);
    } else {
        callback(405, {"Error :" : "SmsLogs Not support for this method"});
    }
};


// Container all the sms logs
handlers._smsLogs = {};


// Sms Logs - post
// Required data : content, phoneList
handlers._smsLogs.post = function(data, callback) {
    // Check the required data
    var content = typeof (data.payload.content) == "string" && data.payload.content.trim().length > 0 ?  data.payload.content.trim() : false;
    var phoneList = typeof (data.payload.phoneList) == 'object' && data.payload.phoneList instanceof Array && data.payload.phoneList.length > 0 ? data.payload.phoneList : false;
    var currentUser = typeof (data.currentUser) == 'object' && data.currentUser instanceof Object ? data.currentUser : false;

    // Check the default data
    var isSent = false;

    if (currentUser) {
        if (content && phoneList) {
            // Get an id
            var id = helpers.createRandomString(10);
            var smsLogObject = {
                id : id,
                content : content,
                phoneList : phoneList,
                userId: currentUser.id,
                isSent: isSent,
                created_at : new Date(Date.now()),
                updated_at : new Date(Date.now())
            };

            // Store the sms logs
            _data.create("sms/smsLogs", id, smsLogObject, function (err) {
                if (!err) {
                    callback(200, smsLogObject)
                }else {
                    callback(400, {"Error : " : "Cannot create a sms logs"});
                }
            });
        } else {
            callback(400, {"Error : " : "Missing some required fields"});
        }
    } else {
        callback(400, {"Error : " : "SmsLogs Cannot get current users"})
    }

};


// Sms Logs - get
// Required data : id
handlers._smsLogs.get = function(data, callback) {
    var id = typeof (data.queryStringObject.id) == "string" && data.queryStringObject.id.trim().length >= 10 ? data.queryStringObject.id.trim() : false;
    var currentUser = typeof (data.currentUser) == "object" && data.currentUser instanceof Object && Object.keys(data.currentUser).length > 0 ? data.currentUser : false;
    if  (currentUser) {
        if (id) {
            _data.read("sms/smsLogs", id, function (err, smsLog) {
                if (!err && smsLog) {
                    callback(200, smsLog);
                } else {
                    callback(400, {"Error : " : "Cannot get the sms log"});
                }
            });
        } else {
            callback(400, {"Error : " : "Missing some required field"});
        }
    } else {
        callback(400, {"Error : " : "SmsLogs cannot get the current user"});
    }
};


// Sms Logs - put
// Required data : id
// Optional data : content, phoneList
handlers._smsLogs.put = function(data, callback) {
    var id = typeof (data.payload.id) == "string" && data.payload.id.trim().length >= 10 ? data.payload.id.trim() : false;

    // Check the optional data
    var content = typeof (data.payload.content) == 'string' && data.payload.content.trim().length > 0 ? data.payload.content.trim() : false;
    var phoneList = typeof (data.payload.phoneList) == 'object' && data.payload.phoneList instanceof Array && data.payload.phoneList.length > 0 ? data.payload.phoneList : false;
    var isSent = typeof (data.payload.isSent) == 'boolean' ? data.payload.isSent : false;

    if (id) {
        if (content || phoneList || isSent) {
            // Lookup the token
            _data.read('sms/smsLogs',id,function(err, smsLog){
                if(!err && smsLog){
                    // Check the sms logs is sents
                    if (smsLog.isSent === false) {
                        // Check the optional data
                        if (content) {
                            smsLog.content = content;
                        }
                        if (phoneList) {
                            smsLog.phoneList = phoneList;
                        }
                        if (isSent) {
                            smsLog.isSent = isSent;
                        }

                        _data.update('sms/smsLogs', id, smsLog, function (err) {
                            if (!err) {
                                callback(200, smsLog);
                            } else {
                                callback(400,{'Error' : 'Could not update the specified smsLog.'});
                            }
                        });
                    } else {
                        callback(400,{'Error' : 'Cannot update the specified smsLog.'});
                    }
                } else {
                    callback(400,{'Error' : 'Could not find the specified smsLog.'});
                }
            });
        } else {
            callback(400, {"Error : " : "You need some data to update the smsLogs"});
        }
    } else {
        callback(400,{'Error' : 'Missing some required fields.'});
    }
};


// Sms Logs - delete
// Required data : id
handlers._smsLogs.delete = function(data, callback) {
    var id = typeof (data.queryStringObject.id) == "string" && data.queryStringObject.id.trim().length >= 10 ? data.queryStringObject.id.trim() : false;
    if (id) {
        // Lookup the token
        _data.read('sms/smsLogs',id,function(err,tokenData){
            if(!err && tokenData){
                // Delete the token
                _data.delete('sms/smsLogs',id,function(err){
                    if(!err){
                        callback(200);
                    } else {
                        callback(500,{'Error' : 'Could not delete the specified smsLog'});
                    }
                });
            } else {
                callback(400,{'Error' : 'Could not find the specified smsLog.'});
            }
        });
    } else {
        callback(400,{'Error' : 'Missing some required fields.'});
    }
};


// Not-Found
handlers.notFound = function(data,callback){
    callback(404);
};





// Export the handlers
module.exports = handlers;