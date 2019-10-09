angular.module('handyforall.accounts').controller('AccountPasswordCtrl', AccountPasswordCtrl);

AccountPasswordCtrl.$inject = ['$scope', '$rootScope', 'toastr', 'MainService', 'routes', '$state', '$translate'];

function AccountPasswordCtrl($scope, $rootScope, toastr, MainService, routes, $state, $translate) {
    var apc = this;

    if (angular.isDefined($rootScope.accountProfile)) {
        apc.user = $rootScope.accountProfile;
    }
    apc.currentUser = $rootScope.userId;

    function accountUserPasswordChange(isvalid, form) {
        var userId = $rootScope.userId;
        if (isvalid) {
            MainService.getData(routes.userPassword, { userId: userId, form: form }).then(function (response) {
                if (response.status === 1) {
                    $translate('Password Updated Successfully').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                    $state.go('account.profile', {}, { reload: false });
                } else {
                    $translate(response.message).then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                }
            }).catch(function (err) {
                $translate('Unable to Save User Password Changed').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            });
        } else {
            $translate('Please fill all fields').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }
    };

    function accountTaskerPasswordChange(isvalid, form) {
        if (isvalid) {
            var userId = $rootScope.userId;
            MainService.getData(routes.taskerPassword, { userId: userId, form: form }).then(function (response) {
                if (response.status === 1) {
                    $translate('Password Updated Successfully').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                    $state.go('account.profile', {}, { reload: false });
                } else {
                    $translate(response.message).then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                    //$translate('Unable to Save User Password Changed').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                }
            }).catch(function (err) {
                $translate(err).then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            });
        } else {
            toastr.error('Please fill all fields');
        }
    };

    angular.extend($scope, {
        accountUserPasswordChange: accountUserPasswordChange,
        accountTaskerPasswordChange: accountTaskerPasswordChange
    });
};