var app = angular.module('handyforall.authentication');
app.factory('ForgotpasswordService', ForgotpasswordService);
function ForgotpasswordService($http, $q) {
    var ForgotpasswordService = {
        saveUserInfo: saveUserInfo,
        mailverification:mailverification,
        saveUsermailpwd:saveUsermailpwd
    };

    return ForgotpasswordService;
    
    function saveUserInfo(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/saveforgotpasswordinfo',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function mailverification(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/mobile/mailverification',
            data: { 'data': data }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

        function saveUsermailpwd(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/forgotpwdmailuser',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }
}




var app = angular.module('handyforall.authentication');
app.factory('ForgotpwduserService', ForgotpwduserService);
function ForgotpwduserService($http, $q) {
    var ForgotpwduserService = {
        otpsave:otpsave,
        resendotp:resendotp,
        getuserdata:getuserdata,
        activateUserAccount:activateUserAccount
    };
    return ForgotpwduserService;

    function otpsave(data) {
        console.log("ddaattaa",data)
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/otpsave',
            data:  data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }


    function resendotp(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/resendotp',
            data: { 'data': data }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }


        function getuserdata(data) {
          console.log(data);
            var deferred = $q.defer();
            $http({
                method: 'POST',
                url: '/site/getuserdata',
                data:  {data:data}
            }).then(function (data) {
                deferred.resolve(data.data);
            }, function (err) {
                deferred.reject(err);
            });
            return deferred.promise;
        }

        function activateUserAccount(data) {
          console.log(data);
            var deferred = $q.defer();
            $http({
                method: 'POST',
                url: '/site/activateUserAccount',
                data: data
            }).then(function (data) {
                deferred.resolve(data.data);
            }, function (err) {
                deferred.reject(err);
            });
            return deferred.promise;
        }

}