angular.module('handyforall.pages').controller('categoryPageListCtrl', categoryPageListCtrl);

categoryPageListCtrl.$inject = ['PageService', 'PageCategoryResolve', '$scope'];

function categoryPageListCtrl(PageService, PageCategoryResolve, $scope) {

    var cplc = this;
    cplc.permission = $scope.privileges.filter(function (menu) {
        return (menu.alias === "page");
    }).map(function (menu) {
        return menu.status;
    })[0];

    var layout = [
        {
            name: 'Category Name',
            template: '{{content.name}}'
        },
        {
            name: 'Actions',
            template: '<button class="btn btn-info btn-rounded btn-ef btn-ef-5 btn-ef-5b" ng-if="options.permission.edit != false" ui-sref=app.pages.categoryPage({name:content.name})><i class="fa fa-edit"></i> <span>Edit</span></button>' +
            '<button class="btn btn-danger btn-rounded btn-ef btn-ef-5 btn-ef-5b" ng-if="options.permission.delete != false" ng-click="CCC.openDeleteModal(small, content, options)" ><i class="fa fa-trash"></i> <span>Delete</span></button>'
        }
    ];

    cplc.table = {};
    cplc.table.layout = layout;
    cplc.table.data = PageCategoryResolve.settings;
    cplc.table.count = PageCategoryResolve.settings.length || 0;
    cplc.table.delete = {
        'permission': cplc.permission, service: '/pages/deletecategorypage', getData: function (currentPage, itemsPerPage, sort, status, search) {
            if (currentPage >= 1) {
                var skip = (parseInt(currentPage) - 1) * itemsPerPage;
                PageService.getPageSetting().then(function (respo) {
                    cplc.table.data = respo.settings;
                    cplc.table.count = respo.settings.length || 0;
                });
            }
        }
    };
}
