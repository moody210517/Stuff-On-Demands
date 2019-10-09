var app = angular.module('handyforall.site');
app.factory('MainService', MainService);

function MainService($http, $q) {
    var mainService = {
        getData: getData,
        getSearchData: getSearchData,
        getCurrentUsers: getCurrentUsers,
        getCurrentTaskers: getCurrentTaskers,
        setCurrentUserValue: setCurrentUserValue,
        getCurrentUserValue: getCurrentUserValue,
        getsubcategory: getsubcategory,
        searchSuggestions: searchSuggestions,
        settings: settings,
        subscription: subscription,
        searchchildSuggestions: searchchildSuggestions,
        getSliderList: getSliderList,
        getLanguage: getLanguage,
        getBgimage: getBgimage,
        gettaskersignupimage: gettaskersignupimage,
        getsetting: getsetting,
        getDefaultLanguage: getDefaultLanguage,
        getSocialNetworks: getSocialNetworks,
        getDefaultCurrency: getDefaultCurrency,
        getCurrency: getCurrency,
        getseosetting: getseosetting,
        getwidgets: getwidgets,
        getNotificationsCount: getNotificationsCount,
        getMainData: getMainData,
        getmorecategory: getmorecategory,
        otpverifications: otpverifications,
        getTransalatePage: getTransalatePage,
        getPage: getPage,
        getTransalatePageNames: getTransalatePageNames,
        getpaymentMethod: getpaymentMethod,
        generateotp: generateotp,
        checkMobileExists: checkMobileExists
    };
    return mainService;

    function getData(config, data) {
        if (data.skip > 1) {
            data.skip = (parseInt(data.skip) - 1) * data.limit;
        } else {
            data.skip = 0;
        }
        var deferred = $q.defer();
        $http({
            method: config.method,
            url: config.url,
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    function getSearchData(config, data) {
        var deferred = $q.defer();
        $http({
            method: config.method,
            url: config.url,
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    function getMainData(username) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/main'
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getCurrentUsers(user) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: 'site/users/currentUser',
            data: {
                'currentUserData': user
            }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getSliderList(limit, skip) {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/slider/list/?limit=' + limit + '&skip=' + skip
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }


    function getCurrentTaskers(userid) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: 'site/users/currentTasker',
            data: {
                'currentUserData': userid
            }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getsubcategory(categoryid) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: 'site/category/getsubcategory',
            data: { categoryid: categoryid }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function setCurrentUserValue(value) {
        console.log('set');
        mainService.currentValue = value;
    }

    function getCurrentUserValue() {
        return mainService.currentValue;
    }

    function searchSuggestions(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/landing/search-suggestions',
            data: { data: data }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function searchchildSuggestions(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/landing/search-childSuggestions',
            data: { data: data }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function subscription(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/landing/subscription',
            data: { email: data }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function settings() {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/settings/general'
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getLanguage() {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/site/landing/getLanguage'
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getBgimage() {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/site/landing/getBgimage'
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function gettaskersignupimage() {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/site/landing/gettaskersignupimage'
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getsetting() {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/site/landing/getsetting'
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getDefaultLanguage(data) {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/site/landing/getDefaultLanguage?name=' + data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getDefaultCurrency(data) {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/site/landing/getDefaultCurrency?name=' + data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getCurrency() {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/site/landing/getCurrency'
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getseosetting() {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/site/landing/getseosetting'
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getwidgets() {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/site/landing/getwidgets'
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getSocialNetworks() {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/site/landing/getSocialNetworks'
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getNotificationsCount(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/notifications/count',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data.count);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getmorecategory(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/landing/getmorecategory',
            data: { data: data }
        }).then(function (data) {
            // console.log("data", data)
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }



    function otpverifications(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/otpverifications',
            data: { data: data }
        }).then(function (data) {
            // console.log("data", data)
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getTransalatePage(pageId, languagename) {
        var deferred = $q.defer();
        var data = {};
        data.page = pageId;
        data.language = languagename;
        $http({
            method: 'POST',
            url: '/site/landing/getTransalatePage',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getPage(languagename) {
        var deferred = $q.defer();
        var data = {};
        data.language = languagename;
        $http({
            method: 'POST',
            url: '/site/landing/getPages',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getTransalatePageNames(languagename) {
        var deferred = $q.defer();
        var data = {};
        data.language = languagename;
        $http({
            method: 'POST',
            url: '/site/landing/getTransalatePageNames',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getpaymentMethod() {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/site/landing/payment_method'
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function generateotp(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/generateotp',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function checkMobileExists(type, phone) {
        var deferred = $q.defer();
        var data = {};
        data.type = type;
        data.phone = phone;
        $http({
            method: 'POST',
            url: '/site/account/settings/checkmobileexist',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }
}