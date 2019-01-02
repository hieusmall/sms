/**
 *  Create and export configuration variable
 */

// Container for all the environents
var environments = {};


// Staging (default) environment
environments.staging = {
    'httpPort' : 2048,
    'httpsPort' : 2049,
    'envName' : 'staging',
    'hashingSecret' : 'CodeTeamGrown',
    'templateGlobals' : {
        'appName' : 'Sms Tracking',
        'companyName' : 'NotARealCompany, Inc',
        'yearCreated' : '2019',
        'baseUrl' : 'http://localhost:2048/'
    }
};


// Production environment
environments.production = {
    'httpPort' : 3048,
    'httpsPort' : 3049,
    'envName' : 'production',
    'hashingSecret' : 'CodeTeamGrown',
    'templateGlobals' : {
        'appName' : 'Sms Tracking',
        'companyName' : 'NotARealCompany, Inc',
        'yearCreated' : '2019',
        'baseUrl' : 'https://localhost:3048/'
    }
};


// Detwermine which environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environment above,if not, default to staging
var environmentToExport = typeof(environments[currentEnvironment]) == "object" ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;
