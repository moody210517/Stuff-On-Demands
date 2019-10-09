angular.module('handyforall.users').controller('usersListCtrl', usersListCtrl);

usersListCtrl.$inject = ['usersServiceResolve', 'UsersService', '$scope', 'MainService', 'toastr', '$stateParams', '$rootScope'];

function usersListCtrl(usersServiceResolve, UsersService, $scope, MainService, toastr, $stateParams, $rootScope) {

    var tlc = this;
    tlc.permission = $scope.privileges.filter(function (menu) {
        return (menu.alias === "users");
    }).map(function (menu) {
        return menu.status;
    })[0];

    if (usersServiceResolve[2]) {
        tlc.allValue = usersServiceResolve[2].allValue || 0;
        tlc.activeValue = usersServiceResolve[2].activeValue || 0;
        tlc.deactivateValue = usersServiceResolve[2].deactivateValue || 0;
        tlc.deletedValue = usersServiceResolve[2].deletedValue || 0;
    }

    $scope.statusValue = 0;
    tlc.statusPass = function statusPass(status, limit, skip) {
        $scope.statusValue = status;
        if (status == 1 || status == 2 || status == 0 || status == 5) {
            UsersService.getAllUsers(status, limit, skip).then(function (respo) {
                tlc.table.data = respo[0];
                tlc.table.count = respo[1] || 0;
                if (respo[2]) {
                    tlc.allValue = respo[2].allValue || 0;
                    tlc.activeValue = respo[2].activeValue || 0;
                    tlc.deactivateValue = respo[2].deactivateValue || 0;
                    tlc.deletedValue = respo[2].deletedValue || 0;
                }
            });
        }
    };

    console.log("usersServiceResolve", usersServiceResolve);
    UsersService.getSettings().then(function (response) {
        tlc.getsetting = response;
    });
    tlc.exportuser = function exportuser() {
        UsersService.exportuserData('User', $scope.statusValue).then(function (response) {
            if (response.status == 0) {
                toastr.error('No data found to export');
            } else {
                window.location.href = tlc.getsetting.site_url + "admin/download-file/" + response.message.type + "/" + response.message.filename;
            }
        }, function (err) {
            toastr.error(err);
        });
    }



    var layout = [
        {
            name: 'Name',
            template: '{{content.username}}',
            sort: 1,
            variable: 'username',
        },
        {
            name: 'Email',
            template: '{{content.email}}',
            sort: 1,
            variable: 'email',
        },
        {
            name: 'Status ',
            template:
            '<span  ng-switch="content.status">' +
            '<span  ng-switch-when="1">Active</span>' +
            '<span  ng-switch-when="2">In-Active</span>' +
            '<span  ng-switch-when="0">Deleted</span>' +
            '</span>'
        },
        {
            name: 'Phone',
            template: '{{content.phone.number}}',
            variable: 'phone',
        },
        {
            name: 'Last Login Date',
            template: "<div>{{content.createdAt | date:'yyyy-MM-dd hh:mm:ss'}} </div>",
            sort: 1,
            variable: 'createdAt'
        },
        {
            name: 'Actions',
            template: '<button class="btn btn-info btn-rounded btn-ef btn-ef-5 btn-ef-5b"  ng-if="options.permission.edit != false"  ui-sref="app.users.add({id:content._id,page:currentpage,items:entrylimit})"><i class="fa fa-edit"></i> <span>Edit</span></button>' +
            '<button class="btn btn-danger btn-rounded btn-ef btn-ef-5 btn-ef-5b" ng-if="options.permission.delete != false"  ng-click="CCC.openDeleteModal(small, content, options)" ><i class="fa fa-trash"></i> <span>Delete</span></button>'
        }
    ];
    tlc.table = {};
    tlc.table.layout = layout;
    tlc.table.data = usersServiceResolve[0];
    tlc.table.page = $stateParams.page || 0;
    tlc.table.entryLimit = $stateParams.items || 50;
    tlc.table.count = usersServiceResolve[1] || 0;
    tlc.table.delete = {
        'permission': tlc.permission,
        'date': $scope.date,
        service: '/users/delete', getData: function (currentPage, itemsPerPage, sort, status, search) {
            if (currentPage >= 1) {
                var skip = (parseInt(currentPage) - 1) * itemsPerPage;
                UsersService.getAllUsers($scope.statusValue, itemsPerPage, skip, sort, status, search).then(function (respo) {
                    tlc.table.data = respo[0];
                    tlc.table.count = respo[1];

                });
            }
        }
    };

}
