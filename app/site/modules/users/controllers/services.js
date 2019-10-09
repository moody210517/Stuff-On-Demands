var app = angular.module('handyforall.authentication');
app.factory('AuthenticationService', AuthenticationService);
AuthenticationService.$inject = ['$http', '$cookieStore', '$rootScope', 'toastr', '$q', '$cookies', 'Upload', 'socket', 'notify'];

function AuthenticationService($http, $cookieStore, $rootScope, toastr, $q, $cookies, Upload, socket, notify) {

    var service = {};

    service.taskerLogin = function (data, callback) {

        var deferred = $q.defer();
        $http({
            method: 'post',
            url: '/site/taskerlogin',
            data: data
        }).then(function (response) {
            deferred.resolve(response.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    service.userLogin = function (username, password, callback) {
        $http.post('/site', { username: username, password: password })
            .then(function (response) {
                callback(response.data);
            }, function (err) {
                toastr.error('login error', 'Error');
            });
    };

    service.facebookuser = function (facebookdata) {
        var deferred = $q.defer();
        $http({
            method: 'post',
            url: '/site/users/facebooksiteregister',
            data: { facebookdata: facebookdata }
        }).then(function (response) {
            deferred.resolve(response.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    service.checkreferal = function (referalcode) {
        var deferred = $q.defer();
        $http({
            method: 'post',
            url: '/site/users/checkreferal',
            data: { referalcode: referalcode }
        }).then(function (response) {

            deferred.resolve(response.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    service.checkemail = function (email) {
        var deferred = $q.defer();
        $http({
            method: 'post',
            url: '/site/users/checkemail',
            data: { email: email }
        }).then(function (response) {
            deferred.resolve(response.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    service.currentmsgcount = function (data) {
        var deferred = $q.defer();
        $http({
            method: 'post',
            url: '/site/chat/msgcount',
            data: data
        }).then(function (response) {
            deferred.resolve(response.data.count);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    service.unreadmsg = function (data) {
        var deferred = $q.defer();
        $http({
            method: 'Post',
            url: '/site/chat/unreadmsg',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });

        return deferred.promise;
    };

    service.BecomeTaskerRegister = function (value, callback) {
        value.files = [];
        if (value.taskerfile.length > 0) {
            for (var i = 0; i < value.taskerfile.length; i++) {
                delete value.taskerfile[i].$$hashKey;
                value.files.push(value.taskerfile[i]);
            }
        }
        $http({
            method: 'post',
            url: '/site/users/taskerRegister',
            data: value
        }).then(function (response) {
            callback(null, response.data);
        }, function (err) {
            callback(err, null);
        });
    };

    service.facebook = function () {

        var deferred = $q.defer();
        $http({
            method: 'get',
            url: '/auth/facebook'
        }).then(function (data) {
            deferred.resolve(data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    service.getMyLastName = function () {
        var deferred = $q.defer();
        FB.api('/me', {
            fields: 'last_name'
        }, function (response) {
            if (!response || response.data.error) {
                deferred.reject('Error occured');
            } else {
                deferred.resolve(response.data);
            }
        });
        return deferred.promise;
    }

    service.Logout = function logout(currentuser) {
        var deferred = $q.defer();
        $http({
            method: 'Post',
            url: '/site-logout',
            data: currentuser
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    // service.checkEmail = function (email) {
    //     var deferred = $q.defer();
    //     $http({
    //         method: 'Post',
    //         url: '/site/users/checkEmail',
    //         data: {
    //             'email': email
    //         }
    //     }).success(function (data) {
    //         deferred.resolve(data);
    //     }).error(function (err) {
    //         deferred.reject(err);
    //     });
    //     return deferred.promise;
    // };

    service.checktaskeremail = function (email) {
        var deferred = $q.defer();
        $http({
            method: 'Post',
            url: '/site/users/checktaskeremail',
            data: {
                'email': email
            }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    service.SetCredentials = function (user_name, user_id, token, user_type, tasker_status, vstatus, avatar) {
        var authdata = token;
        $rootScope.siteglobals = {
            currentUser: {
                username: user_name,
                user_id: user_id,
                authdata: authdata,
                user_type: user_type,
                tasker_status: tasker_status,
                verify_status: vstatus,
                avatar: avatar
            }
        };
        console.log($rootScope.siteglobals.currentUser.avatar);

        socket.emit('create room', { user: user_id });
        notify.emit('join network', { user: user_id });
        $http.defaults.headers.common['Authorization'] = authdata;
        $cookieStore.put('siteglobals', $rootScope.siteglobals);
        console.log("eventName", avatar);
        $rootScope.$emit('eventName', { avatar: avatar, count: 0 });
    };

    service.GetCredentials = function () {
        return $rootScope.siteglobals;
    };

    service.isAuthenticated = function () {
        var cookieData = $cookieStore.get('siteglobals');
        var isAuthenticated = false;
        //if (Object.keys($rootScope.siteglobals).length != 0) {
        if (cookieData) {
            isAuthenticated = true;
        }
        return isAuthenticated;
    };
    service.isTaskerAuthenticated = function () {
        var isAuthenticated = false;
        if (Object.keys($rootScope.siteglobals).length != 0 && $rootScope.siteglobals.currentUser.tasker_status == 1) {
            isAuthenticated = true;
        }
        return isAuthenticated;
    };

    service.ClearCredentials = function () {
        $rootScope.siteglobals = {};
        $cookieStore.remove('siteglobals');
        //$http.defaults.headers.common.Authorization = 'Basic ';
        $rootScope.$emit('eventName', { avatar: '', count: 0 });
    };

    service.phonecheck = function (type, phone) {
        var deferred = $q.defer();
        $http({
            method: 'post',
            url: '/site/users/phonecheck',
            data: { type: type, phone: phone }
        }).then(function (response) {
            deferred.resolve(response.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    service.taskerphone = function (phone) {
        var deferred = $q.defer();
        $http({
            method: 'Post',
            url: '/site/users/taskerphone',
            data: {
                phone: phone
            }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    return service;
}