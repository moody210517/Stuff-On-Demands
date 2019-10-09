angular.module('handyforall.task').controller('taskCtrl', taskCtrl);

taskCtrl.$inject = ['$scope', '$rootScope', '$location', '$stateParams', '$uibModal', 'TaskService', 'TaskserviceResolve', 'toastr', '$state', 'AuthenticationService', 'CurrentUserTaskserviceResolve', 'MainService', '$translate', 'ngMeta', '$cookieStore'];

function taskCtrl($scope, $rootScope, $location, $stateParams, $uibModal, TaskService, TaskserviceResolve, toastr, $state, AuthenticationService, CurrentUserTaskserviceResolve, MainService, $translate, ngMeta, $cookieStore) {
    var tac = this;
    tac.category = TaskserviceResolve[0];

    tac.taskbaseinfo = {};
    $scope.location = {};
    tac.filter = {};
    tac.filter.location = { lat: '', lng: '' };
    tac.taskbaseinfo.address = {};
    tac.addressList = []; 
    
    if (tac.category.SubCategoryInfo.name) {
        ngMeta.setTitle(tac.category.SubCategoryInfo.name);
    }

    if (TaskserviceResolve.length > 0) {
        tac.taskbaseinfo.SubCategoryInfo = tac.category.SubCategoryInfo;
    } else {
        $translate('WE ARE LOOKING FOR THIS TROUBLE SORRY UNABLE TO FETCH DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        $state.go('landing', {}, { reload: false });
    }

    if(CurrentUserTaskserviceResolve[0].user_id){
    tac.user = CurrentUserTaskserviceResolve[0];
    tac.currentuserid = tac.user._id;
    tac.type = 1;
    tac.addressList =[];
    // if (tac.user.addressList.length > 0) {
    //     tac.addressList = tac.user.addressList;
    // }
    }
    else{
        tac.addressList =[];
        tac.user = {};
        }
    changeAddressDefault();

    tac.task_details = $cookieStore.get('task_details'); 
    console.log("tac.task_details--------",tac.task_details)    
    if(tac.task_details){     
        tac.filter.about= tac.task_details.task_description;        
        var add = {};
        tac.addressList = [];
        add.address = tac.task_details.task_address;
        add.location = {
            'lat':tac.task_details.location.lat,
            'lng':tac.task_details.location.log
          }
          tac.addressList.push(add);
          tac.filter.location = add.location;
          tac.showaddress = tac.addressList[0].address        

    }

    tac.placeChanged = function () {
        var address = tac.addressList.filter(function (el) { return el._id == tac.filter.address; })[0];
        tac.filter.location = address.location;
    };

    tac.addressInfo = function (data) {
        TaskService.address(data).then(function (result) { });
    };

    tac.deleteaddress = function (index) {
        swal({
            title: 'Are you sure?',
            text: 'You like to delete your favourite address',
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes',
            cancelButtonText: 'No'
        }).then(function (response) {
            var data = {};
            data.userid = tac.user._id;
            data.id = index;
            TaskService.deleteaddress(data).then(function (response) {
                MainService.getCurrentUsers(tac.user.username).then(function (refdata) {
                    tac.addressList = refdata[0].addressList;
                    changeAddressDefault();
                })
            });
        }).catch(function (err) { });
    }

    tac.makeDefault = function (id) {
        TaskService.addressStatus(id, tac.user._id).then(function (response) {
            MainService.getCurrentUsers(tac.user.username).then(function (refdata) {
                tac.addressList = refdata[0].addressList;
                $translate('PREFERRED ADDRESS ADDED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
            })
        });
    }

    tac.Addaddress = function (data, isvalid) {
        /* Clear Address */
        tac.details = {};
        tac.showaddress = '';
        /* Clear Address */

        if (isvalid && (data ? data.location : data)) {
            if ((data.location.lat != "") && (data.location.lan != 'undefined')) {
                if(!tac.user._id){
                    var add = {};
                    tac.addressList = [];
                    add.address = data.address;
                    add.location = {
                        'lat':data.location.lat,
                        'lng':data.location.lng
                      }
                      tac.addressList.push(add);
                      tac.filter.location = add.location;
					  $cookieStore.put("addressdetail", add);
                }
                else {
                TaskService.AddAddress(tac.user._id, data).then(function (response) {
                    if (response.status === 0) {
                        $translate(response.message).then(function (headline) { toastr.info(headline); }, function (headline) { toastr.info(headline); });
                    } else {
                        $translate('ADDRESS ADDED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                    }
                    MainService.getCurrentUsers(tac.user.username).then(function (refdata) {
                        tac.addressList = refdata[0].addressList;
                    })
                });
            }

            }
        } else {
            $translate('PLEASE ENTER VALID LOCATION').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }
    }

    tac.placeChangeddd = function () {
        tac.dat = {};
        tac.details = {}
        tac.place = this.getPlace();
        tac.dat.tasker_area = {};

        tac.dat.tasker_area.lng = tac.place.geometry.location.lng();
        tac.dat.tasker_area.lat = tac.place.geometry.location.lat();
        tac.details.location = tac.dat.tasker_area;
        tac.details.address = tac.place.formatted_address;
        var add = {};
        tac.addressList = [];
        add.address = tac.details.address;
        add.location = {
            'lat':tac.dat.tasker_area.lat,
            'lng':tac.dat.tasker_area.lng
          }
          tac.addressList.push(add);
          tac.filter.location = add.location;
    };

    // tac.filter.about = $cookieStore.get('text');
    tac.SearchTasker = function (taskavailable) {
        if(tac.filter.location.lat && tac.filter.location.lng) {
        TaskService.checktaskeravailability(tac.filter.location, tac.taskbaseinfo.SubCategoryInfo._id).then(function (response) {
            console.log("tasker countttttttttttttt", response.count);
            if (response.count <= 0) {
                $translate('THE TASKER IS UN AVILABLE ON SELECTED ADDRESS').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            } else {
                if (tac.filter.about) {
                    var data = {};
                    var address = tac.addressList;
                    
                    if (address[0]) {
                        tac.filter.location = address[0].location;
                        if(tac.type == 1){
                            data.userid = tac.currentuserid;
                            }
                        data.categoryid = tac.taskbaseinfo.SubCategoryInfo._id;
                        data.address = tac.taskbaseinfo.address.line1;
                        if (tac.user.address) {
                            data.billing_address = {
                                'zipcode': tac.user.address.zipcode || "",
                                'country': tac.user.address.country || "",
                                'state': tac.user.address.state || "",
                                'city': tac.user.address.city || "",
                                'line2': tac.user.address.line2 || "",
                                'line1': tac.user.address.line1 || ""
                            };
                        } else {
                            data.billing_address = {
                                'line1': address[0].address || ""
                            };
                        }
                        data.categoryid = tac.taskbaseinfo.SubCategoryInfo._id;
                        data.task_description = tac.filter.about;
                        data.location = { 'lat': tac.filter.location.lat, 'log': tac.filter.location.lng };
                        data.task_address = address[0].address;

                        TaskService.addtask(data).then(function (result) {
                            var option = { task: result._id };
                            $cookieStore.put("slug", $stateParams.slug);
                            $cookieStore.put("task_details", data);
                            $state.go('search', { task: result._id, query: JSON.stringify(option) }, { reload: false });
                        }, function (error) {
                            toastr.error(error);
                        });
                    } else {
                        toastr.error("Add address to proceed");
                    }
                } else {
                    toastr.error("Tell Us About Your Task");
                }
            }
        }, function (error) {
            $translate('THE TASKER IS UN AVILABLE ON SELECTED ADDRESS').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        });
       }
        else {
            toastr.error("Add address to proceed");
        }
    }

    function changeAddressDefault() {
        if (!tac.filter.address) {
            tac.filter.address = '';
            var addlist = tac.addressList.filter(function (el) { return el.status == 3; });
            if (addlist.length > 0) {
                tac.filter.address = addlist[0]._id;
            } else if (tac.addressList[0]) {
                tac.filter.address = tac.addressList[0]._id;
            }
        }

        /** Select Default Address */
        var address = tac.addressList.filter(function (el) { return el._id == tac.filter.address; })[0];
        if (address) {
            tac.filter.location = address.location;
        } else if (tac.addressList[0]) {
            tac.filter.address = tac.addressList[0]._id;
            tac.filter.location = tac.addressList[0].location;
        }
    }
}