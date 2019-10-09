    angular.module('handyforall.accounts')
    .controller('AccountHeaderCtrl', AccountHeaderCtrl);
AccountHeaderCtrl.$inject = ['$scope', '$rootScope', '$state', 'toastr', 'accountProfileResolve', 'seoSettingsResolve', 'settingsResolve', 'defaultCurrency', '$cookieStore'];

function AccountHeaderCtrl($scope, $rootScope, $state, toastr, accountProfileResolve, seoSettingsResolve, settingsResolve, defaultCurrency, $cookieStore) {
    var ahc = this;
    if (angular.isDefined(accountProfileResolve) && angular.isDefined(seoSettingsResolve) && angular.isDefined(settingsResolve)) {
        ahc.currentAcc = accountProfileResolve.result[0];
        ahc.avatarImage = accountProfileResolve.result[0].avatar || '/uploads/default/user.jpg';
        $rootScope.accountProfile = accountProfileResolve.result[0];
        ahc.settings = settingsResolve.settings;
        $rootScope.seoSettings = seoSettingsResolve;
        if ($cookieStore.get('Currency')) {
            $rootScope.defaultCurrency = $cookieStore.get('Currency');
        } else {
            $rootScope.defaultCurrency = defaultCurrency;
        }
    }

    // Restrict Wallet If Disabled 
    if ($state.current.name == 'account.wallet' && ahc.settings.wallet.status == 0) {
        $state.go('account.profile');
    }

    // Restrict Invites If Disabled 
    if ($state.current.name == 'account.invites' && ahc.settings.referral.status == 0) {
        $state.go('account.profile');
    }

    var currentUser = $rootScope.userId;
    $scope.menus = [];
    if (currentUser === ahc.currentAcc._id && ahc.currentAcc.role === 'tasker') {
        $scope.menus = [
            { "link": "account.profile", "status": "active", "name": "Profile" },
            { "link": "account.about", "status": "active", "name": "About" },
            //{ "link": "account.password", "status": "active", "name": "Password" },
            { "link": "account.information", "status": "active", "name": "Account" },
            { "link": "account.category", "status": "active", "name": "Category" },
            { "link": "account.availabity", "status": "active", "name": "Availability" },
            //{ "link": "account.unavailability", "status": "active", "name": "Unavailability" },
            { "link": "account.job", "status": "active", "name": "Task Details" },
            { "link": "account.transactions", "status": "active", "name": "Transactions" },
            { "link": "account.reviews", "status": "active", "name": "Reviews" },
            //{ "link": "account.deactivate", "status": "active", "name": "Deactivate" },
        ];
    } else if (currentUser === ahc.currentAcc._id && ahc.currentAcc.role === 'user') {
        $scope.menus = [
            { "link": "account.profile", "status": "active", "name": "Profile" },
            //{ "link": "account.password", "status": "active", "name": "Password" },
            { "link": "account.tasks", "status": "active", "name": "Task Details" },
            { "link": "account.invites", "status": "active", "name": "Invite Friends" },
            { "link": "account.wallet", "status": "active", "name": "Wallet" },
            { "link": "account.transactions", "status": "active", "name": "Transactions" },
            { "link": "account.reviews", "status": "active", "name": "Reviews" },
            //{ "link": "account.deactivate", "status": "active", "name": "Deactivate" },
        ];

        // Restrict Wallet If Disabled 
        if (ahc.settings.wallet.status == 0) {
            $scope.menus = $scope.menus.filter(function (menu) {
                return menu.link != 'account.wallet';
            });
        }

        // Restrict Invites If Disabled 
        if (ahc.settings.referral.status == 0) {
            $scope.menus = $scope.menus.filter(function (menu) {
                return menu.link != 'account.invites';
            });
        }
    }
    // ----------------------------------------------------------------------------------------------

}