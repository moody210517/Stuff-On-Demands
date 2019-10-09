angular.module('handyforall.notifications').controller('notificationCtrl', notificationCtrl);

notificationCtrl.$inject = ['NotificationsResolve', 'NotificationService', 'toastr', '$rootScope', '$translate', '$scope', 'accountProfileResolve', '$state', '$cookieStore'];

function notificationCtrl(NotificationsResolve, NotificationService, toastr, $rootScope, $translate, $scope, accountProfileResolve, $state, $cookieStore) {
    var nc = this;
    nc.itemsPerPage = 3;
    nc.currentPage = 1;
    nc.totalItems = 0;
    nc.notifications = NotificationsResolve;

    console.log("nc.notifications", nc.notifications);
    if (nc.notifications[0]) {
        nc.totalItems = nc.notifications[0].count;
    }
    $rootScope.$emit('webNotification', { user: $rootScope.userId, type: $rootScope.usertype });
    var data = {};
    data.user = $rootScope.userId;
    data.type = $rootScope.usertype;
    nc.getnotification = function() {
        nc.notification = [];
        nc.getnotificationResponse = false;
        NotificationService.getMessage(data, nc.currentPage, nc.itemsPerPage).then(function(data) {
            nc.notifications = data;
        }, function(error) {});
    };
    // --------------------------------------------------------------------
    var userId = $rootScope.userId;
    var role = $rootScope.usertype;
    console.log('accountProfileResolve',accountProfileResolve);
    if (angular.isDefined(accountProfileResolve)) {
        nc.user = accountProfileResolve.result[0];
    }
    if (nc.user._id === userId && nc.user.role === 'tasker') {
        $scope.notifyAccount = function(status) {              
            $cookieStore.put('notification_status', status);       
            $state.go('account.job');
        }
    }

    if (nc.user._id === userId && nc.user.role === 'user') {
        $scope.notifyAccount = function(status) {            
            $cookieStore.put('notification_status', status);
            $state.go('account.tasks');
        }
    }

}
