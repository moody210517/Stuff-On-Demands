angular.module('handyforall.users').controller('userAddCtrl', userAddCtrl);
userAddCtrl.$inject = ['usersEditServiceResolve', '$scope', 'toastr', 'UsersService', '$state', '$stateParams', '$modal', '$location'];

function userAddCtrl(usersEditServiceResolve, $scope, toastr, UsersService, $state, $stateParams, $modal, $location) {
    var usac = this;
	  usac.editUserData = usersEditServiceResolve[0];
      console.log("usac.editUserData", usac.editUserData);
    if (usersEditServiceResolve[0])
    usac.addressList = usersEditServiceResolve[0].addressList;
    $scope.location = {};
    $scope.visibleValue = false;
    usac.checked = false;
    if ($stateParams.id) {
        usac.checked = true;
        usac.action = 'edit';
        usac.breadcrumb = 'SubMenu.EDIT_USER';
        usac.user_id = $stateParams.id;
    } else {
        usac.action = 'add';
        usac.breadcrumb = 'SubMenu.ADD_USER';
    }
    usac.addressStatus = function (id) {
        UsersService.addressStatus(id, usac.editUserData._id).then(function (response) {
            UsersService.UserAddress(usac.editUserData._id).then(function (refdata) {
                usac.addressList = refdata[0].addressList;
                toastr.success('Preferred Address Added Successfully');
            })
        });
    }
    usac.deleteAddress = function (id) {
        UsersService.deleteUserAddress(id, usac.editUserData._id).then(function (response) {
            UsersService.UserAddress(usac.editUserData._id).then(function (refdata) {
                usac.addressList = refdata[0].addressList;
            })
        });
    }


    usac.Editaddress = function (index) {

        if (index >= 0) {
            var modalInstance = $modal.open({
                animation: true,
                templateUrl: 'app/admin/modules/users/views/addaddressmodel.html',
                controller: 'AddAddress',
                controllerAs: 'ATA',
                resolve: {
                    user: function () {
                        if (usac.addressList)
                            return usac.addressList[index];
                    }
                }
            });

            modalInstance.result.then(function (data) {
                UsersService.AddAddress(usac.editUserData._id, data).then(function (response) {
                    toastr.success('User Adddress Added Successfully');
                    UsersService.UserAddress(usac.editUserData._id).then(function (refdata) {
                        usac.addressList = refdata[0].addressList;
                    })
                });
            });

        }
        else {
            UsersService.UserAddress(usac.editUserData._id).then(function (datalen) {

                if (datalen[0].addressList.length < 5) {
                    var modalInstance = $modal.open({
                        animation: true,
                        templateUrl: 'app/admin/modules/users/views/addaddressmodel.html',
                        controller: 'AddAddress',
                        controllerAs: 'ATA',
                        resolve: {
                            user: function () {
                                if (usac.addressList)
                                    return usac.addressList[index];
                            }
                        }
                    });

                    modalInstance.result.then(function (data) {
                        UsersService.AddAddress(usac.editUserData._id, data).then(function (response) {
                            toastr.success('User Adddress Added Successfully');
                            UsersService.UserAddress(usac.editUserData._id).then(function (refdata) {
                                usac.addressList = refdata[0].addressList;
                            })
                        });
                    });
                }
                else {
                    toastr.error(' Added Only 5 Adddress ');
                }
            })
        }
    }


    usac.placeChanged = function () {
       usac.editUserData.address.line1 = '';
        usac.editUserData.address.line2 = '';
        usac.editUserData.address.country = '';
        usac.editUserData.address.zipcode = '';
        usac.editUserData.address.state = '';
        usac.editUserData.address.formatted_address = '';
        usac.place = this.getPlace();
       var locationa = usac.place;

       usac.editUserData.address.formatted_address = locationa.formatted_address;
    
        if (locationa.name) {
            usac.editUserData.address.line1 = locationa.name;
        }
        for (var i = 0; i < locationa.address_components.length; i++) {
            for (var j = 0; j < locationa.address_components[i].types.length; j++) {
                if (locationa.address_components[i].types[j] == 'neighborhood') {
                    if (usac.editUserData.address.line1 != locationa.address_components[i].long_name) {
                        if (usac.editUserData.address.line1 != '') {
                            usac.editUserData.address.line1 = usac.editUserData.address.line1 + ',' + locationa.address_components[i].long_name;
                        } else {
                            usac.editUserData.address.line1 = locationa.address_components[i].long_name;
                        }
                    }
                }
                if (locationa.address_components[i].types[j] == 'route') {
                    if (usac.editUserData.address.line1 != locationa.address_components[i].long_name) {
                        if (usac.editUserData.address.line2 != '') {
                            usac.editUserData.address.line2 = usac.editUserData.address.line2 + ',' + locationa.address_components[i].long_name;
                        } else {
                            usac.editUserData.address.line2 = locationa.address_components[i].long_name;
                        }
                    }

                }
                if (locationa.address_components[i].types[j] == 'street_number') {
                    if (usac.editUserData.address.line2 != '') {
                        usac.editUserData.address.line2 = usac.editUserData.address.line2 + ',' + locationa.address_components[i].long_name;
                    } else {
                        usac.editUserData.address.line2 = locationa.address_components[i].long_name;
                    }

                }
                if (locationa.address_components[i].types[j] == 'sublocality_level_1') {
                    if (usac.editUserData.address.line2 != '') {
                        usac.editUserData.address.line2 = usac.editUserData.address.line2 + ',' + locationa.address_components[i].long_name;
                    } else {
                        usac.editUserData.address.line2 = locationa.address_components[i].long_name;
                    }

                }
                if (locationa.address_components[i].types[j] == 'locality') {

                    usac.editUserData.address.city = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'country') {

                    usac.editUserData.address.country = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'postal_code') {

                    usac.editUserData.address.zipcode = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'administrative_area_level_1' || locationa.address_components[i].types[j] == 'administrative_area_level_2') {
                    usac.editUserData.address.state = locationa.address_components[i].long_name;
                }
            }
        }
    };
    usac.submitUserEditData = function submitUserEditData(isValid, data) {
       if (isValid) {
            data.role = "user";
            data.loacation = $scope.location;

            if (data.phone == undefined) {
                toastr.error('phone number required');
              } else {
                if ($scope.visibleValue == true) {
                    usac.editUserData.avatarBase64 = usac.myCroppedImage;
                }
                var condition = '';
                if (usac.editUserData.emergency_contact) {
                    usac.emergency_email = usac.editUserData.emergency_contact.email;
                    usac.emergency_name = usac.editUserData.emergency_contact.name;
                    if (usac.editUserData.emergency_contact.phone) {
                        usac.emergency_phone = usac.editUserData.emergency_contact.phone.number;
                    }
                     var condition = usac.editUserData.email != usac.emergency_email && usac.editUserData.phone.number != usac.emergency_phone;
                } else {
                    var condition = true;
                }
                if (condition) {
                    UsersService.editUserCall(usac.editUserData).then(function (response) {
					
                        if (data._id == undefined) {
                            if (response.data.code == 11000) {
                                toastr.error("Username or Email Already Exists");
                            }
                            else {
                                toastr.success('User Added Successfully');
                                $state.go('app.users.list');
                            }
                        } else if (response.data.msg == "Username Already Exists") {
                            toastr.error(response.data.msg);
                        } else if (response.data.msg == "Email Already Exists") {
                            toastr.error(response.data.msg);
                        } else if (response.data.msg == "Phone Number Already Exists") {
                            toastr.error(response.data.msg);
                        } else if (response.data.msg == "success") {
                            if (response.data.data.nModified) {
                                toastr.success('User Updated Successfully');
                                $state.go('app.users.list');
                            }
                        }
                    }, function (err) {
                        toastr.error(err.data.msg);
                        }
                    );
                } else {
                    toastr.error("please enter valid emergency contact details");
                }
             }
        }
      /*  else if (usac.editUserData) {
            if(usac.editUserData.emergency_contact.phone == undefined){
            data.role = "user";
            data.loacation = $scope.location;
            if (data.phone == undefined) {
                toastr.error('phone number required');
             } else {
                if ($scope.visibleValue == true) {
                    usac.editUserData.avatarBase64 = usac.myCroppedImage;
                }
                var condition = '';
                if (usac.editUserData.emergency_contact) {
                    usac.emergency_email = usac.editUserData.emergency_contact.email;
                    usac.emergency_name = usac.editUserData.emergency_contact.name;
                    if (usac.editUserData.emergency_contact.phone) {
                        usac.emergency_phone = usac.editUserData.emergency_contact.phone.number;
                    }
                   var condition = usac.editUserData.username != usac.emergency_name && usac.editUserData.email != usac.emergency_email && usac.editUserData.phone.number != usac.emergency_phone;
                } else {
                    var condition = true;
                }
                if (condition) {
                    UsersService.editUserCall(usac.editUserData).then(function (response) {
                        if (data._id == undefined) {
                            if (response.data.code == 11000) {
                                toastr.error("Username or Email Already Exists");
                            }
                            else {
                                toastr.success('User Added Successfully');
                                $state.go('app.users.list');
                            }
                        } else if (response.data.msg == "Username Already Exists") {
                            toastr.error(response.data.msg);
                        } else if (response.data.msg == "Email Already Exists") {
                            toastr.error(response.data.msg);
                        } else if (response.data.msg == "Phone Number Already Exists") {
                            toastr.error(response.data.msg);
                        } else if (response.data.msg == "success") {
                            if (response.data.data.nModified) {
                                toastr.success('User Updated Successfully');
                                $state.go('app.users.list');
                            }
                        }
                    }, function (err) {
                        console.log(err, "errrrr");
                        toastr.error(err.data.msg);
                        }
                    );
                } else {
                    toastr.error("please enter valid emergency contact details");
                }
            }
        } else {
            toastr.error('Form is Invalid');
        }
    }*/
    else {
            toastr.error('Form is Invalid');
        }
}
  if ($stateParams.id) {
        UsersService.walletAmount(usac.editUserData._id).then(function (respo) {
            usac.wallet = respo[0];

        });
    }
    // Croping
    $scope.myImage = '';
    usac.myCroppedImage = '';
    $scope.handleFileSelect = function (evt) {
        var file = evt.currentTarget.files[0];
        if(file.$errorParam == '1MB' || file.$error == 'pattern') {
            $scope.visibleValue = false;
            file = null;
        } else {
            $scope.visibleValue = true;
        }
        var reader = new FileReader();
        reader.onload = function (evt) {
            $scope.$apply(function ($scope) {
                $scope.myImage = evt.target.result;
            });
        };
        reader.readAsDataURL(file);
    };
    // End Croping
}

