angular.module('handyforall.accounts')
    .controller('AccountTransactionCtrl', AccountTransactionCtrl)
    .controller('TaskUserTranscationViewModalCtrl', TaskUserTranscationViewModalCtrl)
    .controller('TaskTranscationViewModalCtrl', TaskUserTranscationViewModalCtrl)

AccountTransactionCtrl.$inject = ['$scope', '$rootScope', '$state', 'MainService', 'routes', 'toastr', '$translate', '$uibModal'];
TaskUserTranscationViewModalCtrl.$inject = ['$scope', 'task', '$uibModalInstance', 'TaskDetails', 'defaultcurrency', 'getsettings', 'getmaincatname', 'MainService', 'routes'];
TaskTranscationViewModalCtrl.$inject = ['$scope', 'task', '$uibModalInstance', 'TaskDetails', 'defaultcurrency', 'getsettings', 'getmaincatname', 'MainService', 'routes'];


function AccountTransactionCtrl($scope, $rootScope, $state, MainService, routes, toastr, $translate, $uibModal) {
    var atc = this;
    var userId = $rootScope.userId;

    atc.itemsPerPage = 5;
    atc.transtotalItem = 0;
    atc.transCurrentPage = 1;
    if (angular.isDefined($rootScope.accountProfile)) {
        atc.user = $rootScope.accountProfile;
        $scope.currency = $rootScope.currency;
    }

    function getTransaction(page) {
        var transURL = atc.user.role === 'user' ? routes.userTransactions : routes.taskerTransactions;
        var curpage = page || atc.transCurrentPage;
        var data = {
            "id": userId,
            "skip": curpage,
            "limit": atc.itemsPerPage
        }
        MainService.getData(transURL, data).then(function (response) {
            if (response) {
                atc.usertranscation = response.result;
                atc.transtotalItem = response.count;
            }
        }).catch(function (err) {
            console.error('err = ', err);
        });
    }

    // ---------------------------------------------------------------------

    function taskUserTranscationViewModal(index, catid) {
        var taskUserTransaction = atc.usertranscation[index];
        var transcation = {};
        transcation.date = taskUserTransaction.updatedAt;
        transcation.invoice = taskUserTransaction.invoice;
        transcation.bookingid = taskUserTransaction._id;
        if (taskUserTransaction.transactions) {
            transcation.transcationid = taskUserTransaction.transactions[0];
        }
        transcation.categoryname = taskUserTransaction.category.name;
        var taskerskills = taskUserTransaction.tasker.taskerskills;
        angular.forEach(taskerskills, function (key, value) {
            if (key.childid == taskUserTransaction.category._id) {
                transcation.perHour = key.hour_rate;
            }
        });
        transcation.worked_hours = taskUserTransaction.invoice.worked_hours;
        transcation.username = taskUserTransaction.user.username;
        transcation.addresss = taskUserTransaction.billing_address.city;
        transcation.tasker_earn = taskUserTransaction.invoice.amount.admin_commission;
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'app/site/modules/accounts/views/model/usertransaction.modal.html',
            controller: 'TaskUserTranscationViewModalCtrl',
            controllerAs: 'TTEMC',
            size: 'lg',
            resolve: {
                TaskDetails: function () {
                    return transcation;
                },
                task: function () {
                    return atc.usertranscation[index];
                },
                defaultcurrency: function () {
                    return $scope.currency;
                },
                getsettings: function (MainService) {
                    return MainService.getData(routes.settingUrl, {});
                },
                getmaincatname: function (MainService) {
                    var data = catid;
                    return MainService.getData(routes.getmaincat, { data: data });
                }
            }
        });

        modalInstance.result.then(function (data) { }, function () { });
    };


    function taskTranscationViewModal(index, catid) {
        var taskUserTransaction = atc.usertranscation[index];
        var transcation = {};
        transcation.date = taskUserTransaction.updatedAt;
        transcation.invoice = taskUserTransaction.invoice;
        transcation.bookingid = taskUserTransaction._id;
        if (taskUserTransaction.transactions) {
            transcation.transcationid = taskUserTransaction.transactions[0];
        }
        transcation.categoryname = taskUserTransaction.category.name;
        var taskerskills = taskUserTransaction.tasker.taskerskills;
        angular.forEach(taskerskills, function (key, value) {
            if (key.childid == taskUserTransaction.category._id) {
                transcation.perHour = key.hour_rate;
            }
        });
        transcation.worked_hours = taskUserTransaction.invoice.worked_hours;
        transcation.username = taskUserTransaction.user.username;
        transcation.addresss = taskUserTransaction.billing_address.city;
        transcation.tasker_earn = taskUserTransaction.invoice.amount.admin_commission;
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'app/site/modules/accounts/views/model/transaction.modal.html',
            controller: 'TaskTranscationViewModalCtrl',
            controllerAs: 'TTEMS',
            size: 'lg',
            resolve: {
                TaskDetails: function () {
                    return transcation;
                },
                task: function () {
                    return atc.usertranscation[index];
                },
                defaultcurrency: function () {
                    return $scope.currency;
                },
                getsettings: function (MainService) {
                    return MainService.getData(routes.settingUrl, {});
                },
                getmaincatname: function (MainService) {
                    var data = catid;
                    return MainService.getData(routes.getmaincat, { data: data });
                }
            }
        });

        modalInstance.result.then(function (data) { }, function () { });
    };

    angular.extend(atc, {
        getTransaction: getTransaction,
        taskUserTranscationViewModal: taskUserTranscationViewModal,
        taskTranscationViewModal: taskTranscationViewModal
    });
};

