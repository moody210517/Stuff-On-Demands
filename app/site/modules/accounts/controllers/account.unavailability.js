angular.module('handyforall.accounts')
    .controller('AccountUnavailabilityCtrl', AccountUnavailabilityCtrl);

AccountUnavailabilityCtrl.$inject = ['$scope', '$rootScope', '$state', 'toastr', 'MainService', 'routes', '$uibModal', '$translate', '$filter'];
//AvailabilityModalInstanceCtrl.$inject = ['$scope', '$uibModalInstance', 'workingDays', 'workingTimes', 'DaysData', 'selectedIndex','workingCancel'];

function AccountUnavailabilityCtrl($scope, $rootScope, $state, toastr, MainService, routes, $uibModal, $translate, $filter) {
    var auc = this;
    var userId = $rootScope.userId;
    if (angular.isDefined($rootScope.accountProfile)) {
        auc.user = $rootScope.accountProfile;
    }

    if (auc.user.role == 'tasker' && auc.user._id === userId) {
        $scope.today = moment();

        $scope.disable6MonthsFromNow = function(event, month){
            if(month.isBefore(moment().subtract(2, 'month'), 'month') || month.isAfter(moment().add(2, 'month'), 'month')){
                event.preventDefault();
                toastr.error("Only 3 months allowed");
            }
        };

        auc.unavailable = [];

        auc.getUnavailableData = function() {
            auc.unavailable_dates = [];
            auc.unavailable_hours = [];
            auc.wholeday = 0;

            var modalInstance = $uibModal.open({
                animation: true,
                backdrop: 'static',
                keyboard: false,
                templateUrl: 'app/site/modules/accounts/views/new-account/unavailability.modal.html',
                controller: 'UnavailabilityModalCtrl',
                controllerAs: 'UAMIC'
            });
            modalInstance.result.then(function (data) {
                if(data != undefined) {
                    for(var i=0; i<data.unavailableTimingSlotList.length; i++) {
                        if(data.unavailableTimingSlotList[i].selected) {
                            auc.unavailable_hours.push(data.unavailableTimingSlotList[i].slot);
                        }
                    }

                    for(var j=0;j<auc.unavailabledates.length;j++) {
                        auc.unavailable_dates.push(moment(auc.unavailabledates[j]).format('YYYY-MM-DD'));  
                    }
                }
            });

            auc.unavailable.push({ date: auc.unavailable_dates, time: auc.unavailable_hours });
        };

        function saveUnavailability() {
            auc.user.unavailable_data = [];
            angular.forEach(auc.unavailable, function(value1, key1) {
                angular.forEach(value1.date, function(value2, key2) {
                    if(key1 == key2) {
                        if(value1.time.length > 0) {
                            auc.user.unavailable_data.push({date:value2, slot: value1.time, wholeday: 0});
                        } else {
                            auc.user.unavailable_data.push({date:value2, slot: value1.time, wholeday: 1});
                        }
                    }
                });
            });

            MainService.getData(routes.unavailability, auc.user).then(function(response) {
                $translate('UPDATED SUCCESSFULLY').then(function(headline) { toastr.success(headline); }, function(translationId) { toastr.success(headline); });
                $state.reload();
            }).catch(function(err) {
                console.error('err = ', err);
                $translate('UNABLE TO SAVE YOUR DATA').then(function(headline) { toastr.error(headline); }, function(translationId) { toastr.error(headline); });
            });
        }

    }; //end tasker

    angular.extend(auc, {
        saveUnavailability: saveUnavailability
    });
};

angular.module('handyforall.authentication').controller('UnavailabilityModalCtrl', function ($rootScope, $uibModalInstance, toastr, $translate, MainService) {
    var uamic = this;

    var unavailableTimingSlotList = [{ slot: 0, time: "12AM - 1AM", selected: false }, { slot: 1, time: "1AM - 2AM", selected: false }, { slot: 2, time: "2AM - 3AM", selected: false }, { slot: 3, time: "3AM - 4AM", selected: false }, { slot: 4, time: "4AM - 5AM", selected: false }, { slot: 5, time: "5AM - 6AM", selected: false }, { slot: 6, time: "6AM - 7AM", selected: false }, { slot: 7, time: "7AM - 8AM", selected: false }, { slot: 8, time: "8AM - 9AM", selected: false }, { slot: 9, time: "9AM - 10AM", selected: false }, { slot: 10, time: "10AM - 11AM", selected: false }, { slot: 11, time: "11AM - 12PM", selected: false }, { slot: 12, time: "12PM - 1PM", selected: false }, { slot: 13, time: "1PM - 2PM", selected: false }, { slot: 14, time: "2PM - 3PM", selected: false }, { slot: 15, time: "3PM - 4PM", selected: false }, { slot: 16, time: "4PM - 5PM", selected: false }, { slot: 17, time: "5PM - 6PM", selected: false }, { slot: 18, time: "6PM - 7PM", selected: false }, { slot: 19, time: "7PM - 8PM", selected: false }, { slot: 20, time: "8PM - 9PM", selected: false }, { slot: 21, time: "9PM - 10PM", selected: false }, { slot: 22, time: "10PM - 11PM", selected: false }, { slot: 23, time: "11PM - 12AM", selected: false }];

    uamic.wholeday = false;

    uamic.unavailableTimingSlotList = unavailableTimingSlotList;

    uamic.ok = function () {
        $uibModalInstance.close(uamic);
    };

    uamic.cancel = function () {
        $uibModalInstance.close();
    };

});
