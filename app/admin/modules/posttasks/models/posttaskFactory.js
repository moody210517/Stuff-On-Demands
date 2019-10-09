var app = angular.module('handyforall.posttasks');

app.factory('PosttaskService', PosttaskService);

PosttaskService.$inject = ['$http', '$q', 'Upload'];

function PosttaskService($http, $q, Upload) {
    var PosttaskService = {
        getPaymentPrice: getPaymentPrice,
        getPayment: getPayment,
        savepaymentprice: savepaymentprice,
        getSetting: getSetting
    };

    return PosttaskService;

    function getPaymentPrice(limit, skip, sort, search) {

        var data = {};
        data.sort = sort;
        data.search = search;
        data.skip = skip;
        data.limit = limit;

        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/posttask/list',
            data: data
        }).success(function (data) {
            deferred.resolve(data);
        }).error(function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getPayment(id) {
        var data = { id: id };

        var deferred1 = $q.defer();
        $http({
            method: 'GET',
            url: '/posttask/getpaymentlistdropdown'
        }).success(function (data) {
            deferred1.resolve(data);
        }).error(function (err) {
            deferred1.reject(err);
        });
        var promise1 = deferred1.promise;

        var deferred2 = $q.defer();

        $http({
            method: 'POST',
            url: '/posttask/edit/',
            data: data
        }).success(function (data) {
            deferred2.resolve(data);
        }).error(function (err) {
            deferred2.reject(err);
        });
        var promise2 = deferred2.promise;

        return $q.all([promise1, promise2]);
    }


    function savepaymentprice(data) {
        var deferred = $q.defer();
        Upload.upload({
            url: '/posttask/savepaymentprice',
            data: data,
        }).then(function (data) {
            deferred.resolve(data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getSetting() {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/subcategories/getSetting'
        }).success(function (data) {
            deferred.resolve(data);
        }).error(function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }
}
