angular.module('handyforall.accounts')
    .controller('AccountCategoryCtrl', AccountCategoryCtrl)
    .controller('CategoriesModalInstanceCtrl', CategoriesModalInstanceCtrl);

AccountCategoryCtrl.$inject = ['$scope', '$rootScope', '$state', 'toastr', 'MainService', 'routes', '$uibModal', '$translate'];
CategoriesModalInstanceCtrl.$inject = ['$scope', '$rootScope', '$state', 'toastr', 'MainService', 'routes', 'experiences', 'defaultcurrency', 'user', 'categories', 'category', '$uibModalInstance', '$translate'];

function AccountCategoryCtrl($scope, $rootScope, $state, toastr, MainService, routes, $uibModal, $translate) {
    var acc = this;
    if (angular.isDefined($rootScope.accountProfile)) {
        
        acc.user = $rootScope.accountProfile;
        acc.currency = $rootScope.defaultCurrency;
    }
    var id = $rootScope.userId;

    // get all category list
    MainService.getData(routes.category, {}).then(function (response) {
        if (angular.isDefined(response)) {
            acc.categories = response || [];
        }
        // get user categories
        return MainService.getData(routes.usercat, { _id: id });
    }).then(function (response1) {
        if (angular.isDefined(response1)) {
            acc.usercategories = response1 || [];
        }
        // get experience
        return MainService.getData(routes.catexp, {});
    }).then(function (response2) {
        if (angular.isDefined(response2)) {
            acc.experiences = response2 || [];
        }
    }).catch(function (err) {
        console.error('err = ', err);
    });

    // get all category list
    // var _id = $rootScope.userId;
    // var category = MainService.getData(routes.category, {});
    // var usercat = MainService.getData(routes.usercat, { _id });
    // var catexp = MainService.getData(routes.catexp, {});
    // Promise.all([category, usercat, catexp]).then(function(response) {
    //     if (angular.isDefined(response)) {
    //         acc.categories = response[0] || [];
    //         acc.usercategories = response[1] || [];
    //         acc.experiences = response[2] || [];
    //     }
    // });




    function updateCat() {
        var _id = $rootScope.userId;
        MainService.getData(routes.usercat, { _id: _id }).then(function (response) {
            if (angular.isDefined(response)) {
                acc.usercategories = response || [];
                $state.go('account.category', {}, { reload: false });
            }
        }).catch(function (err) {
            console.error('err = ', err);
        });
    };

    function CategoryModal(category) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'app/site/modules/accounts/views/category.modal.tab.html',
            controller: 'CategoriesModalInstanceCtrl',
            controllerAs: 'ACM',
            resolve: {
                experiences: function () {
                    return acc.experiences;
                },
                defaultcurrency: function () {
                    return acc.currency;
                },
                user: function (MainService, routes) {
                    // if (category) {
                    return MainService.getData(routes.accEdit, { id: id });
                    // } else {
                    //     return acc.user;
                    // }
                },
                categories: function () {
                    return acc.categories;
                },
                category: function () {
                    return category;
                }
            }
        });
        modalInstance.result.then(function (selectedCategoryData) {
            console.log('selectedCategoryData',selectedCategoryData)
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
    // ----------------------------------------------------------------------------------------
    function DeletecategoryModal(category, catname) {

        swal({
            title: 'Delete Category',
            text: 'Are you sure want to delete this category?',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Delete!'
        }).then(function (response) {
            if (response) {
                var categoryinfo = {};
                categoryinfo.userid = acc.user._id;
                categoryinfo.categoryid = category;
                categoryinfo.categoryname = catname;
                MainService.getData(routes.delCat, categoryinfo).then(function (response) {
                    if (response.nModified === 1) {
                        $translate('CATEGORY DELETED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                        updateCat();
                    }

                }).catch(function (err) {
                    console.error('err = ', err);
                });
            }
        }).catch(function (err) {
            // console.error('err - ',err);
        });
    }
    angular.extend(acc, {
        CategoryModal: CategoryModal,
        DeletecategoryModal: DeletecategoryModal
    });

    console.log("$rootScope.accountProfile", $rootScope.accountProfile);
};
// ----------------------------------------- controller ------------------------------------
function CategoriesModalInstanceCtrl($scope, $rootScope, $state, toastr, MainService, routes, experiences, defaultcurrency, user, categories, category, $uibModalInstance, $translate) {
    var acm = this;
    if (category) {
        acm.role = 'Edit';
        acm.user = user[0];
    } else {
        acm.user = user[0];
        acm.role = 'New';
    }
    acm.defaultcurrency = defaultcurrency;
    acm.categories = categories;
    acm.experiences = experiences;
    acm.category = acm.categories.filter(function (obj) {

        return obj._id === category;
    })[0];

    acm.selectedCategoryData = {};
    acm.selectedCategoryData.skills = [];
    //acm.selectedCategoryData.hour_rate = 0;

    for (var i = 0; i < acm.user.taskerskills.length; i++) {
        if (acm.user.taskerskills[i].childid == category) {
            acm.selectedCategoryData = acm.user.taskerskills[i];
        }
    }

    acm.selectedCategoryData.userid = acm.user._id;

    if (acm.category) {
        acm.mode = 'EDIT';
    } else {
        acm.mode = 'ADD';
    }

    function onChangeCategory(category) {
        acm.category = acm.categories.filter(function (obj) {
            return obj._id === category;
        })[0];
    };

    function onChangeCategoryChild(catchild) {
        var id = catchild;
        MainService.getData(routes.catChild, { id: id }).then(function (response) {
            console.log("response", response);
            if (response.ratetype) {
               // if (response.ratetype == "") {
                    acm.ratetype = response.ratetype;
               // } else {
                    //acm.ratetype = 1
                }
           // } else {
              //  acm.ratetype = 1
           // }
            acm.MinimumAmount = response.commision;
            acm.selectedCategoryData.hour_rate = parseFloat((response.commision * acm.defaultcurrency[0].value).toFixed(2));

            acm.selectedCategoryData.ratetype = acm.ratetype;
        }).catch(function (err) {
            console.error('err = ', err);
        });
        acm.category = acm.user.taskerskills.filter(function (obj) {
            if (obj.childid === catchild) {
                $translate('ALREADY THE CATEGORY IS EXISTS').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                $uibModalInstance.dismiss('cancel');
            } else {
                return obj._id === catchild;
            }
        })[0];
    };

    if (acm.selectedCategoryData.childid) {
        var childid = acm.selectedCategoryData.childid;
        MainService.getData(routes.catChild, { id: childid }).then(function (response) {
            if (response.ratetype) {
                //if (response.ratetype == 2) {
                    acm.ratetype = response.ratetype;
                //} else {
                   // acm.ratetype = 1
                }
            //} else {
               // acm.ratetype = 1
           // }
            acm.MinimumAmount = response.commision;
            if(acm.ratetype == 'Flat') {
                acm.selectedCategoryData.hour_rate = parseFloat((response.commision * acm.defaultcurrency[0].value).toFixed(2));
            }
            acm.selectedCategoryData.ratetype = acm.ratetype;

        }).catch(function (err) {
            console.error('err = ', err);
        });
    }

    //acm.selectedCategoryData.hour_rate = parseFloat((acm.selectedCategoryData.hour_rate * acm.defaultcurrency[0].value).toFixed(2));

    function ok(valid) {
        if (valid) {
            $uibModalInstance.close(acm.selectedCategoryData);
        } else {
            $translate('FORM IS INVALID').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }
    };

    function cancel() {
        $uibModalInstance.dismiss('cancel');
    };

    angular.extend(acm, {
        ok: ok,
        cancel: cancel,
        onChangeCategoryChild: onChangeCategoryChild,
        onChangeCategory: onChangeCategory
    });
};
