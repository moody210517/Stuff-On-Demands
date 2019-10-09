// Added By $iva 22-02-2018

angular.module('handyforall.becometasker').controller('becomeTaskerCtrl', becomeTaskerCtrl);

becomeTaskerCtrl.$inject = ['$scope', '$compile', 'uiCalendarConfig', '$uibModal', '$state', '$cookieStore', 'CategoryserviceResolve', '$filter', 'toastr', 'AuthenticationService', '$rootScope', '$location', 'accountService', '$translate', 'NgMap', '$timeout',];

function becomeTaskerCtrl($scope, $compile, uiCalendarConfig, $uibModal, $state, $cookieStore, CategoryserviceResolve, $filter, toastr, AuthenticationService, $rootScope, $location, accountService, $translate, NgMap, $timeout) {
    var btc = this;
    $scope.oneAtATime = true;

    var workingDays = [{ day: "Sunday", hour: { "morning": false, "afternoon": false, "evening": false }, not_working: true },
    { day: "Monday", hour: { "morning": false, "afternoon": false, "evening": false }, not_working: true },
    { day: "Tuesday", hour: { "morning": false, "afternoon": false, "evening": false }, not_working: true },
    { day: "Wednesday", hour: { "morning": false, "afternoon": false, "evening": false }, not_working: true },
    { day: "Thursday", hour: { "morning": false, "afternoon": false, "evening": false }, not_working: true },
    { day: "Friday", hour: { "morning": false, "afternoon": false, "evening": false }, not_working: true },
    { day: "Saturday", hour: { "morning": false, "afternoon": false, "evening": false }, not_working: true }];

    var workingTimes = {};
    workingTimes.morning = {
        from: moment.tz(new Date(99, 5, 24, 8, 0, 0, 0), $scope.date.timezone).format($scope.date.time_format),
        to: moment.tz(new Date(99, 5, 24, 12, 0, 0, 0), $scope.date.timezone).format($scope.date.time_format)
    };
    workingTimes.afternoon = {
        from: moment.tz(new Date(99, 5, 24, 12, 0, 0, 0), $scope.date.timezone).format($scope.date.time_format),
        to: moment.tz(new Date(99, 5, 24, 16, 0, 0, 0), $scope.date.timezone).format($scope.date.time_format)
    };
    workingTimes.evening = {
        from: moment.tz(new Date(99, 5, 24, 16, 0, 0, 0), $scope.date.timezone).format($scope.date.time_format),
        to: moment.tz(new Date(99, 5, 24, 20, 0, 0, 0), $scope.date.timezone).format($scope.date.time_format)
    };

    btc.workingDays = workingDays;

    var DaysData = [{ Morning: "MORNING", afternoon: "AFTERNOON", evening: "EVENING", Save: "SAVE" }];
    angular.forEach(btc.workingDays, function (workingDays, key) {
        angular.forEach(antsc.tasker.working_days, function (UserWorkingdays) {
            if (UserWorkingdays.day == workingDays.day) {
                btc.workingDays[key] = UserWorkingdays;
            }
        })
    })
    btc.categoryList = CategoryserviceResolve;
    btc.radiusby = $rootScope.settings.distanceby;
    if (btc.radiusby == 'km') {
        btc.radiusval = 1000;
    }
    else {
        btc.radiusval = 1609.34;
    }

    angular.forEach(btc.categoryList, function (parentvalue, parentIndex) {
        angular.forEach(parentvalue.category, function (value, index) {
            if (index == 0) {
                value.active = true;
                value.terms = false;
                value.quick_pitch = '';
                value.hour_rate = '';
                value.experience = '';
            } else {
                value.active = false;
                value.terms = false;
                value.quick_pitch = '';
                value.hour_rate = '';
                value.experience = '';
            }
            angular.forEach(value.skills, function (skills) {
                skills.selected = false;
            })
        });
    });

    btc.selectedcategory = [];
    btc.selectedcategory = btc.categoryList[0].category[0];
    var user = AuthenticationService.GetCredentials();
    $scope.avatar = '';
    btc.data = {
        gender: '',
        birthdate: { year: '', month: '', date: '' },
        working_days: workingDays,
        avatar: '',
        next: 'step2',
        taskerskills: [],
        Map: [],
    };
    btc.data = $cookieStore.get('TaskerData') || btc.data;
    btc.data.centerMap = btc.data.location;
    if (btc.WorkingDate) {
        //btc.WorkingDate = new Date(btc.WorkingDate);
    } else {
        //btc.WorkingDate = new Date();
    }

    // Croping
    $scope.visibleValue = false;
    $scope.myImage = '';
    btc.myCroppedImage = '';
    //$scope.cropType = 'circle'; // circle & square
    $scope.handleFileSelect = function (evt) {
        var file = evt.currentTarget.files[0];
        if(file.$errorParam == '1MB' || file.$error == 'pattern') {
            $scope.visibleValue = false;
            file = null;
        } else {
            $scope.visibleValue = true;
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
    };
    // End Croping

    // when page refresh reset the skills page
    angular.forEach(btc.data.taskerskills, function (taskerskills) {
        angular.forEach(btc.categoryList, function (categoryList) {
            if (taskerskills.categoryid == categoryList._id) {
                categoryList.terms = taskerskills.terms;
                categoryList.quick_pitch = taskerskills.quick_pitch;
                categoryList.hour_rate = taskerskills.hour_rate;
                categoryList.experience = taskerskills.experience;
                //categoryList.file=taskerskills.file;
                angular.forEach(taskerskills.skills, function (taskerskillArr) {
                    angular.forEach(categoryList.skills, function (categoryskillArr) {
                        if (categoryskillArr.tags == taskerskillArr.tags) {
                            categoryskillArr.selected = true;
                        }
                    });
                });
            }
        })
    })

    accountService.getExperience().then(function (respo) {
        btc.experience = respo;
    });

    btc.placeChanged = function () {

        btc.data.address.line1 = '';
        btc.data.address.line2 = '';
        btc.data.address.city = '';
        btc.data.address.state = '';
        btc.data.address.country = '';
        btc.data.address.zipcode = '';

        btc.details = {}
        btc.place = this.getPlace();
        btc.data.tasker_area = {};
        btc.data.tasker_area.lng = btc.place.geometry.location.lng();
        btc.data.tasker_area.lat = btc.place.geometry.location.lat();
        btc.details.location = btc.data.tasker_area;
        btc.data.address.line1 = btc.place.formatted_address;
        var locationa = btc.place;

        if (locationa.name) {
            btc.data.address.line1 = locationa.name;
        }

        for (var i = 0; i < locationa.address_components.length; i++) {
            for (var j = 0; j < locationa.address_components[i].types.length; j++) {
                if (locationa.address_components[i].types[j] == 'neighborhood') {
                    if (btc.data.address.line1 != locationa.address_components[i].long_name) {
                        if (btc.data.address.line1 != '') {
                            btc.data.address.line1 = btc.data.address.line1 + ',' + locationa.address_components[i].long_name;
                        } else {
                            btc.data.address.line1 = locationa.address_components[i].long_name;
                        }
                    }
                }
                if (locationa.address_components[i].types[j] == 'route') {
                    if (btc.data.address.line1 != locationa.address_components[i].long_name) {
                        if (btc.data.address.line2 != '') {
                            btc.data.address.line2 = btc.data.address.line2 + ',' + locationa.address_components[i].long_name;
                        } else {
                            btc.data.address.line2 = locationa.address_components[i].long_name;
                        }
                    }

                }
                if (locationa.address_components[i].types[j] == 'street_number') {
                    if (btc.data.address.line2 != '') {
                        btc.data.address.line2 = btc.data.address.line2 + ',' + locationa.address_components[i].long_name;
                    } else {
                        btc.data.address.line2 = locationa.address_components[i].long_name;
                    }

                }
                if (locationa.address_components[i].types[j] == 'sublocality_level_1') {
                    if (btc.data.address.line2 != '') {
                        btc.data.address.line2 = btc.data.address.line2 + ',' + locationa.address_components[i].long_name;
                    } else {
                        btc.data.address.line2 = locationa.address_components[i].long_name;
                    }

                }
                if (locationa.address_components[i].types[j] == 'locality') {

                    btc.data.address.city = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'country') {

                    btc.data.address.country = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'postal_code') {

                    btc.data.address.zipcode = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'administrative_area_level_1' || locationa.address_components[i].types[j] == 'administrative_area_level_2') {
                    btc.data.address.state = locationa.address_components[i].long_name;
                }
            }
        }

        var componentForm = {
            street_number: 'short_name',
            route: 'long_name',
            locality: 'long_name',
            administrative_area_level_1: 'short_name',
            country: 'long_name',
            postal_code: 'short_name'
        };

        for (var i = 0; i < locationa.address_components.length; i++) {
            var addressType = locationa.address_components[i].types[0];
            if (componentForm[addressType]) {
                var val = locationa.address_components[i][componentForm[addressType]];
                componentForm[addressType].value = val;
            }
        }
    };

    btc.taskerareaChanged = function () {
        btc.place = this.getPlace();
        btc.data.location = {};
        btc.data.location.lng = btc.place.geometry.location.lng();
        btc.data.location.lat = btc.place.geometry.location.lat();
        btc.data.availability_address = btc.place.formatted_address;
        var locationa = btc.place;

        var dummy = locationa.address_components.filter(function (value) {
            return value.types[0] == "locality";
        }).map(function (data) {
            return data;
        });
        btc.dummyAddress = dummy.length;
    };

    btc.filter = {};
    btc.format = 'dd-MM-yyyy';

    btc.filterDate = function () {

        btc.data.birthdate.year = btc.WorkingDate.getFullYear();
        btc.data.birthdate.month = btc.WorkingDate.getMonth() + 1;
        btc.data.birthdate.date = btc.WorkingDate.getDate();
        console.log("ggg", btc.data.birthdate.month, btc.data.birthdate.date, btc.data.birthdate.year);
        if (calculate_age(btc.data.birthdate.month, btc.data.birthdate.date, btc.data.birthdate.year, btc.WorkingDate)) {
            btc.data.birthdate.year = btc.WorkingDate.getFullYear();
            btc.data.birthdate.month = btc.WorkingDate.getMonth() + 1;
            btc.data.birthdate.date = btc.WorkingDate.getDate();
        } else {
            $translate('YOURS AGE SHOULD BE 18').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }

    }


    btc.selectedCategory = function (parentindex, index) {
        btc.selectedcategory = $filter('filter')(btc.categoryList[parentindex].category, { "active": true });
        btc.selectedcategory[0].active = false;
        btc.categoryList[parentindex].category[index].active = true;
        btc.selectedcategory = btc.categoryList[parentindex].category[index];
        btc.flag = false;
    }
    btc.booleanValue = false;
    btc.emailchange = function (email) {
        if (email == undefined) {
            $translate('INVALID EMAIL ID').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        } else {
            AuthenticationService.checktaskeremail(email).then(function (err, data) {
                if (err.message == 'Email Exist') {
                    btc.booleanValue = true;
                    $translate('SORRY EMAIL ID ALREADY EXIST').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                } else if (err.message == 'Email not exist') {
                    btc.booleanValue = false;
                    $translate('VALID EMAIL ID').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                }
            });
        }
    }
    btc.taskernamechange = function (tasker) {
        if (tasker == undefined) {
            $translate('INVALID TASKER').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        } else {
            AuthenticationService.taskername(tasker).then(function (err, data) {
                if (err.message == 'Tasker Exist') {
                    btc.booleanValue = true;
                    btc.data.username = '';
                    $translate('SORRY USERNAME ALREADY EXIST').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                } else if (err.message == 'Tasker not exist') {
                    btc.booleanValue = false;
                    $translate('VALID USERNAME').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                }
            });
        }
    }
    btc.phonechange = function (phone) {
        if (phone == undefined) {
            $translate('INVALID PHONE NUMBER').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        } else {
            AuthenticationService.taskerphone(phone).then(function (err, data) {
                if (err.message == 'Phone Exist') {
                    btc.data.phone = { "code": "", "number": "" };
                    btc.booleanValue = true;
                    $translate('SORRY PHONE NUMBER ALREADY EXIST').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                } else if (err.message == 'Phone not exist') {
                    btc.booleanValue = false;
                    $translate('VALID PHONE NUMBER').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                }
            });
        }
    }
    btc.emptyLatLng = function () {
        btc.data.tasker_area = undefined;
    }

    /*btc.Datacokie = function (data) {
          $cookieStore.put('TaskerData', btc.data);

      }*/

    btc.SubmitinfoTasker = function (valid) {
        if (valid) {
            //$cookieStore.remove('TaskerData');
            btc.data.avatarBase64 = btc.myCroppedImage;
            if (btc.booleanValue == true) {
                $translate('SORRY EMAIL ID ALREADY EXIST').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            } else {
                if (typeof btc.data.tasker_area != 'undefined' && typeof btc.data.tasker_area.lat != 'undefined' && typeof btc.data.tasker_area.lng != 'undefined') {
                    if (typeof btc.data.phone != "undefined" && typeof btc.data.phone.code != "undefined" && typeof btc.data.phone.number != "undefined") {
                        accountService.checkphoneno(btc.data.phone).then(function (response) {
                            if (response.length > 0) {
                                $translate('Phone Number Already Existed!').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                            } else {
                                $cookieStore.put('TaskerData', btc.data);
                                $state.go('becometasker.' + btc.data.next, {}, { reload: false });
                            }
                        });
                    } else {
                        $translate('Phone Number is required!').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                    }
                } else {
                    $translate('Invalid City').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                }
            }
        } else {
            $translate('PLEASE FILL ALL MANDATORY FIELDS').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }
    };


    function taskerLatLongAddress(lat, long) {
        var latlng = new google.maps.LatLng(lat, long);
        var geocoder = geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 'latLng': latlng }, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                if (results[1]) {
                    $scope.$apply(function () {
                        btc.data.availability_address = results[1].formatted_address;
                        btc.taskerareaaddress = results[1].formatted_address;
                        btc.temp_taskerareaaddress = btc.taskerareaaddress;
                    });
                }
            }
        })
        btc.data.location.lng = long;
        btc.data.location.lat = lat;
    }


    btc.data.location = {};

    $scope.maps = [];
    btc.SubmitTasker = function (page, valid) {
        $scope.$on('mapInitialized', function (evt, evtMap) {
            $scope.maps.push(evtMap);
        });
        if (valid) {

            btc.data.avatar = btc.myCroppedImage;
            if (!btc.data.radius) {
                btc.data.radius = 50;
            }
            if (!btc.taskerareaaddress) {
                navigator.geolocation.getCurrentPosition(function (pos) {
                    taskerLatLongAddress(pos.coords.latitude, pos.coords.longitude);
                }, function (failure) {
                    $.getJSON('https://ipinfo.io/geo', function (response) {
                        var loc = response.loc.split(',');
                        taskerLatLongAddress(loc[0], loc[1]);
                    });
                })
            }

            if (btc.data.avatar && page != 1) {
                $cookieStore.put('TaskerData', btc.data);
                $state.go('becometasker.' + btc.data.next, {}, { reload: false });
            } else if (btc.data.birthdate.month && btc.data.birthdate.date && btc.data.birthdate.year) {
                if (calculate_age(btc.data.birthdate.month, btc.data.birthdate.date, btc.data.birthdate.year, btc.WorkingDate)) {
                    $cookieStore.put('TaskerData', btc.data);
                    $state.go('becometasker.' + btc.data.next, {}, { reload: false });
                } else {
                    $translate('YOURS AGE SHOULD BE 18').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                }
            } else {
                toastr.error("please select age");

            }
        }

    };

    btc.mapToInput = function (event) {
        if ($scope.maps[0]) {
            btc.data.radius = parseInt($scope.maps[0].shapes.circle.radius / btc.radiusval);
            var lat = $scope.maps[0].shapes.circle.center.lat();
            var lng = $scope.maps[0].shapes.circle.center.lng();
            var latlng = new google.maps.LatLng(lat, lng);
            var geocoder = geocoder = new google.maps.Geocoder();
            geocoder.geocode({ 'latLng': latlng }, function (results, status) {
                if (status == 'OK') {
                    $scope.$apply(function () {
                        btc.place = {};
                        btc.data.availability_address = results[0].formatted_address;
                        btc.taskerareaaddress = results[0].formatted_address;
                        btc.temp_taskerareaaddress = btc.taskerareaaddress;
                        btc.data.location = {};
                        btc.data.location.lng = lng;
                        btc.data.location.lat = lat;
                    });
                }
            });
        }
    }

    function calculate_age(birth_month, birth_day, birth_year, dobdate) {
        // var today_date = new Date();
        // var today_year = today_date.getFullYear();
        // var today_month = today_date.getMonth();
        // var today_day = today_date.getDate();
        // var age = today_year - birth_year;

        // if (today_month < (birth_month - 1)) {
        // 	age--;
        // }
        // if (((birth_month - 1) == today_month) && (today_day < birth_day)) {
        // 	age--;
        // }
        // console.log("age",age);
        // return age;

        var names = dobdate.getDate();
        var month = dobdate.getMonth() + 1;
        var year = dobdate.getFullYear();
        console.log("names,month,year", names, month, year);
        var date = new Date();
        var currentDate = date.getDate();
        var currentMonth = date.getMonth() + 1;
        var conditionyear = date.getFullYear() - 18;
        console.log("names,month,year", conditionyear, currentMonth, currentDate);
        if (conditionyear == year) {
            if (month <= currentMonth) {
                if (names <= currentDate) {
                    return true;
                } else {
                    //toastr.error("Tasker Age must be above 18!");
                    return false;

                }
            } else {
                //toastr.error("Tasker Age must be above 18!");
                return false;


            }

        } else if (conditionyear < year) {
            //toastr.error("Tasker Age must be above 18!");
            return false;
        } else if (conditionyear > year) {
            return true;
        }

    }

    $scope.surveyFiles = [];
	/*
	$scope.$watch('surveyFiles', function (newValue, oldValue) {
	});
	$scope.$watch('avatar', function (newValue, oldValue) {
	});
	*/
    btc.taskerData = {};
    btc.taskerData.profile_details = [];

    btc.TaskerRegister = function (valid) {
        btc.taskerData = {};
        if (valid > 0) {
            btc.taskerData = angular.copy(btc.data);
            console.log(btc.taskerData);
            //btc.taskerData.working_days = $filter('filter')(new Date(btc.taskerData.working_days), { "not_working": false });
            btc.taskerData.taskerfile = [];
            btc.taskerData.taskerfile = $scope.surveyFiles;

            AuthenticationService.BecomeTaskerRegister(btc.taskerData, function (err, response) {
                if (err) {
                    $translate('YOUR CREDENTIALS ARE WRONG' + err).then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                } else {
                    if (response.ok) {
                        AuthenticationService.SetCredentials(user.currentUser.username, user.currentUser.user_id, user.currentUser.authdata, 'tasker', 1)
                        $rootScope.$emit('eventName', { count: 0 });
                        $cookieStore.remove('TaskerData');
                        $translate('TASKER ADDED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                        $location.path('/account');
                    }
                    if (response.errors) {
                        toastr.error(response.errors);
                    }
                    else {
                        $cookieStore.remove('TaskerData');
                        $state.go('becometasker.success', {}, { reload: false });
                    }
                }
            });
        } else {
            $translate('SELECT ATLEAST ONE OF THE SKILLS').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }
    }

    btc.taskerskills = angular.copy(btc.data.taskerskills);
    btc.addskills = function (valid) {
        if (valid) {
            var skills = $filter('filter')(btc.selectedcategory.skills, { "selected": true });
            angular.forEach(skills, function (value) {
                delete value.selected;
            });

            var DefaultCurrency = {}
            DefaultCurrency = $scope.DefaultCurrency;
            var data = { categoryid: btc.selectedcategory.parent, childid: btc.selectedcategory._id, terms: btc.selectedcategory.terms, quick_pitch: btc.selectedcategory.quick_pitch, hour_rate: (btc.selectedcategory.hour_rate / DefaultCurrency[0].value), experience: btc.selectedcategory.experience, file: btc.selectedcategory.file, skills: skills };
            var insetflag = true;

            angular.forEach(btc.taskerskills, function (value, key) {
                if (value.childid == btc.selectedcategory._id) {
                    insetflag = false;
                    btc.taskerskills[key] = data;
                }
            })
            if (insetflag) {
                btc.taskerskills.push(data);
            }
            btc.data.taskerskills = angular.copy(btc.taskerskills);
            $cookieStore.put('TaskerData', btc.data);
            $translate('SKILLS UPDATED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
            btc.flag = false;
        }
    };

    btc.emptyLatLng = function (temp_taskerareaaddress) {
        if (temp_taskerareaaddress != btc.taskerareaaddress) {
            btc.data.location = '';
        }
    }

    btc.SubmitTaskerlocation = function (valid, radiusvalue) {
        btc.data.radius = radiusvalue;
        if ((btc.data.working_days[6].not_working == false || btc.data.working_days[5].not_working == false ||
            btc.data.working_days[4].not_working == false || btc.data.working_days[3].not_working == false || btc.data.working_days[2].not_working == false ||
            btc.data.working_days[1].not_working == false || btc.data.working_days[0].not_working == false)) {
            if (calculate_age(btc.data.birthdate.month, btc.data.birthdate.date, btc.data.birthdate.year, btc.WorkingDate)) {
                // if (btc.data.location == '') {
                //     $translate('INVALID WORK LOCATION').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                //     return
                // } else {
                    $cookieStore.put('TaskerData', btc.data);
                    $state.go('becometasker.' + btc.data.next, {}, { reload: false });
                //}
            } else {
                $translate('YOURS AGE SHOULD BE 18').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            }
        } else {
            $translate('PLEASE SELECT YOUR WORKING DAYS').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }
    };


    btc.availabilitiesModelOpen = function (size, index) {
        var modalInstance = $uibModal.open({
            animation: true,
            backdrop: 'static',
            keyboard: false,
            templateUrl: 'app/site/modules/tasker/views/availabilitypop.modal.tab.html',
            controller: 'ModalInstanceWorkingDayCtrl',
            size: size,
            resolve: {
                WorkingDays: function () {
                    return btc.data.working_days;
                },
                workingTimes: function () {
                    return workingTimes;
                },
                DaysData: function () {
                    return DaysData;
                },
                selectedIndex: function () {
                    return index;
                },

            }
        });

        modalInstance.result.then(function (WorkingDays, selectedIndex) {
            btc.data.working_days[selectedIndex] = WorkingDays;

        }, function () {
        });
    };

    accountService.getCategories().then(function (respo) {
        btc.categories = respo;
    });
    accountService.getExperience().then(function (respo) {
        btc.experiences = respo;
    });

    btc.data.taskerskills = [];
    btc.selectedCat = [];
    btc.categoryModal = function (category) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'app/site/modules/tasker/views/addcategory.model.tab.html',
            controller: 'ModalInstancecategory',
            controllerAs: 'ACM',
            resolve: {
                experiences: function () {
                    return btc.experiences;
                },
                defaultcurrency: function () {
                    return $scope.DefaultCurrency;
                },
                user: function () {
                    return btc.data;
                },
                selectedCat: function () {
                    return btc.selectedCat;
                },
                categories: function () {
                    return btc.categories;
                },
                category: function () {
                    return category;
                }
            }
        });
        modalInstance.result.then(function (selectedCategoryData) {

            var mode = selectedCategoryData.mode;
            delete selectedCategoryData.mode;

            if (mode == 'Add') {
                btc.taskerskills.push(selectedCategoryData);
                btc.selectedCat.push(selectedCategoryData.childid);
            } else {
                for (var i = 0; i < btc.taskerskills.length; i++) {
                    if (btc.taskerskills[i].childid == selectedCategoryData.childid) {
                        btc.taskerskills[i] = selectedCategoryData;
                    }
                }
            }

            btc.data.taskerskills = btc.taskerskills;

            btc.addnewcategories = btc.categories.filter(function (data) {
                return btc.data.taskerskills.some(function (data2) {
                    return data2.childid == data._id;
                });
            }).map(function (mapdata) {
                return mapdata;
            })


        }, function () { });
    };

    btc.deletecategoryitem = function (data) {

        var indexx = btc.selectedCat.indexOf(data);
        btc.selectedCat.splice(indexx, 1);

        angular.forEach(btc.addnewcategories, function (value, key) {
            if (value._id == data) { btc.addnewcategories.splice(key, 1); }
        });

        angular.forEach(btc.data.taskerskills, function (value, key) {
            if (value.childid == data) {
                btc.taskerskills.splice(key, 1);
            }
        });
    }


}

