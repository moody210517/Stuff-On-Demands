angular.module('handyforall.peoplecmd').controller('peoplecmdListCtrl', peoplecmdListCtrl);

peoplecmdListCtrl.$inject = ['PeoplecmdServiceResolve', 'PeoplecmdService', '$scope', '$stateParams'];

function peoplecmdListCtrl(PeoplecmdServiceResolve, PeoplecmdService, $scope, $stateParams) {
    var pclc = this;
    pclc.permission = $scope.privileges.filter(function (menu) {
        return (menu.alias === "peoplecmd");
    }).map(function (menu) {
        return menu.status;
    })[0];
    var layout = [
        {
            name: 'Name',
            variable: 'name',
            template: '{{content.name}}',
            sort: 1
        },
        {
            name: 'Profession',
            variable: 'profession',
            template: '{{content.profession}}',
            sort: 1
        },
        { name: 'People Image', template: '<img ng-src="{{content.image}}" alt="" class="size-50x50" style="border-radius: 0%;">' },
        {
            name: 'Status', template: '<span ng-switch="content.status">' +
            '<span  ng-switch-when="1">Publish</span>' +
            '<span  ng-switch-when="2">UnPublish</span>' +
            '</span>'
        },
        {
            name: 'Actions',
            template: '<button class="btn btn-info btn-rounded btn-ef btn-ef-5 btn-ef-5b" ng-if="options.permission.edit != false" ui-sref="app.peoplecomment.edit({id:content._id,page:currentpage,items:entrylimit})"><i class="fa fa-edit"></i> <span>Edit</span></button>' +
            '<button class="btn btn-danger btn-rounded btn-ef btn-ef-5 btn-ef-5b" ng-if="options.permission.delete != false" ng-click="CCC.openDeleteModal(small, content, options)" ><i class="fa fa-trash"></i> <span>Delete</span></button>'

        }
    ];

    pclc.table = {};
    pclc.table.layout = layout;
    pclc.table.data = PeoplecmdServiceResolve[0];
    pclc.table.page = $stateParams.page || 0;
    pclc.table.entryLimit = $stateParams.items || 10;
    pclc.table.count = PeoplecmdServiceResolve[1] || 0;
    pclc.table.delete = {
        'permission': pclc.permission, service: '/peoplecmd/deletepeoplecmd', getData: function (currentPage, itemsPerPage, sort, status, search) {
            if (currentPage >= 1) {
                var skip = (parseInt(currentPage) - 1) * itemsPerPage;
                PeoplecmdService.getPeoplelist(itemsPerPage, skip, sort, status, search).then(function (respo) {
                    pclc.table.data = respo[0];
                    pclc.table.count = respo[1];
                });
            }
        }
    };
}
