angular.module('handyforall.pages').controller('editPageCtrl', editPageCtrl);

editPageCtrl.$inject = ['PageServiceResolve', 'toastr', 'PageService', 'Slug', '$state', '$stateParams', 'PageCategoryResolve'];

function editPageCtrl(PageServiceResolve, toastr, PageService, Slug, $state, $stateParams, PageCategoryResolve) {

    var edpc = this;
    edpc.mainPagesList = PageServiceResolve[0];
    edpc.editPageData = {};

    if ($stateParams.id) {
        edpc.action = 'edit';
        edpc.breadcrumb = 'SubMenu.EDIT_PAGE';
    } else {
        edpc.action = 'add';
        edpc.breadcrumb = 'SubMenu.ADD_PAGE';
    }

    PageService.getSetting().then(function (response) {
        edpc.editsettingData = response[0].settings.site_url;
    })

    edpc.categoryapge = PageCategoryResolve.settings;
    edpc.editPageData = PageServiceResolve[1][0];
    edpc.submitEditPageData = function submitEditPageData(isValid, data) {
        if (isValid) {
            data.slug = Slug.slugify(data.slug);
            PageService.submitPage(data).then(function (response) {
                toastr.success(response.message);
                $state.go('app.pages.list');
            }, function (err) {
                toastr.error('Unable to process your request');
            });

        } else {
            toastr.error('form is invalid');
        }
    };

}
