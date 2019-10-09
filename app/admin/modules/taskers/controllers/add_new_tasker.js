angular.module('handyforall.taskers').controller('addNewTaskerCtrl', addNewTaskerCtrl);

addNewTaskerCtrl.$inject = ['$filter', '$state', '$scope', '$modal', 'toastr', '$timeout', 'TaskersService', 'taskerAddServiceResolve', 'CategoryServiceResolve', 'NgMap'];

function addNewTaskerCtrl($filter, $state, $scope, $modal, toastr, $timeout, TaskersService, taskerAddServiceResolve, CategoryServiceResolve, NgMap) {

    $scope.render = false;

    var antsc = this;
    if (antsc.tasker === 'undefined') {
        antsc.tasker = taskerAddServiceResolve[0];
    }

    antsc.tasker_radius = $scope.gensettings.tasker_radius;
    antsc.radiusby = $scope.gensettings.distanceby;
    if (antsc.radiusby == 'km') {
        antsc.radiusval = 1000;
    }
    else {
        antsc.radiusval = 1609.34;
    }

    antsc.tasker = {
        birthdate: { year: '', month: '', date: '' },
        location: '',
        working_area: [],
        phone: {}
    }
    antsc.tasker.imageFile = [];
    antsc.tasker.radius = $scope.gensettings.tasker_radius;
    antsc.dateChange = function () {
        antsc.tasker.birthdate.year = antsc.dob.getFullYear();
        antsc.tasker.birthdate.month = antsc.dob.getMonth() + 1;
        antsc.tasker.birthdate.date = antsc.dob.getDate();

        if (calculate_age(antsc.tasker.birthdate.month, antsc.tasker.birthdate.date, antsc.tasker.birthdate.year, antsc.dob)) {
            antsc.tasker.birthdate.year = antsc.dob.getFullYear();
            antsc.tasker.birthdate.month = antsc.dob.getMonth() + 1;
            antsc.tasker.birthdate.date = antsc.dob.getDate();
            antsc.tasker.dob = antsc.dob;
        } else {
            toastr.error('Your age should be 18+');
        }
    };
    antsc.tasker.location = {};
    $scope.maps = [];
    $scope.$on('mapInitialized', function (evt, evtMap) {
        $scope.maps.push(evtMap);
    });
    $scope.visibleValue = false;
    $scope.showImage = false;
    // Croping
    $scope.myImage = '';
    antsc.myCroppedImage = '';
    $scope.imageChangeValue = false;
    // $scope.cropType = 'circle'; // circle & square
    $scope.handleFileSelect = function handleFileSelect(files, evt, rejectedFiles) {
        // if (files[0]) {
            $scope.avatar_image_previous_value = evt;
            var file = evt.currentTarget.files[0];
            if(file.$errorParam == '1MB' || file.$error == 'pattern') {
                $scope.visibleValue = false;
                file = null;
                toastr.error('Allowed files: jpeg, png, jpg. Max file size 1Mb')
            } else {
                $scope.visibleValue = true;
                $scope.imageChangeValue = true;
            }
            if(file) {
                var reader = new FileReader();
                reader.onload = function (evt) {
                    $scope.$apply(function ($scope) {
                        $scope.myImage = evt.target.result;
                    });
                };
                reader.readAsDataURL(file);
            }
        // } else {
        //     $scope.visibleValue = false;
        //     $scope.showImage = false;
        //     $scope.imageChangeValue = false;
        // }
    };
    // End Croping


    antsc.previousAvatarPage = function (steps) {
        $scope.steps.step1 = true;
        //$scope.handleFileSelect($scope.avatar_image_previous_value);
    };

    antsc.addNewCategory = function addNewCategory(steps) {
        $scope.steps.step4 = true;
        //antsc.tasker.radius = 50;
        navigator.geolocation.getCurrentPosition(function (pos) {
                taskerLatLongAddress(pos.coords.latitude, pos.coords.longitude);
            }, function (failure) {
                $.getJSON('https://ipinfo.io/geo', function (response) {
                    if(response){
                        var loc = response.loc.split(',');
                        taskerLatLongAddress(loc[0], loc[1]);
                    }else{
                        taskerLatLongAddress('13.0827', '80.2707');
                    }
                });
            });
        /*navigator.geolocation.getCurrentPosition(function (pos) {
            var latlng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
            var geocoder = geocoder = new google.maps.Geocoder();
            geocoder.geocode({ 'latLng': latlng }, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    if (results[1]) {
                        antsc.tasker.availability_address = results[1].formatted_address;
                        antsc.taskerareaaddress = results[1].formatted_address;
                    }
                }
            })
            antsc.tasker.location.lng = pos.coords.longitude;
            antsc.tasker.location.lat = pos.coords.latitude;
        })*/
        $timeout(function () {
            google.maps.event.trigger($scope.maps[0], 'resize');
            $scope.maps[0].setCenter(new google.maps.LatLng(antsc.tasker.location.lat, antsc.tasker.location.lng));
        }, 100);
    }

    /*   antsc.tasker.location.lat = pos.coords.latitude;
                  })
              }
              if (!antsc.tasker.availability_address) {
                $timeout(function () {
                    google.maps.event.trigger($scope.maps[0], 'resize');
                    $scope.maps[0].setCenter(new google.maps.LatLng(antsc.tasker.location.lat, antsc.tasker.location.lng));
                }, 100);
              }


          }*/

    function taskerLatLongAddress(lat, long) {
        console.log("worklocation lat long", lat, long);
        var latlng = new google.maps.LatLng(lat, long);
        var geocoder = geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 'latLng': latlng }, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                if (results[1]) {
                    $scope.$apply(function () {
                        antsc.tasker.availability_address = results[1].formatted_address;
                    });
                }
            }
        })
        antsc.tasker.location.lng = long;
        antsc.tasker.location.lat = lat;
    }

    function calculate_age(birth_month, birth_day, birth_year, dobdate) {
        console.log("birth_month, birth_day, birth_year, dobdate", birth_month, birth_day, birth_year, dobdate);
        var names = dobdate.getDate();
        var month = dobdate.getMonth() + 1;
        var year = dobdate.getFullYear();
        var date = new Date();
        var currentDate = date.getDate();
        var currentMonth = date.getMonth() + 1;
        var conditionyear = date.getFullYear() - 18;
        if (conditionyear == year) {
            if (month <= currentMonth) {
                if (names <= currentDate) {
                    return true;
                } else {
                    //  toastr.error("Tasker Age must be above 18!");
                    return false;

                }
            } else {
                //  toastr.error("Tasker Age must be above 18!");
                return false;
            }

        } else if (conditionyear < year) {
            //toastr.error("Tasker Age must be above 18!");
            return false;
        } else if (conditionyear > year) {
            return true;
        }
    }
    $scope.today = function () {
        antsc.dob = new Date();
        antsc.tasker.birthdate.year = antsc.dob.getFullYear();
        antsc.tasker.birthdate.month = antsc.dob.getMonth() + 1;
        antsc.tasker.birthdate.date = antsc.dob.getDate();
    };

    $scope.today = function () {
        $scope.dt = new Date();
    };

    $scope.today();

    $scope.toggleMin = function () {
        $scope.minDate = $scope.minDate ? null : new Date();
    };
    $scope.toggleMin();

    $scope.status = {
        opened: false
    };

    $scope.open = function ($event) {
        $scope.status.opened = true;
    };


    $scope.dateOptions = {
        formatYear: 'yy',
        startingDay: 1,
        'class': 'datepicker'
    };

    $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
    $scope.format = $scope.formats[0];


    TaskersService.getQuestion().then(function (respo) {
        antsc.getQuestion = respo;
    });

    antsc.availability = {};

    var availableTimingSlotList = [{ slot: 0, time: "12AM - 1AM", selected: false }, { slot: 1, time: "1AM - 2AM", selected: false }, { slot: 2, time: "2AM - 3AM", selected: false }, { slot: 3, time: "3AM - 4AM", selected: false }, { slot: 4, time: "4AM - 5AM", selected: false }, { slot: 5, time: "5AM - 6AM", selected: false }, { slot: 6, time: "6AM - 7AM", selected: false }, { slot: 7, time: "7AM - 8AM", selected: false }, { slot: 8, time: "8AM - 9AM", selected: false }, { slot: 9, time: "9AM - 10AM", selected: false }, { slot: 10, time: "10AM - 11AM", selected: false }, { slot: 11, time: "11AM - 12PM", selected: false }, { slot: 12, time: "12PM - 1PM", selected: false }, { slot: 13, time: "1PM - 2PM", selected: false }, { slot: 14, time: "2PM - 3PM", selected: false }, { slot: 15, time: "3PM - 4PM", selected: false }, { slot: 16, time: "4PM - 5PM", selected: false }, { slot: 17, time: "5PM - 6PM", selected: false }, { slot: 18, time: "6PM - 7PM", selected: false }, { slot: 19, time: "7PM - 8PM", selected: false }, { slot: 20, time: "8PM - 9PM", selected: false }, { slot: 21, time: "9PM - 10PM", selected: false }, { slot: 22, time: "10PM - 11PM", selected: false }, { slot: 23, time: "11PM - 12AM", selected: false }];

    var workingDays = [
    { day: "Sunday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
    { day: "Monday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
    { day: "Tuesday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false},
    { day: "Wednesday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false},
    { day: "Thursday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false},
    { day: "Friday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false},
    { day: "Saturday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false}];

    antsc.tasker.working_days = workingDays;

    $scope.clearSlots = function(day, wholeday, parentkey, event) {
        angular.forEach(antsc.tasker.working_days, function (days, key) {
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

    antsc.taskerareaChanged = function () {
        antsc.taskerPlace = this.getPlace();
        antsc.tasker.location.lng = antsc.taskerPlace.geometry.location.lng();
        antsc.tasker.location.lat = antsc.taskerPlace.geometry.location.lat();
        antsc.tasker.availability_address = antsc.taskerPlace.formatted_address;
        /*if (typeof antsc.taskerPlace.geometry.location.lng() != 'undefined' && typeof antsc.taskerPlace.geometry.location.lat() != 'undefined') {
            var locationa = antsc.taskerPlace;
            var dummy = locationa.address_components.filter(function (value) {
                return value.types[0] == "sublocality_level_1";
            }).map(function (data) {
                return data;
            });
            antsc.dummyAddress = dummy.length;
        } else {
            toastr.error('Invalid Location')
        }*/

    }
    var i = 0;
    antsc.mapToInput = function (event) {

        if ($scope.maps[0]) {
            antsc.tasker.radius = parseInt($scope.maps[0].shapes.circle.radius / antsc.radiusval);
            var lat = $scope.maps[0].shapes.circle.center.lat();
            var lng = $scope.maps[0].shapes.circle.center.lng();
            var latlng = new google.maps.LatLng(lat, lng);
            var geocoder = geocoder = new google.maps.Geocoder();
            geocoder.geocode({ 'latLng': latlng }, function (results, status) {
                if (status == 'OK') {
                    $scope.$apply(function () {
                        if (i > 0) {
                            antsc.taskerPlace = {};
                        }
                        i + 1;
                        antsc.tasker.availability_address = results[0].formatted_address;
                        antsc.taskerareaaddress = results[0].formatted_address;
                        antsc.temp_taskerareaaddress = results[0].formatted_address;
                        antsc.tasker.location = {};
                        antsc.tasker.location.lng = lng;
                        antsc.tasker.location.lat = lat;
                    });
                }
            });
        }
    }

    $scope.today();

    antsc.placeChanged = function () {
        antsc.place = this.getPlace();
        antsc.tasker.location.lng = antsc.place.geometry.location.lng();
        antsc.tasker.location.lat = antsc.place.geometry.location.lat();
        antsc.tasker.availability_address = antsc.place.formatted_address;
        var locationa = antsc.place;
        antsc.tasker.address.formatted_address = antsc.place.formatted_address;
        antsc.tasker.address.line1 = antsc.place.formatted_address;
        antsc.tasker.address.line2 = '';

        if (locationa.name) {
            antsc.tasker.address.line1 = locationa.name;
        }

        for (var i = 0; i < locationa.address_components.length; i++) {
            for (var j = 0; j < locationa.address_components[i].types.length; j++) {
                if (locationa.address_components[i].types[j] == 'neighborhood') {
                    if (antsc.tasker.address.line1 != locationa.address_components[i].long_name) {
                        if (antsc.tasker.address.line1 != '') {
                            antsc.tasker.address.line1 = antsc.tasker.address.line1 + ',' + locationa.address_components[i].long_name;
                        } else {
                            antsc.tasker.address.line1 = locationa.address_components[i].long_name;
                        }
                    }
                }
                if (locationa.address_components[i].types[j] == 'route') {
                    if (antsc.tasker.address.line1 != locationa.address_components[i].long_name) {
                        if (antsc.tasker.address.line2 != '') {
                            antsc.tasker.address.line2 = antsc.tasker.address.line2 + ',' + locationa.address_components[i].long_name;
                        } else {
                            antsc.tasker.address.line2 = locationa.address_components[i].long_name;
                        }
                    }

                }
                if (locationa.address_components[i].types[j] == 'street_number') {
                    if (antsc.tasker.address.line2 != '') {
                        antsc.tasker.address.line2 = antsc.tasker.address.line2 + ',' + locationa.address_components[i].long_name;
                    } else {
                        antsc.tasker.address.line2 = locationa.address_components[i].long_name;
                    }

                }
                if (locationa.address_components[i].types[j] == 'sublocality_level_1') {
                    if (antsc.tasker.address.line2 != '') {
                        antsc.tasker.address.line2 = antsc.tasker.address.line2 + ',' + locationa.address_components[i].long_name;
                    } else {
                        antsc.tasker.address.line2 = locationa.address_components[i].long_name;
                    }

                }
                if (locationa.address_components[i].types[j] == 'locality') {

                    antsc.tasker.address.city = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'country') {

                    antsc.tasker.address.country = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'postal_code') {

                    antsc.tasker.address.zipcode = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'administrative_area_level_1' || locationa.address_components[i].types[j] == 'administrative_area_level_2') {
                    antsc.tasker.address.state = locationa.address_components[i].long_name;
                }
            }
        }
    };


    if (antsc.tasker.working_area.coordinates) {
        antsc.onMapOverlayCompleted = function (e) {
            var arr = [];
            antsc.tasker.working_area = {};
            antsc.tasker.working_area.coordinates = [];
            e.getPath().forEach(function (latLng) { arr.push(latLng.toString()); });
            for (var i = 0; i < arr.length; i++) {
                var latlang = arr[i].replace(/[()]/g, '');
                var latlng = latlang.split(', ');
                antsc.tasker.working_area.coordinates[0].push(latlng);
            }
        };
    }


    antsc.availabilitiesModelOpen = function (size, index) {
        var modalInstance = $modal.open({
            animation: true,
            template: '<div class="availabilities-day-form adminweekmodal" ><div class=""><div class=""><div class="modal-header modal-header-success"><button class="close" type="button" ng-click="cancel()">×</button><h1 class="day-text">{{WorkingDays.day}}</h1></div><div class="modal-body"><ul class="radio-contr"><li><input ng-model ="WorkingDays.hour.morning" id="morning" class="u-hidden" type="checkbox" value="morning" name="windowFields"><label class="switch" for="morning"></label><label for="morning">Morning (8am - 12pm)</label></li><li><input ng-model ="WorkingDays.hour.afternoon" id="evenig" class="u-hidden" type="checkbox" value="morning" name="windowFields"><label class="switch" for="evenig"></label><label for="evenig">Afternoon (12pm - 4pm)</label></li><li><input id="afternoon" ng-model ="WorkingDays.hour.evening" class="u-hidden" type="checkbox" value="morning" name="windowFields"><label class="switch" for="afternoon"></label><label for="afternoon">Evening (4pm - 8pm)</label></li></ul></div><div class="modal-footer"><button type="button" class="btn btn-default pull-left" ng-click="ok()" >Save</button></div></div></div></div>',
            controller: 'ModalInstanceWorkingDayCtrl',
            size: size,
            resolve: {
                WorkingDays: function () {
                    return antsc.tasker.working_days;
                },
                selectedIndex: function () {
                    return index;
                }
            }
        });

        modalInstance.result.then(function (WorkingDays) {
            antsc.tasker.working_days[WorkingDays.selectedIndex] = WorkingDays.WorkingDays;
        }, function (dasd) {
        });
    };

    antsc.working_areas = [];
    antsc.working_areas[0] = [];

    if (antsc.tasker.working_area.coordinates) {
        angular.forEach(antsc.tasker.working_area.coordinates[0], function (value, key) {
            antsc.working_areas[0][key] = [];
            antsc.working_areas[0][key][0] = antsc.tasker.working_area.coordinates[0][key][1];
            antsc.working_areas[0][key][1] = antsc.tasker.working_area.coordinates[0][key][0];

        })
    }

    TaskersService.gettaskercategory(antsc.tasker._id).then(function (respo) {
        antsc.taskercategory = respo;
    });

    TaskersService.getCategories().then(function (respo) {
        antsc.categories = respo;
    });

    TaskersService.getExperience().then(function (respo) {
        antsc.experiences = respo;

    });
    antsc.addnewcat = function () {
        TaskersService.gettaskercategory(antsc.tasker._id).then(function (respo) {
            antsc.taskercategory = respo;
        });
    }
    TaskersService.defaultCurrency().then(function (respo) {
        antsc.defaultCurrency = respo;

    });

    antsc.tasker.taskerskills = [];
    antsc.addnewcategories = [];

    antsc.categoryModal = function (category) {
        var modalInstance = $modal.open({
            animation: true,
            templateUrl: 'app/admin/modules/taskers/views/editcategory.modal.tab.html',
            controller: 'NewCategoriesModalInstanceCtrl',
            controllerAs: 'ACM',
            resolve: {
                experiences: function () {
                    return antsc.experiences;
                },
                user: function () {
                    return antsc.tasker;
                },
                categories: function () {
                    return antsc.categories;
                },
                category: function () {
                    return category;
                },
                defaultCurrency: function () {
                    return antsc.defaultCurrency;
                }
            }
        });

        modalInstance.result.then(function (selectedCategoryData) {
            console.log("selectedCategoryData", selectedCategoryData);
            antsc.tasker.taskerskills.push(selectedCategoryData);
            antsc.tasker.imageFile.push(selectedCategoryData.file);
            antsc.addnewcategories = antsc.categories.filter(function (data) {
                return antsc.tasker.taskerskills.some(function (data2) {
                    return data2.childid == data._id;
                });
            }).map(function (mapdata) {
                return mapdata;
            })
        }, function () { });
    };

    antsc.deletecategoryitem = function (data) {
        angular.forEach(antsc.addnewcategories, function (value, key) {
            if (value._id == data) {
                antsc.addnewcategories.splice(key, 1);
                toastr.success("Category removed from the selected list");
            }
        });
        angular.forEach(antsc.tasker.taskerskills, function (value, key) {
            if (value.childid == data) {
                antsc.tasker.taskerskills.splice(key, 1);
            }
        });

    }

    antsc.deletecategory = function (category) {
        var modalInstance = $modal.open({
            animation: true,
            templateUrl: 'app/admin/modules/taskers/views/deletecategory.modal.tab.html',
            controller: 'DeleteCategoriesModalInstanceCtrl',
            controllerAs: 'DCMIC',
            resolve: {
                user: function () {
                    return antsc.tasker;
                },
                category: function () {
                    return category;
                }
            }

        });
        modalInstance.result.then(function (deletecategorydata) {
            TaskersService.deleteCategory(deletecategorydata).then(function (response) {
                toastr.success('success', 'Updated Successfully');
            }, function () {

            });
        });
    }

    antsc.submitTaskertData = function submitTaskertData(valid, data, steps) {
        antsc.tasker.role = "tasker";
        antsc.tasker.username = antsc.tasker.firstname + ' ' + antsc.tasker.lastname;
        antsc.tasker.avatar = antsc.myCroppedImage;
        if (data.phone.number && data.phone.number != undefined) {
            if (valid) {
                if (antsc.tasker.email == undefined) {
                    toastr.error('Form is Invalid');
                    return;
                }
                if (!calculate_age(antsc.tasker.birthdate.month, antsc.tasker.birthdate.date, antsc.tasker.birthdate.year, antsc.dob)) {
                    toastr.error('Your age should be 18+');
                }
                var sendData = {
                    'phone': data.phone,
                    'email': data.email
                };
                TaskersService.checkphoneno(sendData).then(function (response, err) {
                    console.log("response", response);
                    if (response == "" || response.msg == "Phone Number Already Exists") {
                        toastr.error(response.msg);
                    } else if (response.msg == "Username Already Exists") {
                        toastr.error(response.msg);
                    } else if (response.msg == "Email Id Already Exists") {
                        toastr.error(response.msg);
                    } else if (response.msg == "success") {
                        $scope.steps.step2 = true;
                    }
                }, function (err) {
                    toastr.error(err.msg);
                });
            } else {
                toastr.error('form is invalid');
            }
        } else {
            toastr.error('Please Enter the Mobile Number');
        }
    };

    antsc.saveNewTaskerPassword = function saveNewTaskerPassword(valid, data, steps) {
        antsc.tasker.role = "tasker";
        if (valid) {
            $scope.steps.step3 = true;
        } else {
            toastr.error('form is invalid');
        }
    };
    TaskersService.getQuestion().then(function (respo) {
        antsc.getQuestion = respo;
    });

    if (antsc.tasker.profile_details) {
        antsc.profileDetails = antsc.tasker.profile_details.reduce(function (total, current) {
            total[current.question] = current.answer;
            return total;
        }, {});
    } else {
        antsc.profileDetails = [];
        antsc.tasker.profile_details = [];
    }

    antsc.saveProf = function saveProf(valid, data, steps) {
        if (valid) {
            $scope.steps.step3 = true;
            var i = 0;
            for (var key in antsc.profileDetails) {

                if (antsc.profileDetails.filter(function (obj) { return obj.question === key; })[0]) {
                    antsc.tasker.profile_details[i].answer = antsc.profileDetails[key];
                } else {
                    antsc.tasker.profile_details.push({ 'question': key, 'answer': antsc.profileDetails[key] });
                }
                i++;
            }
            steps.step4 = true
        } else {
            toastr.error('form is invalid');
        }
    }
    antsc.emptyLatLng = function (temp_taskerareaaddress) {
        if (temp_taskerareaaddress != antsc.taskerareaaddress) {
            //  antsc.tasker.location = '';
        }
    }
    antsc.tasker1 = {};
    antsc.newsaveAvail = function () {
        var selected_days = [];
        if(antsc.tasker.working_days) {
            angular.forEach(antsc.tasker.working_days, function (days) {
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

        antsc.tasker.working_days = selected_days;
        antsc.tasker1 = angular.copy(antsc.tasker);

        TaskersService.addTasker(antsc.tasker, antsc.tasker1).then(function (response) {
            var _id = "";
            _id = response._id;
            antsc.tasker._id = response._id;
            toastr.success('Tasker Added Successfully');
            $state.go('app.taskers.list');
        }, function (err) {
            toastr.error('Unable to process your request');
        });

    }
};// function addNewTaskerCtrl End


angular.module('handyforall.taskers').controller('AvailabilityModalInstanceCtrl', function ($scope, $modalInstance, workingDays, workingTimes, DaysData, selectedIndex) {
    /* var aam = this;
     aam.day = data.days[data.day];
     aam.index = data.day;
     aam.working_day = workingDays[data.day];*/
    // $scope.WorkingDays = workingDays[selectedIndex];
    $scope.WorkingDays = angular.copy(workingDays[selectedIndex]);
    $scope.workingTimes = workingTimes;
    $scope.days = DaysData;

    $scope.ok = function () {
        console.log("workingdaysokokokokok", $scope.workingdays)
        if ($scope.WorkingDays.hour.morning == true || $scope.WorkingDays.hour.afternoon == true || $scope.WorkingDays.hour.evening == true) {
            $scope.WorkingDays.not_working = false;
        } else {
            $scope.WorkingDays.not_working = true;
        }
        $modalInstance.close($scope.WorkingDays, selectedIndex);
    };

    $scope.cancel = function () {
        console.log("workingdays", $scope.WorkingDays)
        $modalInstance.dismiss('cancel');
    };
});


/*angular.module('handyforall.taskers').controller('AvailabilityModalInstanceCtrl', function ($modalInstance, data, workingDays) {
    var aam = this;
    aam.day = data.days[data.day];
    aam.index = data.day;
    aam.working_day = workingDays[data.day];
    aam.ok = function (working_day, index) {
        if (aam.working_day.hour.morning == true || aam.working_day.hour.afternoon == true || aam.working_day.hour.evening == true) {
            aam.working_day.not_working = false;
        } else {
            aam.working_day.not_working = true;
        }
        var data = { 'working_day': working_day, 'index': index };
        $modalInstance.close(data);
    };

    aam.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
});*/

angular.module('handyforall.taskers').controller('ModalInstanceWorkingDayCtrl', function ($scope, $modalInstance, WorkingDays, selectedIndex) {

    $scope.totalData = {
        WorkingDays: {},
        selectedIndex: 0
    };
    $scope.WorkingDays = WorkingDays[selectedIndex];
    $scope.ok = function () {
        if ($scope.WorkingDays.hour.morning == true || $scope.WorkingDays.hour.afternoon == true || $scope.WorkingDays.hour.evening == true) {
            $scope.WorkingDays.not_working = false;
        } else {
            $scope.WorkingDays.not_working = true;
        }
        $scope.totalData.WorkingDays = $scope.WorkingDays;
        $scope.totalData.selectedIndex = selectedIndex;
        $modalInstance.close($scope.totalData);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
});




angular.module('handyforall.taskers').controller('DeleteCategoriesModalInstanceCtrl', function ($modalInstance, user, category) {

    var dcmic = this;
    dcmic.category = category;
    dcmic.user = user;

    var categoryinfo = {};
    categoryinfo.userid = user._id;
    categoryinfo.categoryid = category;


    dcmic.ok = function () {
        $modalInstance.close(categoryinfo);
    };

    dcmic.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

});


angular.module('handyforall.taskers').controller('NewCategoriesModalInstanceCtrl', function (TaskersService, experiences, user, categories, category, toastr, $modalInstance, $scope, defaultCurrency) {
    var nacm = this;
    nacm.user = user;
    nacm.categories = categories;
    nacm.defaultcurrency = defaultCurrency;
    nacm.experiences = experiences;
    nacm.category = nacm.categories.filter(function (obj) {
        return obj._id === category;
    })[0];
    nacm.selectedCategoryData = {};
    nacm.selectedCategoryData.skills = [];
    if (nacm.category) {
        nacm.mode = 'Edit';
    } else {
        nacm.mode = 'Add';
    }
    for (var i = 0; i < nacm.user.taskerskills; i++) {
        if (nacm.user.taskerskills[i].categoryid == category) {
            nacm.selectedCategoryData = nacm.user.taskerskills[i];
        }
    }

    nacm.selectedCategoryData.userid = nacm.user._id;
    nacm.selectedCategoryData.categoryid = nacm.user.categoryid;

    nacm.onChangeCategory = function (category) {
        nacm.category = nacm.categories.filter(function (obj) {
            return obj._id === category;
        })[0];
    };
    nacm.onChangeCategoryChild = function (category) {
        TaskersService.getChild(category).then(function (response) {
            nacm.MinimumAmount = response.commision;
            nacm.selectedCategoryData.hour_rate = response.commision;
            nacm.ratetype = response.ratetype;
        });
        nacm.category = nacm.user.taskerskills.filter(function (obj) {

            if (obj.childid === category) {
                toastr.error('Already the Category is Exists');
                nacm.selectedCategoryData = {};
            }
        })[0];
    };
    nacm.ok = function (valid, data) {
        if (valid) {
            //if(nacm.selectedCategoryData.hour_rate < )
            toastr.success("Category  Added To the list Successfully");
            $modalInstance.close(nacm.selectedCategoryData);
        }
        else {
            toastr.error('Please enter all values');
        }
    };
    nacm.cancel = function () {
        $modalInstance.dismiss('cancel');

    };

});
