angular.module('handyforall.authentication')
    .controller('registerCtrl', registerCtrl)
    .controller('DeactivateController', DeactivateController)
    .controller('userloginCtrl', userloginCtrl)
    .controller('taskerloginCtrl', taskerloginCtrl);

taskerloginCtrl.$inject = ['$scope', '$rootScope', '$location', 'AuthenticationService', '$state', 'toastr', '$cookieStore', 'socket', '$translate'];

function taskerloginCtrl($scope, $rootScope, $location, AuthenticationService, $state, toastr, $cookieStore, socket, $translate) {
    AuthenticationService.ClearCredentials();
    $scope.login = function () {
        AuthenticationService.taskerLogin($scope.username, $scope.password, function (response) {
            if ($scope.username && (response.user == $scope.username || response.email == $scope.username || response.phone == $scope.username)) {
                AuthenticationService.SetCredentials(response.user, response.user_id, response.token, response.user_type, response.tasker_status);
                localStorage.removeItem('TaskerData');
                $rootScope.$emit('notification', { user: response.user_id, type: response.user_type });
                $rootScope.$emit('webNotification', { user: response.user_id, type: response.user_type });
                $state.go('account', {}, { reload: true });
            } else {
                $scope.error = response.message || "INVALIDUSERNAME_PASSWORD";
            }
        }, function (err) {
            $scope.error = err;
        });
    };
}

userloginCtrl.$inject = ['$scope', '$http', '$rootScope', '$uibModal', '$location', 'AuthenticationService', '$state', 'toastr', '$cookieStore', 'socket', 'PreviousState', '$window', '$translate', 'MainService', 'routes', '$stateParams'];

