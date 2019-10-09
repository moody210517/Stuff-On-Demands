angular.module('Authentication')
    .controller('LoginController', ['$scope', '$state', 'AuthenticationService', 'MainService', function($scope, $state, AuthenticationService, MainService) {
        $scope.remember = false;
        $scope.login = function() {
            $scope.dataLoading = true;
            AuthenticationService.Login($scope.username, $scope.password, function(response) {
                if (response.user == $scope.username) {
                    AuthenticationService.SetCredentials(response.user, $scope.password, response.token);
                    $state.go("app.dashboard");
                } else {
				
                    $scope.error = response.message;
					console.log("$scope.error",$scope.error)
                    $scope.dataLoading = false;
                }
            });
        };
    }])

    .controller('LogoutController', ['AuthenticationService', '$state', '$rootScope', function(AuthenticationService, $state, $rootScope) {
        AuthenticationService.ClearCredentials();
        AuthenticationService.Logout().then(function(data) {
            if (data.retStatus == 'Success') {
                $rootScope.userVisiblevalue = false;
                $rootScope.taskerVisiblevalue = false;
                $rootScope.taskVisiblevalue = false;
                $rootScope.earningsVisiblevalue = false;
                $rootScope.categoriesVisiblevalue = false;
                $rootScope.couponsVisiblevalue = false;
                $rootScope.newsletterVisiblevalue = false;
                $state.go("login");
            } else {
                $state.go("app.dashboard");
            }
        });
    }]);