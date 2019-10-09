angular.module('handyforall.accounts')
    .controller('accountWalletCtrl', accountWalletCtrl)
    .controller('WalletRechargeModal', WalletRechargeModal);

accountWalletCtrl.$inject = ['$scope', '$rootScope', 'toastr', '$window', '$stateParams', 'MainService', 'routes', '$uibModal', '$translate'];
WalletRechargeModal.$inject = ['$uibModalInstance', '$state', '$translate', 'Rechargeamount', 'toastr'];

function accountWalletCtrl($scope, $rootScope, toastr, $window, $stateParams, MainService, routes, $uibModal, $translate) {

    var awc = this;

    /* For Desing - Switch Between Tabs */
    $scope.wallet_recharge = true;
    $scope.trans = false;
    $scope.wrbtn = true;
    $scope.w_rech = function (event) {
        $scope.wallet_recharge = true;
        $scope.trans = false;
        $scope.wrbtn = true;
        $scope.wtbtn = false;
    }
    $scope.w_trans = function (event) {
        $scope.wallet_recharge = false;
        $scope.trans = true;
        $scope.wtbtn = true;
        $scope.wrbtn = false;
    }
   
   $scope.stripe_status = 0;
   $scope.paypal_status = 0;
    angular.forEach($scope.payment_method, function (value) {
        if(value.gateway_name == 'Stripe'){
            $scope.stripe_status = value.status;
        }else if(value.gateway_name == 'PayPal'){
            $scope.paypal_status = value.status;
        }
    });

    awc.inter = parseInt($scope.settings.wallet.amount.minimum) + parseInt($scope.settings.wallet.amount.maximum);
    awc.interamount = awc.inter / 2;
    awc.interminimum = parseInt($scope.settings.wallet.amount.minimum);
    awc.intermaximum = parseInt($scope.settings.wallet.amount.maximum).toFixed(2);
    /* For Desing - Switch Between Tabs */
    // ------------------------------------------------------------------------
    $scope.walletDetails = {};

    if (angular.isDefined($rootScope.settings)) {
        $scope.settings = $rootScope.settings;
    }
    // ------------------------------------------------------------------------ //wallet amt
    function ChangeWalletAmount(amt) {
      
        $scope.walletAmount = (parseFloat(amt)).toFixed(2);
        console.log('$scope.walletAmount',$scope.walletAmount)
    };
    // ------------------------------------------------------------------------ //recharge Wallet by stripe
    function WalletRechargeByStripe(defaultCurrency) {
        $scope.walletMinAmt = ($scope.settings.wallet.amount.minimum * defaultCurrency.value).toFixed(2);
        $scope.walletWelAmt = ($scope.settings.wallet.amount.welcome * defaultCurrency.value).toFixed(2);
        $scope.walletMaxAmt = ($scope.settings.wallet.amount.maximum * defaultCurrency.value).toFixed(2);
        var data = {};
        data.amount = $scope.walletAmount;
        data.currencyvalue = defaultCurrency.value;

        if (data.amount && data.amount != 'NaN') {
            console.log("parseFloat(data.amount)",parseFloat(data.amount))
            console.log("$scope.walletMinAmt",$scope.walletMinAmt)
            if (!(parseFloat(data.amount) >= $scope.walletMinAmt)) {
                $translate('PLEASE ENTER THE AMOUNT ABOVE  '+ $scope.walletMinAmt ).then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            } else if (!(parseFloat(data.amount) <= $scope.walletMaxAmt)) {
                $translate('PLEASE ENTER THE AMOUNT  BELOW ' + $scope.walletMaxAmt).then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            } else {
                var modalInstance = $uibModal.open({
                    animation: true,
                    templateUrl: 'app/site/modules/accounts/views/wallet.modal.tab.html',
                    controller: 'WalletRechargeModal',
                    controllerAs: 'WRM',
                    resolve: {
                        Rechargeamount: function () {
                            return data;
                        }
                    }
                });
                modalInstance.result.then(function (data) {
                    var user = $rootScope.userId;
                    MainService.getData(routes.walletRechargeStripe, { data: data, user: user }).then(function (response) {
                        if (response.status == 0) {
                            toastr.error(response.message);
                        } else {
                            $translate('WALLET MONEY HAS BEEN UPDATED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                            $scope.walletDetails = response.wallet;
                        }
                    }).catch(function (err) {
                        console.error('err = ', err);
                    });
                });
            }
        } else {
            $translate('PLEASE ENTER THE AMOUNT TO ADD TO THE WALLET').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }
    };
    // ------------------------------------------------------------------------ // wallet balance

    function getWalletBalanceDetails() {
        var userId = $rootScope.userId;
        MainService.getData(routes.walletDetails, { userId: userId }).then(function (response) {
            if (response) {
                $scope.walletDetails = response;
            } else {
                $scope.walletDetails.total = 0;
            }
        }).catch(function (err) {
            console.error('err = ', err);
        });
    };
    // ------------------------------------------------------------------------ // recharge wallet by paypal

    function WalletRechargeByPaypal(defaultCurrency) {
        $scope.walletMinAmt = ($scope.settings.wallet.amount.minimum * defaultCurrency.value).toFixed(2);
        $scope.walletWelAmt = ($scope.settings.wallet.amount.welcome * defaultCurrency.value).toFixed(2);
        $scope.walletMaxAmt = ($scope.settings.wallet.amount.maximum * defaultCurrency.value).toFixed(2);
        var data = {};
        data.amount = $scope.walletAmount;
        data.currencyvalue = defaultCurrency.value;

        if (data.amount) {
            if (!((parseFloat(data.amount) >= $scope.walletMinAmt) && (parseFloat(data.amount) <= $scope.walletMaxAmt))) {
                $translate('PLEASE ENTER THE AMOUNT TO ADD TO THE WALLET').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            } else {
                var user = $rootScope.userId;
                MainService.getData(routes.walletRechargePaypal, { data: data, user: user }).then(function (response) {
                    if (response.status == 1 && response.payment_mode == 'paypal') {
                        $window.location.href = response.redirectUrl;
                    } else {
                        $translate('UNABLE PROCESS YOUR PAYMENT').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                    }
                }).catch(function (err) {
                    console.error('err = ', err);
                });
            }
        } else {
            $translate('PLEASE ENTER THE AMOUNT TO ADD TO THE WALLET').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }
    };
    // ------------------------------------------------------------------------ // wallet transaction list

    function UserWalletTransactionList() {
        var userId = $rootScope.userId;

        MainService.getData(routes.walletTransaction, { userId: userId }).then(function (response) {
            if (response) {
                $scope.currentPage = 1;
                $scope.numPerPage = 10;
                $scope.totalitems = response.count;
                $scope.totalitem = response.transaction;
                $scope.SubCategoryList = response.transaction;
                var perpage = $scope.numPerPage;
                CategoryList(0, perpage);

                console.log("$scope.SubCategoryList$scope.SubCategoryList",$scope.SubCategoryList)

                function CategoryList(from, perPage) {
                    $scope.SubCategoryList = [];
                    for (var i = from; i < perPage; i++) {
                        if (i === $scope.totalitem.length) { return false; }
                        $scope.SubCategoryList.push($scope.totalitem[i]);
                    }
                }

                $scope.WalletTransactionPagination = function (currentPage, numPerPage) {
                    if (currentPage) {
                        var spliceFrom = (currentPage - 1) * numPerPage;
                        var offset = spliceFrom + numPerPage;
                        CategoryList(spliceFrom, offset);
                    }
                }
            }
        });
    };
    // ------------------------------------------------------------------------

    angular.extend($scope, {
        ChangeWalletAmount: ChangeWalletAmount,
        WalletRechargeByStripe: WalletRechargeByStripe,
        getWalletBalanceDetails: getWalletBalanceDetails,
        WalletRechargeByPaypal: WalletRechargeByPaypal,
        WalletRechargeByPaypal: WalletRechargeByPaypal,
        UserWalletTransactionList: UserWalletTransactionList
    });

}

function WalletRechargeModal($uibModalInstance, $state, $translate, Rechargeamount, toastr) {
    var wrm = this;
    wrm.rechargeamount = Rechargeamount;
    var walletamount = wrm.rechargeamount.amount.replace(/,/g, '');
    var currencyvalue = wrm.rechargeamount.currencyvalue;
    var result = parseFloat(walletamount) / parseFloat(currencyvalue);
    var walletamount = "";
    wrm.walletamount = result.toFixed(2);

    function ok(isValid) {
        if (isValid == true) {
            $uibModalInstance.close(wrm);
        } else {
            $translate('FORM IS INVALID').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }
    };

    function cancel() {
        $uibModalInstance.dismiss('cancel');
    };

    angular.extend(wrm, {
        ok: ok,
        cancel: cancel
    })
}