function userloginCtrl($scope, $http, $rootScope, $uibModal, $location, AuthenticationService, $state, toastr, $cookieStore, socket, PreviousState, $window, $translate, MainService, routes, $stateParams) {

    var ulgc = this;

    if ($stateParams.type == 'tasker') {
        $scope.activeUserTab = false;
        $scope.activeTaskerTab = true;
    } else {
        $scope.activeUserTab = true;
        $scope.activeTaskerTab = false;
    }

    ulgc.showuserotpform = false;
    ulgc.showtaskermobileform = true;
    ulgc.showtaskerotpform = false;

    AuthenticationService.ClearCredentials();

    ulgc.generateotp = function (isValid, type, phone) {
        if (isValid) {
            AuthenticationService.phonecheck(type, phone).then(function (err, data) {
                if (err.message == 'Phone Number Exist') {
                    var data = {};
                    data.code = phone.code;
                    data.phone = phone.number;

                    MainService.generateotp(data).then(function (response, err) {
                        if (response) {
                            if (type == 'user') {
                                ulgc.showuserotpform = true;

                                if (response.sms == 'development') {
                                    ulgc.userotp = response.otpkey;
                                }
                                ulgc.oldotp = response.otpkey;
                                toastr.success('OTP sent successfully');
                            } else {
                                ulgc.showtaskerotpform = true;
                                if (response.sms == 'development') {
                                    ulgc.taskerotp = response.otpkey;
                                }
                                ulgc.oldotp = response.otpkey;
                                toastr.success('OTP sent successfully');
                            }
                        }
                    });
                } else if (err.message == 'Phone Number not exist') {
                    toastr.error('Please enter your registered mobile number');
                }
            });
        }
    };

    ulgc.resendotp = function (type) {
        if (type == 'user') {
            var data = {};
            data.code = ulgc.usermobile.code;
            data.phone = ulgc.usermobile.number;
        } else {
            var data = {};
            data.code = ulgc.taskermobile.code;
            data.phone = ulgc.taskermobile.number;
        }

        MainService.generateotp(data).then(function (response, err) {
            if (response) {
                if (type == 'user') {
                    ulgc.showuserotpform = true;

                    if (response.sms == 'development') {
                        ulgc.userotp = response.otpkey;
                    }
                    ulgc.oldotp = response.otpkey;

                    toastr.success('OTP sent successfully');
                } else {
                    ulgc.showtaskerotpform = true;

                    if (response.sms == 'development') {
                        ulgc.taskerotp = response.otpkey;
                    }
                    ulgc.oldotp = response.otpkey;

                    toastr.success('OTP sent successfully');
                }
            }
        });
    };

    ulgc.checkotp = function (valid, type, otp) {
        if(valid) {
            if (type == 'user') {
                if (ulgc.oldotp == otp) {
                    var data = {};
                    data.phone = ulgc.usermobile;
                    ulgc.showuserotpform = false;

                    MainService.getData(routes.userLogin, data).then(function (userdata, err) {
                        if (err) {
                            toastr.error("Unable to fetch data");
                        } else if(userdata.message) {
                            toastr.warning(userdata.message);
                        } else {
                            AuthenticationService.SetCredentials(userdata.user, userdata.user_id, userdata.token, userdata.user_type, userdata.status, 0, userdata.avatar);
                            localStorage.removeItem('TaskerData');
                            $rootScope.$emit('notification', { user: userdata.user_id, type: userdata.user_type });
                            $rootScope.$emit('webNotification', { user: userdata.user_id, type: userdata.user_type });

                            if ($cookieStore.get('categeoryslug')) {
                                var tempdata = $cookieStore.get('categeoryslug');
                                $cookieStore.remove('categeoryslug');
                                $state.go('search', { task: tempdata.task, query: JSON.stringify(tempdata) }, { reload: false });

                            } else if($rootScope.currentState && $rootScope.currentState.name !== 'becometasker.step1') {
                                $state.go($rootScope.currentState.name, $rootScope.currentparams, { reload: true });
                            }
                            else {
                                $state.go('landing', {}, { reload: true });
                            }
                        }
                    });
                } else {
                    toastr.error('The OTP entered is incorrect.');
                }
            } else {
                if (ulgc.oldotp == otp) {
                    var data = {};
                    data.phone = ulgc.taskermobile;
                    ulgc.showtaskerotpform = false;
                    AuthenticationService.taskerLogin(data).then(function (taskerdata, err) {
                        if (err) {
                            toastr.error('Unable to fetch data');
                        } else {
                            AuthenticationService.SetCredentials(taskerdata.user, taskerdata.user_id, taskerdata.token, taskerdata.user_type, taskerdata.status, 0, taskerdata.avatar);
                            localStorage.removeItem('TaskerData');
                            $rootScope.$emit('notification', { user: taskerdata.user_id, type: taskerdata.user_type });
                            $rootScope.$emit('webNotification', { user: taskerdata.user_id, type: taskerdata.user_type });
                            if ($rootScope.currentState && $rootScope.currentState.name !== 'becometasker.step1' && $rootScope.currentState.name !== 'search') {
                                $state.go($rootScope.currentState.name, $rootScope.currentparams, { reload: true });
                            } else {
                                $state.go('landing', {}, { reload: true });
                            }
                        }
                    });

                } else {
                    toastr.error('The OTP entered is incorrect.');
                }
            }
        }
    };

    $scope.facebookLogin = function () {
        var url = '/auth/facebook',
            width = 1000,
            height = 650,
            top = (window.outerHeight - height) / 2,
            left = (window.outerWidth - width) / 2;
        $window.open(url, 'facebook_login', 'width=' + width + ',height=' + height + ',scrollbars=0,top=' + top + ',left=' + left);
    }

    $window.app = {
        authState: function (data) {
            var username = data.username;
            username = username.replace(/^"(.*)"$/, '$1');
            var _id = data._id;
            _id = _id.replace(/^"(.*)"$/, '$1');
            var role = data.role;
            role = role.replace(/^"(.*)"$/, '$1');
            var token = data.token;
            token = token.replace(/^"(.*)"$/, '$1');

            AuthenticationService.SetCredentials(username, _id, token, "user", 1)
            $rootScope.$emit('notification', { user: _id, type: "user" });
            $rootScope.$emit('webNotification', { user: _id, type: "user" });
            if ($rootScope.currentState) {
                $state.go($rootScope.currentState.name, $rootScope.currentparams, { reload: true });
            } else {
                $state.go('landing', {}, { reload: true });
            }
        },
        failauthState: function (data) {
            var err = data.err.error[0];
            var str = err.match(/\$(.*)/);
            if (str) {
                var currenterr = str[0].substring(1, 5);
                if (user = currenterr) {
                    $translate('Username already exist').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                }
            } else {
                toastr.error(err);
            }
            if ($rootScope.currentState) {
                $state.go($rootScope.currentState.name, $rootScope.currentparams, { reload: true });
            } else {
                $state.go('landing', {}, { reload: true });
            }
        }
    };
    //-------------------------------------------------------------------------------
    $scope.user = {};
    // Defining user logged status
    $scope.logged = false;
    // And some fancy flags to display messages upon user status change
    $scope.byebye = false;
    $scope.salutation = false;
}

registerCtrl.$inject = ['$scope', '$compile', '$rootScope', 'uiCalendarConfig', '$uibModal', 'CategoryserviceResolve', '$location', 'AuthenticationService', '$state', '$filter', 'toastr', '$cookieStore', '$stateParams', '$translate', 'accountService', 'NgMap', '$timeout', 'MainService', 'routes', 'settingsResolve'];

