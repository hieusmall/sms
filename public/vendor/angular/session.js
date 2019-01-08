/**
 * Logic for frontend register Page
 */

var app = angular.module('sessionHandlers', ['ngMaterial', 'ngMessages']);

/**
 * SignUp
 */
app.factory("signUpHTTP", ["$http", function ($http) {
    return {
        firstToken : function(username, password) {
            // Take the phone and password, and use it to log the user in
            var newToken = {
                'username' : username,
                'password' : password
            };
            return $http.post("/api/tokens", newToken);
        },
        create: function (userData) {
            return $http.post("/api/users", userData);
        }
    }
}]);
app.controller("SignUpCtrl", ['$scope' ,'signUpHTTP', function ($scope, signUpHTTP) {
    $scope.loading = false;
    $scope.logoUrl = "public/logo.png";
    $scope.formData = {};
    $scope.user = {};
    $scope.config = {
        sessionToken : false
    };

    $scope.createUser = function (e) {
        e.preventDefault();
        $scope.loading = true;

        // console.log($scope.formData);

        var user = {
            username : $scope.formData.username,
            email : $scope.formData.email,
            phone: $scope.formData.phone,
            password : $scope.formData.password
        };

        signUpHTTP.create(user).then(function (response) {
            signUpHTTP.firstToken(user.username, user.password).then(function (response) {

                // Set A new Token
                $scope.config.sessionToken = response.data;
                var tokenString = JSON.stringify(response.data);
                localStorage.setItem('token',tokenString);

                // Redirect to dashboard
                window.location = '/';

            }, function (error) {
                console.log({"Create Token" : error});
            });

            $scope.loading = false;
        }, function (error) {
            console.log({"Create" : error});
        });

        //
        // $scope.formData.username = "";
        // $scope.formData.email = "";
        // $scope.formData.phone = "";
        // $scope.formData.password = "";

        $scope.loading = false;
    };

}])

/**
 * Login
 */
app.controller("LoginCtrl", ['$scope' , '$http', function ($scope, $http) {
    $scope.loading = false;
    $scope.fullLoading = function (condition) {
        if (condition) {
            document.getElementById("full-loading").style.display = "none";
        } else {
            document.getElementById("full-loading").style.display = "flex";
        }
    };
    // $scope.fullLoading(true);
    $scope.logoUrl = "public/logo.png";
    $scope.formData = {};
    $scope.user = {};
    $scope.config = {
        sessionToken : false
    };

    $scope.createSession = function (e) {
        e.preventDefault();
        $scope.loading = true;

        var userData = {
            username : $scope.formData.username,
            password : $scope.formData.password
        };

        $http.post("/api/tokens", userData).then(function (response) {
            // Set A new Token
            $scope.config.sessionToken = response.data;
            var tokenString = JSON.stringify(response.data);
            localStorage.setItem('token',tokenString);

            // Redirect to dashboard
            window.location = '/';

            $scope.loading = false;
        }, function (error) {
            console.log({"Create" : error});
            window.location = '/login';
        });


        //
        // $scope.formData.username = "";
        // $scope.formData.email = "";
        // $scope.formData.phone = "";
        // $scope.formData.password = "";

        $scope.loading = false;
    };

}])