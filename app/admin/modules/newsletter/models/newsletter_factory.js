var app = angular.module('handyforall.newsletter');
app.factory('SubscriberService',SubscriberService);
SubscriberService.$inject = ['$http','$q'];

function SubscriberService($http,$q){
    var SubscriberService = {
        getSubscriberList:getSubscriberList,
        getsubscripermail:getsubscripermail,
        exportSubscribersData:exportSubscribersData,
        getSettings:getSettings
    };
    return SubscriberService;

    function getSubscriberList(limit,skip,sort,search){
      var deferred = $q.defer();
      var data = {};
      data.sort = sort;
      data.search = search;
      data.limit = limit;
      data.skip = skip;

      $http({
          method: 'POST',
          url: '/newsletter/subscriber/list',
          data: data
      }).success(function (data) {
          deferred.resolve(data);
      }).error(function (err) {
          deferred.reject(err);
      });
      return deferred.promise;
    };

    function getsubscripermail() {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/emailtemplate/getsubscripermail'
        }).success(function (data) {
            deferred.resolve(data);
        }).error(function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    function exportSubscribersData() {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/tools/exportsubscriber'
        }).success(function (data) {
            deferred.resolve(data);
        }).error(function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    function getSettings() {
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: '/settings/general'
        }).success(function (data) {
            deferred.resolve(data);
        }).error(function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

}