function registerCtrl($scope, $compile, $rootScope, uiCalendarConfig, $uibModal, CategoryserviceResolve, $location, AuthenticationService, $state, $filter, toastr, $cookieStore, $stateParams, $translate, accountService, NgMap, $timeout, MainService, routes, settingsResolve) {
    var rgc = this;
    rgc.showUserRegisterForm = false;
    rgc.showuserotpform = false;
    rgc.showusermobileform = true;
    rgc.showtaskermobileform = true;
    rgc.showtaskerotpform = false;
    rgc.UserDetails = {};
    $scope.location = {};
    rgc.UserDetails.address = {};
    rgc.type = $stateParams.type;
    rgc.settings = settingsResolve.settings;

    rgc.checkTaskerDetail = true;

    $rootScope.user_mobile = {};
    $rootScope.userotp = '';
    $rootScope.taskerotp = '';

    $scope.maps = [];
    $scope.$on('mapInitialized', function (evt, evtMap) {
        $scope.maps.push(evtMap);
    });

    $scope.oneAtATime = true;

    $scope.tabs = [{ active: true }, { active: false }, { active: false }];

    var availableTimingSlotList = [{ slot: 0, time: "12AM - 1AM", selected: false }, { slot: 1, time: "1AM - 2AM", selected: false }, { slot: 2, time: "2AM - 3AM", selected: false }, { slot: 3, time: "3AM - 4AM", selected: false }, { slot: 4, time: "4AM - 5AM", selected: false }, { slot: 5, time: "5AM - 6AM", selected: false }, { slot: 6, time: "6AM - 7AM", selected: false }, { slot: 7, time: "7AM - 8AM", selected: false }, { slot: 8, time: "8AM - 9AM", selected: false }, { slot: 9, time: "9AM - 10AM", selected: false }, { slot: 10, time: "10AM - 11AM", selected: false }, { slot: 11, time: "11AM - 12PM", selected: false }, { slot: 12, time: "12PM - 1PM", selected: false }, { slot: 13, time: "1PM - 2PM", selected: false }, { slot: 14, time: "2PM - 3PM", selected: false }, { slot: 15, time: "3PM - 4PM", selected: false }, { slot: 16, time: "4PM - 5PM", selected: false }, { slot: 17, time: "5PM - 6PM", selected: false }, { slot: 18, time: "6PM - 7PM", selected: false }, { slot: 19, time: "7PM - 8PM", selected: false }, { slot: 20, time: "8PM - 9PM", selected: false }, { slot: 21, time: "9PM - 10PM", selected: false }, { slot: 22, time: "10PM - 11PM", selected: false }, { slot: 23, time: "11PM - 12AM", selected: false }];

    var workingDays = [
        { day: "Sunday", slot: JSON.parse(JSON.stringify(availableTimingSlotList)), selected: false, wholeday: false },
        { day: "Monday", slot: JSON.parse(JSON.stringify(availableTimingSlotList)), selected: false, wholeday: false },
        { day: "Tuesday", slot: JSON.parse(JSON.stringify(availableTimingSlotList)), selected: false, wholeday: false },
        { day: "Wednesday", slot: JSON.parse(JSON.stringify(availableTimingSlotList)), selected: false, wholeday: false },
        { day: "Thursday", slot: JSON.parse(JSON.stringify(availableTimingSlotList)), selected: false, wholeday: false },
        { day: "Friday", slot: JSON.parse(JSON.stringify(availableTimingSlotList)), selected: false, wholeday: false },
        { day: "Saturday", slot: JSON.parse(JSON.stringify(availableTimingSlotList)), selected: false, wholeday: false }];

    $scope.clearSlots = function (day, wholeday, parentkey, event) {

        angular.forEach(rgc.data.working_days, function (days, key) {
            angular.forEach(days.slot, function (slot, skey) {
                if (day && !wholeday) {
                    if (parentkey == key) {
                        slot.selected = false;
                    }
                }
            });
        });

        event.stopPropagation();
    };

    rgc.submitPersonalInfo = function (valid) {
        $scope.$on('mapInitialized', function (evt, evtMap) {
            $scope.maps.push(evtMap);
        });

        if (valid) {
            rgc.data.avatar = rgc.myCroppedImage;
            rgc.data.avatarBase64 = rgc.myCroppedImage;

            if (!rgc.data.radius) {
                rgc.data.radius = 50;
            }

            navigator.geolocation.getCurrentPosition(function (pos) {
                console.log("pos", pos);
                taskerLatLongAddress(pos.coords.latitude, pos.coords.longitude);
            }, function (failure) {
                $.getJSON('https://ipinfo.io/geo', function (response) {
                    var loc = response.loc.split(',');
                    taskerLatLongAddress(loc[0], loc[1]);
                });
            });

            if (calculate_age(rgc.data.birthdate.month, rgc.data.birthdate.date, rgc.data.birthdate.year, rgc.data.WorkingDate)) {
                rgc.data.showCrop = false;
                localStorage.setItem('TaskerData', JSON.stringify(rgc.data));
                $scope.tabs[1].active = true;
            } else {
                $translate('YOUR AGE SHOULD BE 18').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            }
        }
    };

    rgc.submitWorkInfo = function () {
        localStorage.setItem('TaskerData', JSON.stringify(rgc.data));
        $scope.tabs[2].active = true;
        rgc.addnewcategories = rgc.categories.filter(function (data) {
            return rgc.data.taskerskills.some(function (data2) {
                return data2.childid == data._id;
            });
        }).map(function (mapdata) {
            return mapdata;
        })
    };

    rgc.saveCatArray = function() {
        rgc.addnewcategories = rgc.categories.filter(function (data) {
            return rgc.data.taskerskills.some(function (data2) {
                return data2.childid == data._id;
            });
        }).map(function (mapdata) {
            return mapdata;
        })
    };

    rgc.addCategory = function (category) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'app/site/modules/tasker/views/addcategory.html',
            windowClass: "addcatpop",
            controller: 'CategoriesModalInstanceCtrl',
            controllerAs: 'ACP',
            resolve: {
                categories: function () {
                    return rgc.categories;
                }
            }
        });

        modalInstance.result.then(function (selectedCategoryData) {
            selectedCategoryData.hour_rate = selectedCategoryData.hour_rate / $scope.DefaultCurrency.value;
            MainService.getData(routes.addUpdateCat, selectedCategoryData).then(function (response) {
                if (response.nModified === 1) {
                    $translate('UPDATED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                }
                updateCat();
            }).catch(function (err) {
                console.error('err = ', err);
                $translate('PLEASE ENTER THE VALID DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            });
        });
    };

    if ($stateParams.type == 'tasker') {
        rgc.activeUserTab = false;
        rgc.activeTaskerTab = true;
    } else {
        rgc.activeUserTab = true;
        rgc.activeTaskerTab = false;
    }

    rgc.generateotp = function (isValid, type, phone) {
        if (isValid) {
            AuthenticationService.phonecheck(type, phone).then(function (err, data) {
                console.log('err, data', err, data);
                if (err.message == 'Phone Number Exist') {
                    $translate('SORRY PHONE NUMBER ALREADY EXIST').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                } else if (err.message == 'Phone Number not exist') {
                    var data = {};
                    data.code = phone.code;
                    data.phone = phone.number;

                    MainService.generateotp(data).then(function (response, err) {
                        if (response) {
                            if (type == 'user') {
                                rgc.showusermobileform = false;
                                rgc.showuserotpform = true;
                                if (response.sms == 'development') {
                                    rgc.userotp = response.otpkey;
                                }
                                rgc.oldotp = response.otpkey;
                                toastr.success('OTP sent successfully');
                            } else {
                                rgc.showtaskermobileform = false;
                                rgc.showtaskerotpform = true;
                                if (response.sms == 'development') {
                                    rgc.taskerotp = response.otpkey;
                                }
                                rgc.oldotp = response.otpkey;
                                toastr.success('OTP sent successfully');
                            }
                        }
                    });
                }
            });
        }
    };

    rgc.resendotp = function (type) {
        if (type == 'user') {
            var data = {};
            data.code = rgc.UserDetails.phone.code;
            data.phone = rgc.UserDetails.phone.number;
        } else {
            var data = {};
            data.code = rgc.data.phone.code;
            data.phone = rgc.data.phone.number;
        }

        MainService.generateotp(data).then(function (response, err) {
            if (response) {
                if (type == 'user') {
                    rgc.showusermobileform = false;
                    rgc.showuserotpform = true;

                    if (response.sms == 'development') {
                        rgc.userotp = response.otpkey;
                    }

                    rgc.oldotp = response.otpkey;

                    toastr.success('OTP sent successfully');
                } else {
                    rgc.showtaskermobileform = false;
                    rgc.showtaskerotpform = true;

                    if (response.sms == 'development') {
                        rgc.taskerotp = response.otpkey;
                    }
                    rgc.oldotp = response.otpkey;

                    toastr.success('OTP sent successfully');
                }
            }
        });
    };

    rgc.checkotp = function (isvalid, type, otp) {
        if (isvalid) {
            if (type == 'user') {
                if (rgc.oldotp == otp) {
                    rgc.showUserRegisterForm = true;
                    rgc.showuserotpform = false;
                    rgc.showusermobileform = false;
                } else {
                    toastr.error('The OTP entered is incorrect.');
                }
            } else {
                if (rgc.oldotp == otp) {
                    rgc.showtaskerotpform = false;
                    rgc.data.showCrop = true;
                    rgc.data.visibleValue = false;
                    rgc.data.avatarBase64 = rgc.myCroppedImage;
                    localStorage.setItem('TaskerData', JSON.stringify(rgc.data));
                    $state.go('becometasker.step1', {}, { reload: false });
                } else {
                    toastr.error('The OTP entered is incorrect.');
                }
            }
        }
    };

    rgc.registerUser = function (isValid) {

        rgc.Error = '';
        var today = $filter('date')(new Date(), 'yyyy-MM-dd HH:mm:ss');

        rgc.UserDetails.today = today;
        rgc.UserDetails.role = rgc.type;
        rgc.UserDetails.username = rgc.UserDetails.firstname + ' ' + rgc.UserDetails.lastname;

        if (isValid) {
            MainService.getData(routes.userRegister, rgc.UserDetails).then(function (userdata) {
                AuthenticationService.SetCredentials(userdata.user, userdata.user_id, userdata.token, userdata.user_type, userdata.status, 0, userdata.avatar);
                if ($cookieStore.get('categeoryslug')) {
                    var tempdata = $cookieStore.get('categeoryslug');
                    $cookieStore.remove('categeoryslug');
                    $state.go('search', { task: tempdata.task, query: JSON.stringify(tempdata) }, { reload: false });
                } else {
                    $state.go('landing', {}, { reload: true });
                }
                $translate('REGISTER SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
            }, function (err) {
                $translate(err.data).then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            });
        } else {
            $translate('PLEASE FILL ALL MANDATORY FIELDS').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }
    };

    rgc.change = function (referalcode) {
        if (referalcode) {
            AuthenticationService.checkreferal(referalcode).then(function (err, data) {
                if (err.message == 'Invalid referal code') {
                    rgc.UserDetails.referalcode = "";
                    $translate('INVALID REFERAL CODE').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                } else if (err.message == 'Success') {
                    $translate('VALID REFERAL CODE').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                }
            });
        }
    }

    rgc.useremailchange = function (email) {
        if (email != undefined) {
            AuthenticationService.checkemail(email).then(function (err, data) {
                if (err.message == 'Email Exist') {
                    // rgc.UserDetails.email = "";
                    $translate('SORRY EMAIL ID ALREADY EXIST').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                } else if (err.message == 'Email not exist' && rgc.UserDetails.email) {
                    // $translate('VALID EMAIL ID').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                }
            });
        }
    }

    rgc.checkingphone = function (phone) {
        if (phone != undefined) {
            AuthenticationService.phonecheck(phone).then(function (err, data) {
                if (err.message == 'Phone Number Exist') {
                    console.log("number exists");
                    rgc.showotpform = false;
                    $translate('SORRY PHONE NUMBER ALREADY EXIST').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });

                } else if (err.message == 'Phone Number not exist' && rgc.UserDetails.phone) {
                    console.log("number not exists");
                    rgc.showotpform = true;
                    // $translate('VALID PHONE NUMBER').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                }

            });
        }
    }
    rgc.taskeremailchange = function (email) {
        if (email != undefined) {
            AuthenticationService.checktaskeremail(email).then(function (err, data) {
                if (err.message == 'Email Exist') {
                    rgc.checkTaskerDetail = false;
                    $translate('SORRY EMAIL ID ALREADY EXIST').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                    return false
                } else if (err.message == 'Email not exist') {
                    rgc.checkTaskerDetail = true;
                }
            });
        }
    }
    rgc.taskerphone = function (phone) {
        if (phone != undefined) {
            AuthenticationService.taskerphone(phone).then(function (err, data) {
                if (err.message == 'Phone Exist') {
                    rgc.checkTaskerDetail = false;
                    $translate('SORRY PHONE NUMBER ALREADY EXIST').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                } else if (err.message == 'Phone not exist') {
                    rgc.checkTaskerDetail = true;
                }
            });
        }
    }



    rgc.categoryList = CategoryserviceResolve;
    rgc.radiusby = $rootScope.settings.distanceby;

    if (rgc.radiusby == 'km') {
        rgc.radiusval = 1000;
    } else {
        rgc.radiusval = 1609.34;
    }

    angular.forEach(rgc.categoryList, function (parentvalue, parentIndex) {
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

    rgc.selectedcategory = [];
    rgc.selectedcategory = rgc.categoryList[0].category[0];

    var user = AuthenticationService.GetCredentials();
    $scope.avatar = '';

    rgc.data = {
        gender: '',
        phone: '',
        birthdate: { year: '', month: '', date: '' },
        WorkingDate: '',
        working_days: workingDays,
        avatar: '',
        next: 'step2',
        taskerskills: [],
        Map: [],
    };

    rgc.data.radius = $rootScope.settings.tasker_radius;
    rgc.data = JSON.parse(localStorage.getItem('TaskerData')) || rgc.data;
    console.log("rgc.data", rgc.data);

    // rgc.data.visibleValue = true;

    rgc.data.centerMap = rgc.data.location;
    if (rgc.data.WorkingDate) {
        rgc.data.WorkingDate = new Date(rgc.data.WorkingDate);
    } else {
        rgc.data.WorkingDate = '';
    }

    // Croping
    $scope.myImage = '';
    rgc.myCroppedImage = '';
    //$scope.cropType = 'circle'; // circle & square
    $scope.handleFileSelect = function (evt) {
        var file = evt.currentTarget.files[0];
        if (file.$errorParam == '1MB' || file.$error == 'pattern') {
            rgc.data.showCrop = false;
            rgc.data.visibleValue = false;
            file = null;
        } else {
            rgc.data.showCrop = true;
            rgc.data.visibleValue = true;
        }
        if (file) {
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
    angular.forEach(rgc.data.taskerskills, function (taskerskills) {
        angular.forEach(rgc.categoryList, function (categoryList) {
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
        rgc.experience = respo;
    });

    rgc.placeChanged = function () {

        rgc.data.address.line1 = '';
        rgc.data.address.line2 = '';
        rgc.data.address.city = '';
        rgc.data.address.state = '';
        rgc.data.address.country = '';
        rgc.data.address.zipcode = '';

        rgc.details = {}
        rgc.place = this.getPlace();
        rgc.data.tasker_area = {};
        rgc.data.tasker_area.lng = rgc.place.geometry.location.lng();
        rgc.data.tasker_area.lat = rgc.place.geometry.location.lat();
        rgc.details.location = rgc.data.tasker_area;
        rgc.data.address.line1 = rgc.place.formatted_address;
        var locationa = rgc.place;
        rgc.data.address.formatted_address = locationa.formatted_address;
        if (locationa.name) {
            rgc.data.address.line1 = locationa.name;
        }

        for (var i = 0; i < locationa.address_components.length; i++) {
            for (var j = 0; j < locationa.address_components[i].types.length; j++) {
                if (locationa.address_components[i].types[j] == 'neighborhood') {
                    if (rgc.data.address.line1 != locationa.address_components[i].long_name) {
                        if (rgc.data.address.line1 != '') {
                            rgc.data.address.line1 = rgc.data.address.line1 + ',' + locationa.address_components[i].long_name;
                        } else {
                            rgc.data.address.line1 = locationa.address_components[i].long_name;
                        }
                    }
                }
                if (locationa.address_components[i].types[j] == 'route') {
                    if (rgc.data.address.line1 != locationa.address_components[i].long_name) {
                        if (rgc.data.address.line2 != '') {
                            rgc.data.address.line2 = rgc.data.address.line2 + ',' + locationa.address_components[i].long_name;
                        } else {
                            rgc.data.address.line2 = locationa.address_components[i].long_name;
                        }
                    }

                }
                if (locationa.address_components[i].types[j] == 'street_number') {
                    if (rgc.data.address.line2 != '') {
                        rgc.data.address.line2 = rgc.data.address.line2 + ',' + locationa.address_components[i].long_name;
                    } else {
                        rgc.data.address.line2 = locationa.address_components[i].long_name;
                    }

                }
                if (locationa.address_components[i].types[j] == 'sublocality_level_1') {
                    if (rgc.data.address.line2 != '') {
                        rgc.data.address.line2 = rgc.data.address.line2 + ',' + locationa.address_components[i].long_name;
                    } else {
                        rgc.data.address.line2 = locationa.address_components[i].long_name;
                    }

                }
                if (locationa.address_components[i].types[j] == 'locality') {

                    rgc.data.address.city = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'country') {

                    rgc.data.address.country = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'postal_code') {

                    rgc.data.address.zipcode = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'administrative_area_level_1' || locationa.address_components[i].types[j] == 'administrative_area_level_2') {
                    rgc.data.address.state = locationa.address_components[i].long_name;
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

    rgc.taskerareaChanged = function () {

        rgc.place = this.getPlace();
        rgc.data.location = {};
        rgc.data.location.lng = rgc.place.geometry.location.lng();
        rgc.data.location.lat = rgc.place.geometry.location.lat();
        rgc.data.tasker_area = {};
        rgc.data.tasker_area.lng = rgc.place.geometry.location.lng();
        rgc.data.tasker_area.lat = rgc.place.geometry.location.lat();
        rgc.data.availability_address = rgc.place.formatted_address;

        if (!rgc.data.radius) {
            rgc.data.radius = 50;
        }

    };

    rgc.filter = {};
    rgc.format = 'dd-MM-yyyy';

    rgc.filterDate = function () {
        rgc.data.birthdate = {};
        console.log("inside", rgc.data.birthdate);
        console.log("rgc.data.WorkingDate", rgc.data.WorkingDate);

        rgc.data.birthdate.year = rgc.data.WorkingDate.getFullYear();
        rgc.data.birthdate.month = rgc.data.WorkingDate.getMonth() + 1;
        rgc.data.birthdate.date = rgc.data.WorkingDate.getDate();
        console.log("ggg", rgc.data.birthdate.month, rgc.data.birthdate.date, rgc.data.birthdate.year);
        if (calculate_age(rgc.data.birthdate.month, rgc.data.birthdate.date, rgc.data.birthdate.year, rgc.data.WorkingDate)) {
            rgc.data.birthdate.year = rgc.data.WorkingDate.getFullYear();
            rgc.data.birthdate.month = rgc.data.WorkingDate.getMonth() + 1;
            rgc.data.birthdate.date = rgc.data.WorkingDate.getDate();
        } else {
            $translate('YOURS AGE SHOULD BE 18').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }

    }


    rgc.selectedCategory = function (parentindex, index) {
        rgc.selectedcategory = $filter('filter')(rgc.categoryList[parentindex].category, { "active": true });
        rgc.selectedcategory[0].active = false;
        rgc.categoryList[parentindex].category[index].active = true;
        rgc.selectedcategory = rgc.categoryList[parentindex].category[index];
        rgc.flag = false;
    }

    rgc.emailchange = function (email) {
        if (email == undefined) {
            $translate('INVALID EMAIL ID').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        } else {
            AuthenticationService.checktaskeremail(email).then(function (err, data) {
                if (err.message == 'Email Exist') {
                    $translate('SORRY EMAIL ID ALREADY EXIST').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                } else if (err.message == 'Email not exist') {
                    $translate('VALID EMAIL ID').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                }
            });
        }
    }
    rgc.phonechange = function (phone) {
        if (phone == undefined) {
            $translate('INVALID PHONE NUMBER').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        } else {
            AuthenticationService.taskerphone(phone).then(function (err, data) {
                if (err.message == 'Phone Exist') {
                    rgc.data.phone = { "code": "", "number": "" };
                    $translate('SORRY PHONE NUMBER ALREADY EXIST').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                } else if (err.message == 'Phone not exist') {
                    $translate('VALID PHONE NUMBER').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                }
            });
        }
    }
    rgc.emptyLatLng = function () {
        rgc.data.tasker_area = undefined;
    }



    function taskerLatLongAddress(lat, long) {
        console.log("worklocation lat long", lat, long);
        var latlng = new google.maps.LatLng(lat, long);
        console.log("latlng", latlng);
        var geocoder = geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 'latLng': latlng }, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                if (results[1]) {
                    console.log("results[1]", results[1]);
                    $scope.$apply(function () {
                        rgc.data.availability_address = results[1].formatted_address;
                        rgc.taskerareaaddress = results[1].formatted_address;
                        rgc.temp_taskerareaaddress = rgc.taskerareaaddress;
                    });
                }
            }
        })
        rgc.data.location.lng = long;
        rgc.data.location.lat = lat;
    }


    rgc.data.location = {};

    rgc.mapToInput = function (event) {
        console.log("$scope.maps[0]=========", $scope.maps[0]);
        if ($scope.maps[0]) {
            rgc.data.radius = parseInt($scope.maps[0].shapes.circle.radius / rgc.radiusval);
            var lat = $scope.maps[0].shapes.circle.center.lat();
            var lng = $scope.maps[0].shapes.circle.center.lng();
            var latlng = new google.maps.LatLng(lat, lng);
            var geocoder = geocoder = new google.maps.Geocoder();
            geocoder.geocode({ 'latLng': latlng }, function (results, status) {
                if (status == 'OK') {
                    $scope.$apply(function () {
                        rgc.place = {};
                        rgc.data.availability_address = results[0].formatted_address;
                        rgc.taskerareaaddress = results[0].formatted_address;
                        rgc.temp_taskerareaaddress = rgc.taskerareaaddress;
                        rgc.data.location = {};
                        rgc.data.location.lng = lng;
                        rgc.data.location.lat = lat;
                    });
                }
            });
        }
    }

    function calculate_age(birth_month, birth_day, birth_year, dobdate) {
        console.log("dobdate", dobdate);
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
                    return false;

                }
            } else {
                return false;
            }
        } else if (conditionyear < year) {
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
    rgc.taskerData = {};
    rgc.taskerData.profile_details = [];

    rgc.TaskerRegister = function (valid) {
        rgc.taskerData = {};
        if (valid > 0) {
            var selected_days = [];
            if (rgc.data.working_days) {
                angular.forEach(rgc.data.working_days, function (days) {
                    if (days.selected) {
                        if (!days.wholeday) {
                            var selected_slots = [];
                            angular.forEach(days.slot, function (slot) {
                                if (slot.selected) {
                                    selected_slots.push(slot.slot);
                                }
                            });
                            selected_days.push({ day: days.day, slots: selected_slots, selected: days.selected, wholeday: days.wholeday });
                        } else {
                            selected_days.push({ day: days.day, slots: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], selected: days.selected, wholeday: days.wholeday });
                        }
                    }
                });
            }

            rgc.data.working_days = selected_days;

            rgc.taskerData = angular.copy(rgc.data);
            rgc.taskerData.taskerfile = [];
            rgc.taskerData.taskerfile = $scope.surveyFiles;

            AuthenticationService.BecomeTaskerRegister(rgc.taskerData, function (err, response) {
                if (err) {
                    $translate('YOUR CREDENTIALS ARE WRONG' + err).then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                } else {
                    if (response == 'Email ID already exists') {
                        toastr.error('Email ID already exists');
                    } else if(response == 'Unable to register') {
                        toastr.error('Unable to register');
                    } else {
                        var avatar = response.avatar ? response.avatar : '';
                        AuthenticationService.SetCredentials(response.firstname, response._id, '', 'tasker', response.status , 0, avatar);
                        $rootScope.$emit('eventName', { count: 0 });
                        localStorage.removeItem('TaskerData');
                        //$translate('TASKER ADDED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });

                        if(response.status == 1) {
                            toastr.success('Since it is a demo, your account has been verified automatically.');
                        }
                        $state.go('landing', {}, { reload: true });
                    }
                }
            });
        } else {
            $translate('SELECT ATLEAST ONE OF THE SKILLS').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }
    }

    rgc.taskerskills = angular.copy(rgc.data.taskerskills);
    rgc.addskills = function (valid) {
        if (valid) {
            var skills = $filter('filter')(rgc.selectedcategory.skills, { "selected": true });
            angular.forEach(skills, function (value) {
                delete value.selected;
            });

            var DefaultCurrency = {}
            DefaultCurrency = $scope.DefaultCurrency;
            var data = { categoryid: rgc.selectedcategory.parent, childid: rgc.selectedcategory._id, terms: rgc.selectedcategory.terms, quick_pitch: rgc.selectedcategory.quick_pitch, hour_rate: (rgc.selectedcategory.hour_rate / DefaultCurrency[0].value), experience: rgc.selectedcategory.experience, file: rgc.selectedcategory.file, skills: skills };
            var insetflag = true;

            angular.forEach(rgc.taskerskills, function (value, key) {
                if (value.childid == rgc.selectedcategory._id) {
                    insetflag = false;
                    rgc.taskerskills[key] = data;
                }
            })
            if (insetflag) {
                rgc.taskerskills.push(data);
            }
            rgc.data.taskerskills = angular.copy(rgc.taskerskills);
            localStorage.setItem('TaskerData', JSON.stringify(rgc.data));
            $translate('SKILLS UPDATED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
            rgc.flag = false;
        }
    };

    rgc.emptyLatLng = function (temp_taskerareaaddress) {
        if (temp_taskerareaaddress != rgc.taskerareaaddress) {
            rgc.data.location = '';
        }
    }

    /*rgc.SubmitTaskerlocation = function (valid, radiusvalue) {
        rgc.data.radius = radiusvalue;
        if ((rgc.data.working_days[6].not_working == false || rgc.data.working_days[5].not_working == false ||
            rgc.data.working_days[4].not_working == false || rgc.data.working_days[3].not_working == false || rgc.data.working_days[2].not_working == false ||
            rgc.data.working_days[1].not_working == false || rgc.data.working_days[0].not_working == false)) {
            if (calculate_age(rgc.data.birthdate.month, rgc.data.birthdate.date, rgc.data.birthdate.year, rgc.WorkingDate)) {
                if (rgc.data.location == '') {
                    $translate('INVALID WORK LOCATION').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                    return
                } else {
                    $cookieStore.put('TaskerData', rgc.data);
                    $state.go('becometasker.' + rgc.data.next, {}, { reload: false });
                }
            } else {
                $translate('YOURS AGE SHOULD BE 18').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            }
        } else {
            $translate('PLEASE SELECT YOUR WORKING DAYS').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }
    };

    rgc.availabilities = function (size, index) {

        var modalInstance = $uibModal.open({
            animation: true,
            backdrop: 'static',
            keyboard: false,
            templateUrl: 'app/site/modules/tasker/views/availabilitypop.modal.tab.html',
            controller: 'ModalInstanceWorkingDayCtrl11',
            size: size,
            resolve: {
                WorkingDays: function () {
                    return rgc.data.working_days;
                },
                workingTimes: function () {
                    return workingTimes;
                },
                DaysData: function () {
                    return DaysData;
                },
                selectedIndex: function () {
                    return index;
                }
            }
        });
        modalInstance.result.then(function (WorkingDays, selectedIndex) {
            // rgc.data.working_days[selectedIndex] = WorkingDays;
            rgc.data.working_days[index] = WorkingDays;
            rgc.workingDays = rgc.data.working_days[index];
        }, function () { });
    };*/

    accountService.getCategories().then(function (respo) {
        rgc.categories = respo;
    });
    accountService.getExperience().then(function (respo) {
        rgc.experiences = respo;
    });

    //rgc.data.taskerskills = [];
    rgc.selectedCat = [];
    rgc.categoryModal = function (category) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'app/site/modules/tasker/views/addcategory.html',
            controller: 'ModalInstancecategory',
            controllerAs: 'ACM',
            resolve: {
                experiences: function () {
                    return rgc.experiences;
                },
                defaultcurrency: function () {
                    return $scope.DefaultCurrency;
                },
                user: function () {
                    return rgc.data;
                },
                selectedCat: function () {
                    return rgc.selectedCat;
                },
                categories: function () {
                    return rgc.categories;
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
                rgc.taskerskills.push(selectedCategoryData);
                rgc.selectedCat.push(selectedCategoryData.childid);
            } else {
                for (var i = 0; i < rgc.taskerskills.length; i++) {
                    if (rgc.taskerskills[i].childid == selectedCategoryData.childid) {
                        rgc.taskerskills[i] = selectedCategoryData;
                    }
                }
            }

            rgc.data.taskerskills = rgc.taskerskills;

            localStorage.setItem('TaskerData', JSON.stringify(rgc.data));

            rgc.addnewcategories = rgc.categories.filter(function (data) {
                return rgc.data.taskerskills.some(function (data2) {
                    return data2.childid == data._id;
                });
            }).map(function (mapdata) {
                return mapdata;
            })
        }, function () { });
    };

    rgc.deletecategoryitem = function (data) {

        var indexx = rgc.selectedCat.indexOf(data);
        rgc.selectedCat.splice(indexx, 1);

        angular.forEach(rgc.addnewcategories, function (value, key) {
            if (value._id == data) { rgc.addnewcategories.splice(key, 1); }
        });

        angular.forEach(rgc.data.taskerskills, function (value, key) {
            if (value.childid == data) {
                rgc.taskerskills.splice(key, 1);
            }
        });
    }




};

DeactivateController.$inject = ['$scope', '$rootScope', '$location', 'AuthenticationService', '$state', '$filter', 'toastr', '$cookieStore'];

function DeactivateController($scope, $rootScope, $location, AuthenticationService, $state, $filter, toastr, $cookieStore) {
    var user = AuthenticationService.GetCredentials();
    AuthenticationService.Logout(user).then(function (data) {
        AuthenticationService.ClearCredentials();
        $state.go('landing', {}, { reload: true });
    });
};



angular.module('handyforall.becometasker').controller('ModalInstanceWorkingDayCtrl11', function ($scope, $uibModalInstance, DaysData, WorkingDays, workingTimes, selectedIndex) {
    //$scope.WorkingDays = WorkingDays[selectedIndex];
    $scope.WorkingDays = angular.copy(WorkingDays[selectedIndex]);
    $scope.workingTimes = workingTimes;

    $scope.days = DaysData;

    $scope.ok = function () {
        if ($scope.WorkingDays.hour.morning == true || $scope.WorkingDays.hour.afternoon == true || $scope.WorkingDays.hour.evening == true) {
            $scope.WorkingDays.not_working = false;
        } else {
            $scope.WorkingDays.not_working = true;
        }
        $uibModalInstance.close($scope.WorkingDays, selectedIndex);
    };
    $scope.cancel = function (WorkingDays) {
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

angular.module('handyforall.authentication').controller('ModalInstancecategory', function (accountService, $uibModalInstance, experiences, user, toastr, categories, category, selectedCat, defaultcurrency, $translate) {
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

    acm.ok = function (valid) {
        if (valid) {
            if (acm.ratetype == 'Flat') {
                acm.selectedCategoryData.hour_rate = acm.MinimumAmount;
            }
            acm.selectedCategoryData.mode = acm.mode;
            $uibModalInstance.close(acm.selectedCategoryData);
        } else {
            toastr.error('Please enter all values');
        }
    };

    acm.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };

});

