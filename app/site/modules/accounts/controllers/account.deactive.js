angular.module('handyforall.accounts')
    .controller('AccountDeactivateCtrl', AccountDeactivateCtrl)
    .controller('DeactivateModalCtrl', DeactivateModalCtrl);
AccountDeactivateCtrl.$inject = ['$scope', '$rootScope', '$state', 'MainService', 'routes', 'toastr', '$translate', '$uibModal', 'swal', 'AuthenticationService'];
DeactivateModalCtrl.$inject = ['$scope', '$rootScope', '$state', 'toastr', '$translate', '$uibModalInstance', 'userResolve'];

function AccountDeactivateCtrl($scope, $rootScope, $state, MainService, routes, toastr, $translate, $uibModal, swal, AuthenticationService) {
    var adc = this;
    var userId = $rootScope.userId;

    if (angular.isDefined($rootScope.accountProfile)) {
        adc.user = $rootScope.accountProfile;
    }

    function deactivateACC() {
        swal({
            title: 'Are you sure?',
            text: 'You will be deactivate from this site!',
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Deactivate!'
        }).then(function (response) {
            if (response) {
                if (adc.user._id === userId && adc.user.role === 'user') {
                    var userid = $rootScope.userId;
                    MainService.getData(routes.userDeactiveAcc, { userid: userid }).then(function (response) {
                        $translate('YOUR ACCOUNT DEACTIVATED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                        AuthenticationService.ClearCredentials();
                        $state.go('landing', {}, { reload: true });
                    }).catch(function (err) {
                        console.error('err = ', err);
                        $translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                    });
                }
                if (adc.user._id === userId && adc.user.role === 'tasker') {
                    var userid = $rootScope.userId;
                    MainService.getData(routes.taskerDeactiveAcc, { userid: userid }).then(function (response) {
                        $translate('YOUR ACCOUNT DEACTIVATED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                        AuthenticationService.ClearCredentials();
                        $state.go('landing', {}, { reload: true });
                    }).catch(function (err) {
                        console.error('err = ', err);
                        $translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                    });
                }
            }
        }).catch(function (err) {
            // console.error('err - ',err);
        });
    };

    angular.extend($scope, {
        deactivateACC: deactivateACC
    });
};

function DeactivateModalCtrl($scope, $rootScope, $state, toastr, $translate, $uibModalInstance, userResolve) {
    var dmc = this;

    if (angular.isDefined(userResolve)) {
        $scope.user = userResolve
    }

    function ok() {
        $uibModalInstance.close($scope.user);
        $state.go('account.deactivate', {}, { reload: false });
    };

    function cancel() {
        $uibModalInstance.dismiss('cancel');
    };

    angular.extend($scope, {
        ok: ok,
        cancel: cancel
    });
};