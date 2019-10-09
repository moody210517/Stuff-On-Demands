var app = angular.module('handyforall.faq');
app.factory('FaqService', FaqService);

function FaqService($http, $q) {
    var FaqService = {
        getfaq: getfaq,
        // getcategoryList: getcategoryList
    };

    return FaqService;

    function getfaq() {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/site/faq/getfaq',
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }


}
