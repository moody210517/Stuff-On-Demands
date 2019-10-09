'use strict';

angular.module('Authentication').factory('AuthenticationService', ['$http', '$cookieStore', '$rootScope', '$timeout', '$q' ,'toastr', function ($http, $cookieStore, $rootScope, $timeout, $q, toastr) {
    var service = {};
    service.Login = function (username, password, callback) {
        $http.post('/admin', { username: username, password: password })
            .success(function (response) {
			
			console.log("response",response)
			
                callback(response);
            }).error(function (err) {
                toastr.error('login error');
            });
    };

    service.Logout = function logout() {
        var deferred = $q.defer();
        $http({
            method: 'get',
            url: '/admin-logout'
        }).success(function (data) {
            deferred.resolve(data);
        }).error(function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    service.SetCredentials = function (username, password, token) {
        var authdata = token;
        $rootScope.globals = {
            currentUser: {
                username: username,
                authdata: authdata
            }
        };
        $http.defaults.headers.common['Authorization'] = authdata;
        $cookieStore.put('globals', $rootScope.globals);
        window.localStorage.setItem('globals2', JSON.stringify($rootScope.globals) )
    };

    service.GetCredentials = function () {
        return $rootScope.globals;
    };

    service.ClearCredentials = function () {
        $rootScope.globals = {};
        $cookieStore.remove('globals');
        window.localStorage.removeItem('globals2');
        //$http.defaults.headers.common.Authorization = 'Basic ';
    };

    return service;
}])
