var app = angular.module('handyforall.category');
app.factory('ContactService', ContactService);

function ContactService($http, $q) {
    var ContactService = {

		    savemessage:savemessage
    };

    return ContactService;

    function savemessage(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/contact/savecontactusmessage',
            data : data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }


}