angular.module('handyforall.becometasker').controller('ModalInstanceWorkingDayCtrl', function ($scope, $uibModalInstance, DaysData, WorkingDays, workingTimes, selectedIndex) {
    $scope.WorkingDays = angular.copy(WorkingDays[selectedIndex]);
    $scope.workingTimes = workingTimes;
    $scope.days = DaysData;



    $scope.ok = function ok() {

        if ($scope.WorkingDays.hour.morning == true || $scope.WorkingDays.hour.afternoon == true || $scope.WorkingDays.hour.evening == true) {
            $scope.WorkingDays.not_working = false;
        } else {
            $scope.WorkingDays.not_working = true;
        }

        $uibModalInstance.close($scope.WorkingDays, selectedIndex);
    };
    $scope.cancel = function (WorkingDays) {
        console.log("NTR")
        $uibModalInstance.dismiss('cancel');
    };
})
angular.module('handyforall.accounts').directive('cropImgChange', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var onChangeHandler = scope.$eval(attrs.cropImgChange);
            element.bind('change', onChangeHandler);
        }
    };
});

/*angular.module('handyforall.becometasker').controller('ModalInstancecategory', function (accountService, $uibModalInstance, experiences, user, toastr, categories, category, selectedCat, defaultcurrency, $translate) {
    var acm = this;
    acm.user = user;
    acm.selectedCat = selectedCat;
    acm.categories = categories;
    acm.defaultcurrency = defaultcurrency;
    acm.experiences = experiences;

    acm.selectedCategoryData = {};
    if (category) {
        acm.mode = 'Edit';
        accountService.getChild(category).then(function (response) {
            acm.MinimumAmount = response.commision;
            acm.ratetype = response.ratetype;
        });
    } else {
        acm.mode = 'Add';
        acm.categories = acm.categories.filter(function (obj) {
            return acm.selectedCat.indexOf(obj._id) === -1;
        });
    }

    for (var i = 0; i < acm.user.taskerskills.length; i++) {
        if (acm.user.taskerskills[i].childid == category) {
            acm.selectedCategoryData = angular.copy(acm.user.taskerskills[i]);
        }
    }

    acm.onChangeCategory = function (category) {
        acm.category = acm.categories.filter(function (obj) {
            return obj._id === category;
        })[0];
    };

    acm.onChangeCategoryChild = function (category) {
        accountService.getChild(category).then(function (response) {
            acm.MinimumAmount = response.commision;
            acm.ratetype = response.ratetype;
        });
    };

    acm.ok = function (valid, data) {
        if (valid) {
            acm.selectedCategoryData.mode = acm.mode;
            $uibModalInstance.close(acm.selectedCategoryData);
        } else {
            toastr.error('Please enter all values');
        }
    };

    acm.cancel = function () {
        $uibModalInstance.dismiss('cancel');

    };

});*/