function TaskUserTranscationViewModalCtrl($scope, task, $uibModalInstance, TaskDetails, defaultcurrency, getsettings, getmaincatname, MainService, routes) {
    var ttemc = this;
    ttemc.TaskDetails = TaskDetails;
    ttemc.task = task;
    ttemc.maincategoryname = getmaincatname.name;
    ttemc.defaultcurrency = defaultcurrency;
    ttemc.getsettings = getsettings;
    if (((ttemc.TaskDetails.invoice.amount.total + ttemc.TaskDetails.invoice.amount.service_tax) * ttemc.defaultcurrency.value) > (ttemc.TaskDetails.invoice.amount.coupon * ttemc.defaultcurrency.value)) {
        ttemc.checkvalue = "big";
        ttemc.total = ((((ttemc.TaskDetails.invoice.amount.total + ttemc.TaskDetails.invoice.amount.service_tax + ttemc.TaskDetails.invoice.amount.extra_amount) * ttemc.defaultcurrency.value) - ttemc.TaskDetails.invoice.amount.coupon) * ttemc.defaultcurrency.value).toFixed(2);
    } else {
        ttemc.checkvalue = "small";
        ttemc.total = ((ttemc.TaskDetails.invoice.amount.extra_amount + ttemc.TaskDetails.invoice.amount.service_tax) * ttemc.defaultcurrency.value).toFixed(2);
    }

    function downloadPdf() {
        var _id = ttemc.TaskDetails.bookingid;
        MainService.getData(routes.pdf, { _id: _id }).then(function (response) { }).catch(function (err) {
        });
    }

    function ok() {
        $uibModalInstance.close(ttemc.review);
    };

    function cancel() {
        $uibModalInstance.dismiss('cancel');
    };

    angular.extend(ttemc, {
        cancel: cancel,
        ok: ok,
        downloadPdf: downloadPdf
    });
}

function TaskTranscationViewModalCtrl($scope, task, $uibModalInstance, TaskDetails, defaultcurrency, getsettings, getmaincatname, MainService, routes) {
    var ttemc = this;
    ttemc.TaskDetails = TaskDetails;
    ttemc.task = task;
    ttemc.maincategoryname = getmaincatname.name;
    ttemc.defaultcurrency = defaultcurrency;
    ttemc.getsettings = getsettings;
    if (((ttemc.TaskDetails.invoice.amount.total + ttemc.TaskDetails.invoice.amount.service_tax) * ttemc.defaultcurrency.value) > (ttemc.TaskDetails.invoice.amount.coupon * ttemc.defaultcurrency.value)) {
        ttemc.checkvalue = "big";
        ttemc.total = ((((ttemc.TaskDetails.invoice.amount.total + ttemc.TaskDetails.invoice.amount.service_tax + ttemc.TaskDetails.invoice.amount.extra_amount) * ttemc.defaultcurrency.value) - ttemc.TaskDetails.invoice.amount.coupon) * ttemc.defaultcurrency.value).toFixed(2);
    } else {
        ttemc.checkvalue = "small";
        ttemc.total = ((ttemc.TaskDetails.invoice.amount.extra_amount + ttemc.TaskDetails.invoice.amount.service_tax) * ttemc.defaultcurrency.value).toFixed(2);
    }

    function downloadPdf() {
        var _id = ttemc.TaskDetails.bookingid;
        MainService.getData(routes.pdf, { _id: _id }).then(function (response) { }).catch(function (err) {
            console.error('err = ', err);
        });
    }

    function ok() {
        $uibModalInstance.close(ttemc.review);
    };

    function cancel() {
        $uibModalInstance.dismiss('cancel');
    };

    angular.extend(ttemc, {
        cancel: cancel,
        ok: ok,
        downloadPdf: downloadPdf
    });
}