var app = angular.module('handyforall.peoplecmd');

app.factory('PeoplecmdService', PeoplecmdService);

PeoplecmdService.$inject = ['$http', '$q', 'Upload'];

function PeoplecmdService($http, $q, Upload) {
    var PeoplecmdService = {
        getPeoplelist: getPeoplelist,
        getPeople: getPeople,
        savepeoplecmd: savepeoplecmd,
        getSetting: getSetting
    };

    return PeoplecmdService;

    function getPeoplelist(limit, skip, sort, search) {
        var data = {};
        data.sort = sort;
        data.search = search;
        data.skip = skip;
        data.limit = limit;

        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/peoplecmd/list/',
            data: data
        }).success(function (data) {
            deferred.resolve(data);
        }).error(function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getPeople(id) {
        var data = { id: id };

        var deferred1 = $q.defer();
        $http({
            method: 'GET',
            url: '/peoplecmd/getpeoplecmddropdown'
        }).success(function (data) {
            deferred1.resolve(data);
        }).error(function (err) {
            deferred1.reject(err);
        });
        var promise1 = deferred1.promise;

        var deferred2 = $q.defer();

        $http({
            method: 'POST',
            url: '/peoplecmd/edit/',
            data: data
        }).success(function (data) {
            deferred2.resolve(data);
        }).error(function (err) {
            deferred2.reject(err);
        });
        var promise2 = deferred2.promise;

        return $q.all([promise1, promise2]);
    }


    function savepeoplecmd(data) {
        var deferred = $q.defer();
        Upload.upload({
            url: '/peoplecmd/savepeoplecmd',
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
