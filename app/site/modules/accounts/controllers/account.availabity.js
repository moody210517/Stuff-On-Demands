angular.module('handyforall.accounts')
    .controller('AccountAvailabityCtrl', AccountAvailabityCtrl);

AccountAvailabityCtrl.$inject = ['$scope', '$rootScope', '$state', 'toastr', 'MainService', 'routes', '$uibModal', '$translate', '$filter'];
//AvailabilityModalInstanceCtrl.$inject = ['$scope', '$uibModalInstance', 'workingDays', 'workingTimes', 'DaysData', 'selectedIndex','workingCancel'];

function AccountAvailabityCtrl($scope, $rootScope, $state, toastr, MainService, routes, $uibModal, $translate, $filter) {
    var aac = this;
    var userId = $rootScope.userId;
    if (angular.isDefined($rootScope.accountProfile)) {
        aac.user = JSON.parse(JSON.stringify( $rootScope.accountProfile));
    }

    if (aac.user.role == 'tasker' && aac.user._id === userId) {

        var availableTimingSlotList = [{ slot: 0, time: "12AM - 1AM", selected: false }, { slot: 1, time: "1AM - 2AM", selected: false }, { slot: 2, time: "2AM - 3AM", selected: false }, { slot: 3, time: "3AM - 4AM", selected: false }, { slot: 4, time: "4AM - 5AM", selected: false }, { slot: 5, time: "5AM - 6AM", selected: false }, { slot: 6, time: "6AM - 7AM", selected: false }, { slot: 7, time: "7AM - 8AM", selected: false }, { slot: 8, time: "8AM - 9AM", selected: false }, { slot: 9, time: "9AM - 10AM", selected: false }, { slot: 10, time: "10AM - 11AM", selected: false }, { slot: 11, time: "11AM - 12PM", selected: false }, { slot: 12, time: "12PM - 1PM", selected: false }, { slot: 13, time: "1PM - 2PM", selected: false }, { slot: 14, time: "2PM - 3PM", selected: false }, { slot: 15, time: "3PM - 4PM", selected: false }, { slot: 16, time: "4PM - 5PM", selected: false }, { slot: 17, time: "5PM - 6PM", selected: false }, { slot: 18, time: "6PM - 7PM", selected: false }, { slot: 19, time: "7PM - 8PM", selected: false }, { slot: 20, time: "8PM - 9PM", selected: false }, { slot: 21, time: "9PM - 10PM", selected: false }, { slot: 22, time: "10PM - 11PM", selected: false }, { slot: 23, time: "11PM - 12AM", selected: false }];


        var workingDays = [
            { day: "Sunday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
            { day: "Monday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
            { day: "Tuesday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
            { day: "Wednesday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
            { day: "Thursday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
            { day: "Friday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
            { day: "Saturday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false }];


        if(aac.user.working_days) {
            angular.forEach(workingDays, function (item) {
                angular.forEach(aac.user.working_days, function (selecteditem) {
                    if(item.day == selecteditem.day) {
                        if(selecteditem.slots && selecteditem.slots.length > 0) {
                            angular.forEach(item.slot, function (slots, skey) {
                                if(selecteditem.slots.includes(skey)) {
                                    slots.selected = selecteditem.wholeday == 1 ? false : true;
                                }
                            });
                        }
                        item.selected = selecteditem.selected == 1 ? true : false;
                        item.wholeday = selecteditem.wholeday == 1 ? true : false;
                    }
                });
            });
            aac.user.working_days = workingDays;
        }

        $scope.clearSlots = function(day, wholeday, parentkey, event) {
            angular.forEach(aac.user.working_days, function (days, key) {
                angular.forEach(days.slot, function (slot, skey) {
                    if(day && !wholeday) {
                        if(parentkey == key) {
                            slot.selected = false;
                        }
                    }
                });
            });
            event.stopPropagation();
        };

        // ------------------------ map section -------------------------------
        aac.taskerareaaddress = aac.user.availability_address;
        aac.radiusby = $rootScope.settings.distanceby;

        if (aac.radiusby == 'km') {
            aac.radiusval = 1000;
        } else {
            aac.radiusval = 1609.34;
        }
        aac.user.radius = $rootScope.settings.tasker_radius;

        $scope.maps = [];
        $scope.$on('mapInitialized', function(evt, evtMap) {
            $scope.maps.push(evtMap);
        });

        function mapToInput(event) {
            if ($scope.maps[0]) {
                aac.user.radius = parseInt($scope.maps[0].shapes.circle.radius / aac.radiusval);
                var lat = $scope.maps[0].shapes.circle.center.lat();
                var lng = $scope.maps[0].shapes.circle.center.lng();
                var latlng = new google.maps.LatLng(lat, lng);
                var geocoder = geocoder = new google.maps.Geocoder();
                geocoder.geocode({ 'latLng': latlng }, function(results, status) {
                    if (status == 'OK') {
                        $scope.$apply(function() {
                            aac.taskerareaaddress = results[0].formatted_address;
                            aac.user.availability_address = results[0].formatted_address;
                            aac.user.location.lng = lng;
                            aac.user.location.lat = lat;
                        })
                    }
                });
            }
        };


        // ---------------------------------- available location --------------------------
        function taskerareaChanged() {
            aac.place = this.getPlace();
            aac.user.location = {};
            aac.user.location.lng = aac.place.geometry.location.lng();
            aac.user.location.lat = aac.place.geometry.location.lat();
            aac.user.availability_address = aac.place.formatted_address;
            var locationa = aac.place;

            var dummy = locationa.address_components.filter(function(value) {
                return value.types[0] == "locality";
            }).map(function(data) {
                return data;
            });
            aac.dummyAddress = dummy.length;
        };

        function saveAvailability() {
            var selected_days = [];
            if(aac.user.working_days) {
                angular.forEach(aac.user.working_days, function (days) {
                    if(days.selected) {
                        if(!days.wholeday) {
                            var selected_slots = [];
                            angular.forEach(days.slot, function (slot) {
                                if(slot.selected) {
                                    selected_slots.push(slot.slot);
                                }
                            });
                            selected_days.push({day: days.day, slots: selected_slots, selected: days.selected, wholeday: days.wholeday}); 
                        } else {
                            selected_days.push({day: days.day, slots: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23], selected: days.selected, wholeday: days.wholeday});
                        }
                    }
                });
            }

            aac.user.working_days = selected_days;
            
            if (aac.user.location.lat == '' || aac.user.location.lng == '') {
                toastr.error('Invalid Address');
                return;
            } else {
                MainService.getData(routes.availabity, aac.user).then(function(response) {
                    $translate('UPDATED SUCCESSFULLY').then(function(headline) { toastr.success(headline); }, function(translationId) { toastr.success(headline); });
                    $state.reload();
                }).catch(function(err) {
                    console.error('err = ', err);
                    $translate('UNABLE TO SAVE YOUR DATA').then(function(headline) { toastr.error(headline); }, function(translationId) { toastr.error(headline); });
                });
            }
        }

    }; //end tasker

    angular.extend(aac, {
        taskerareaChanged: taskerareaChanged,
        mapToInput: mapToInput,
        saveAvailability: saveAvailability
    });
};
