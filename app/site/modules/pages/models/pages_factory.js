var app = angular.module('handyforall.category');
app.factory('PageService', PageService);

function PageService($http, $q) {
    var PageService = {
        getpage: getpage,
    };
    return PageService;

    function getpage(slug,language) {
       // console.log("in")
        var deferred = $q.defer();
        var data = {};
        data.slug = slug.slug;
        data.language = language;
        $http({
            method: 'POST',
            url: '/site/pages/getpage',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

}
