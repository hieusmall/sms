/*
     * Frontend Logic for application
     *
     */

// Container for frontend application
var library = {};

// Config
library.config = {
    'sessionToken' : false
};

library.fullLoading = function (condition) {
    if (condition) {
        document.getElementById("full-loading").style.display = 'flex';
    } else {
        document.getElementById("full-loading").style.display = 'none';
    }
};

// AJAX Client (for RESTful API)
library.client = {}

// Interface for making API calls
library.client.request = function(headers,path,method,queryStringObject,payload,callback){

    // Set defaults
    headers = typeof(headers) == 'object' && headers !== null ? headers : {};
    path = typeof(path) == 'string' ? path : '/';
    method = typeof(method) == 'string' && ['POST','GET','PUT','DELETE'].indexOf(method.toUpperCase()) > -1 ? method.toUpperCase() : 'GET';
    queryStringObject = typeof(queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
    payload = typeof(payload) == 'object' && payload !== null ? payload : {};
    callback = typeof(callback) == 'function' ? callback : false;

    // For each query string parameter sent, add it to the path
    var requestUrl = path+'?';
    var counter = 0;
    for(var queryKey in queryStringObject){
        if(queryStringObject.hasOwnProperty(queryKey)){
            counter++;
            // If at least one query string parameter has already been added, preprend new ones with an ampersand
            if(counter > 1){
                requestUrl+='&';
            }
            // Add the key and value
            requestUrl+=queryKey+'='+queryStringObject[queryKey];
        }
    }

    // Form the http request as a JSON type
    var xhr = new XMLHttpRequest();
    xhr.open(method, requestUrl, true);
    xhr.setRequestHeader("Content-type", "application/json");

    // For each header sent, add it to the request
    for(var headerKey in headers){
        if(headers.hasOwnProperty(headerKey)){
            xhr.setRequestHeader(headerKey, headers[headerKey]);
        }
    }

    // If there is a current session token set, add that as a header
    if(library.config.sessionToken){
        xhr.setRequestHeader("token", library.config.sessionToken.id);
    }

    // When the request comes back, handle the response
    xhr.onreadystatechange = function() {
        if(xhr.readyState == XMLHttpRequest.DONE) {
            var statusCode = xhr.status;
            var responseReturned = xhr.responseText;

            // Callback if requested
            if(callback){
                try{
                    var parsedResponse = JSON.parse(responseReturned);
                    callback(statusCode,parsedResponse);
                } catch(e){
                    callback(statusCode,false);
                }

            }
        }
    }

    // Send the payload as JSON
    var payloadString = JSON.stringify(payload);
    xhr.send(payloadString);
};
// Get the session token from localStorage and set it in the app.config object
library.getSessionToken = function(){
    var tokenString = localStorage.getItem('token');
    var args = ["/login","/signup"];
    if(typeof(tokenString) == 'string' && tokenString !== 'false'){
        if (!args.includes(window.location.pathname)) {
            try{
                var token = JSON.parse(tokenString);
                library.config.sessionToken = token;
                if(typeof(token) == 'object'){
                    library.setLoggedInClass(true);
                } else {
                    library.setLoggedInClass(false);
                }
            }catch(e){
                library.config.sessionToken = false;
                library.setLoggedInClass(false);
            }
        } else {
            window.location = '';
        }
    } else /*(tokenString == null &&  !args.includes(window.location.pathname))*/ {
        if (!args.includes(window.location.pathname)) {
            window.location = 'login';
        }
    }
};

// Set (or remove) the loggedIn class from the body
library.setLoggedInClass = function(add){
    var target = document.querySelector("body");
    if(add){
        target.classList.add('loggedIn');
    } else {
        target.classList.remove('loggedIn');
    }
};

// Set the session token in the app.config object as well as localStorage
library.setSessionToken = function(token){
    library.config.sessionToken = token;
    var tokenString = JSON.stringify(token);
    localStorage.setItem('token',tokenString);
    if(typeof(token) == 'object'){
        library.setLoggedInClass(true);
    } else {
        library.setLoggedInClass(false);
    }
};

// Renew the token
library.renewToken = function(callback){
    var currentToken = typeof(library.config.sessionToken) == 'object' ? library.config.sessionToken : false;
    if(currentToken){
        // Update the token with a new expiration
        var payload = {
            'id' : currentToken.id,
            'extend' : true,
        };
        library.client.request(undefined,'api/tokens','PUT',undefined,payload,function(statusCode,responsePayload){
            // Display an error on the form if needed
            if(statusCode == 200){
                // Get the new token details
                var queryStringObject = {'id' : currentToken.id};
                library.client.request(undefined,'api/tokens','GET',queryStringObject,undefined,function(statusCode,responsePayload){
                    // Display an error on the form if needed
                    if(statusCode == 200){
                        library.setSessionToken(responsePayload);
                        callback(false);
                    } else {
                        library.setSessionToken(false);
                        callback(true);
                    }
                });
            } else {
                library.setSessionToken(false);
                callback(true);
            }
        });
    } else {
        library.setSessionToken(false);
        callback(true);
    }
};

// Loop to renew token often
library.tokenRenewalLoop = function(){
    setInterval(function(){
        library.renewToken(function(err){
            if(!err){
                console.log("Token renewed successfully @ "+Date.now());
            }
        });
    },1000 * 60 * 30);
};

// Log the user out then redirect them
library.logUserOut = function(redirectUser){
    // Set redirectUser to default to true
    redirectUser = typeof(redirectUser) == 'string' ? redirectUser : true;

    // Get the current token id
    var tokenId = typeof(library.config.sessionToken.id) == 'string' ? library.config.sessionToken.id : false;

    // Send the current token to the tokens endpoint to delete it
    var queryStringObject = {
        'id' : tokenId
    };
    library.client.request(undefined,'api/tokens','DELETE',queryStringObject,undefined,function(statusCode,responsePayload){
        // Set the library.config token as false
        library.setSessionToken(false);

        // Send the user to the logged out page
        if(redirectUser){
            window.location = '/login';
        }

    });
};


// Init (bootstrapping)
library.init = function(){
    // Get the token from localStorage
    library.getSessionToken();
    // Renew token
    library.tokenRenewalLoop();
};
// Call the init processes after the window loads
// window.onload = function(){
//     library.init();
// };
window.onload = function () {
    library.init();
};