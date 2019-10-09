(function () {
    var myApplication = angular.module("handyforall.config", []);
    fetchData().then(bootstrapApplication);

    function fetchData() {
        var initInjector = angular.injector(['ng', 'ngCookies']);
        var $http = initInjector.get('$http');
        var $q = initInjector.get('$q');
        var $cookieStore = initInjector.get('$cookieStore');
        var user = $cookieStore.get('siteglobals');

        var data = {};
        if (user) {
            data.user = user.currentUser.user_id;
            data.type = user.currentUser.user_type;
        }

        var settings = $q.defer();
        $http({
            method: 'POST',
            url: '/site/main',
            data: data
        }).then(function (data) {
            settings.resolve(data.data);
        }, function (err) {
            settings.reject(err);
        });
        var settingsData = settings.promise;

        var ipinfo = $q.defer();
        $http({
            method: 'GET',
            url: '//ipinfo.io?token=1cc3b275647ba5'
        }).then(function (data) {
            ipinfo.resolve(data.data);
        }, function (err) {
            ipinfo.reject(err);
        });
        var ipinfoData = ipinfo.promise;
        return $q.all([settingsData, ipinfoData]);
    }

    function bootstrapApplication(data) {

        myApplication.constant('config', data[0]);
        myApplication.constant('ipinfo', data[1]);

        angular.element(document).ready(function () { angular.bootstrap(document, ['handyforall.site']); });
    }
}());