angular.module('handyforall.taskers').controller('AddAddress', function ($modalInstance, toastr, user, $location, $state, $scope) {
    var ata = this;

    ata.editaddressdata = user;
    $scope.location = {};
    ata.addressList = {};
    ata.addressList.location = { lat: '', lng: '' };
    ata.placeChanged = function () {
        ata.place = this.getPlace();
        ata.addressList.location.lat = ata.place.geometry.location.lat();
        ata.addressList.location.lng = ata.place.geometry.location.lng();
        ata.availability = 2;
        var locationa = ata.place;
        ata.editaddressdata.line1 = '';
        ata.editaddressdata.street = '';
        if (locationa.name) {
            ata.editaddressdata.line1 = locationa.name;
        }
        for (var i = 0; i < locationa.address_components.length; i++) {
            for (var j = 0; j < locationa.address_components[i].types.length; j++) {
                if (locationa.address_components[i].types[j] == 'neighborhood') {
                    if (ata.editaddressdata.line1 != locationa.address_components[i].long_name) {
                        if (ata.editaddressdata.line1 != '') {
                            ata.editaddressdata.line1 = ata.editaddressdata.line1 + ',' + locationa.address_components[i].long_name;
                        } else {
                            ata.editaddressdata.line1 = locationa.address_components[i].long_name;
                        }
                    }
                }
                if (locationa.address_components[i].types[j] == 'route') {
                    if (ata.editaddressdata.line1 != locationa.address_components[i].long_name) {
                        if (ata.editaddressdata.street != '') {
                            ata.editaddressdata.street = ata.editaddressdata.street + ',' + locationa.address_components[i].long_name;
                        } else {
                            ata.editaddressdata.street = locationa.address_components[i].long_name;
                        }
                    }

                }
                if (locationa.address_components[i].types[j] == 'street_number') {
                    if (ata.editaddressdata.street != '') {
                        ata.editaddressdata.street = ata.editaddressdata.street + ',' + locationa.address_components[i].long_name;
                    } else {
                        ata.editaddressdata.street = locationa.address_components[i].long_name;
                    }

                }
                if (locationa.address_components[i].types[j] == 'sublocality_level_1') {
                    if (ata.editaddressdata.street != '') {
                        ata.editaddressdata.street = ata.editaddressdata.street + ',' + locationa.address_components[i].long_name;
                    } else {
                        ata.editaddressdata.street = locationa.address_components[i].long_name;
                    }

                }
                if (locationa.address_components[i].types[j] == 'locality') {

                    ata.editaddressdata.city = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'country') {

                    ata.editaddressdata.country = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'postal_code') {

                    ata.editaddressdata.zipcode = locationa.address_components[i].long_name;
                }
                if (locationa.address_components[i].types[j] == 'administrative_area_level_1' || locationa.address_components[i].types[j] == 'administrative_area_level_2') {
                    ata.editaddressdata.state = locationa.address_components[i].long_name;
                }
            }
        }
    };
    ata.ok = function (valid) {
        if (valid == true) {
            $modalInstance.close(ata);
        } else {
            toastr.error('Invalid Form')
        }
    };
    ata.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
});

angular.module('handyforall.users').directive('cropImgChange', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var onChangeHandler = scope.$eval(attrs.cropImgChange);
            element.bind('change', onChangeHandler);
        }
    };
})
