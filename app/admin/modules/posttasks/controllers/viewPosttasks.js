angular.module('handyforall.posttasks').controller('posttasksListCtrl', posttasksListCtrl);

posttasksListCtrl.$inject = ['PosttaskServiceResolve', 'PosttaskService', '$scope', '$stateParams'];

function posttasksListCtrl(PosttaskServiceResolve, PosttaskService, $scope, $stateParams) {
    var ptlc = this;

    ptlc.permission = $scope.privileges.filter(function (menu) {
        return (menu.alias === "taskspost");
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
        { name: 'Image', template: '<img ng-src="{{content.image}}" alt="" class="size-50x50" style="border-radius: 0%;">' },
        {
            name: 'Status', template: '<span ng-switch="content.status">' +
            '<span  ng-switch-when="1">Publish</span>' +
            '<span  ng-switch-when="2">UnPublish</span>' +
            '</span>'
        },
        {
            name: 'Actions',
            template: '<button class="btn btn-info btn-rounded btn-ef btn-ef-5 btn-ef-5b" ng-if="options.permission.edit != false" ui-sref="app.posttasks.edit({id:content._id,page:currentpage,items:entrylimit})"><i class="fa fa-edit"></i> <span>Edit</span></button>' +
            '<button class="btn btn-danger btn-rounded btn-ef btn-ef-5 btn-ef-5b" ng-if="options.permission.delete != false" ng-click="CCC.openDeleteModal(small, content, options)" ><i class="fa fa-trash"></i> <span>Delete</span></button>'

        }
    ];

    ptlc.table = {};
    ptlc.table.layout = layout;
    ptlc.table.data = PosttaskServiceResolve[0];
    ptlc.table.page = $stateParams.page || 0;
    ptlc.table.entryLimit = $stateParams.items || 10;
    ptlc.table.count = PosttaskServiceResolve[1] || 0;
    ptlc.table.delete = {
        'permission': ptlc.permission, service: '/posttask/deletepaymentprice', getData: function (currentPage, itemsPerPage, sort, status, search) {
            if (currentPage >= 1) {
                var skip = (parseInt(currentPage) - 1) * itemsPerPage;
                PosttaskService.getPaymentPrice(itemsPerPage, skip, sort, status, search).then(function (respo) {
                    ptlc.table.data = respo[0];
                    ptlc.table.count = respo[1];
                });
            }
        }
    };
}
