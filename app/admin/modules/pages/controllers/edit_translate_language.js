angular.module('handyforall.pages').controller('editPageLanguageCtrl', editPageLanguageCtrl);

editPageLanguageCtrl.$inject = ['SubPageServiceResolve', 'PageTranslateServiceResolve', 'toastr', 'PageService', 'Slug', '$state', '$stateParams'];

function editPageLanguageCtrl(SubPageServiceResolve, PageTranslateServiceResolve, toastr, PageService, Slug, $state, $stateParams) {

    var edplc = this;
    edplc.mainPagesList = SubPageServiceResolve[0];
    edplc.editPageData = {};

    if ($stateParams.id) {
        edplc.action = 'edit';
        edplc.breadcrumb = 'SubMenu.EDIT_PAGE';
    } else {
        edplc.action = 'add';
        edplc.breadcrumb = 'SubMenu.ADD_PAGE';
    }

    edplc.languagedata = PageTranslateServiceResolve.languagedata;
    edplc.pageCollectionData = PageTranslateServiceResolve.pagesdata;
    PageService.getSetting().then(function (response) {
        edplc.editsettingData = response[0].settings.site_url;
    })

    edplc.editPageData = SubPageServiceResolve[1][0];
    edplc.submitEditPageData = function submitEditPageData(isValid, data) {
        if (isValid) {
            data.slug = Slug.slugify(data.slug);
            PageService.submitPage(data).then(function (response) {
              if (response == "Slug") {
                  toastr.error('This slug already assigned try another page slug!!!');
              }
                else if (response == "Assigned") {
                    toastr.error('This Page already assigned to this language check again!!!');
                } else {console.log(response.message,"uuuuuuuu")
                    toastr.success(response.message);
                    $state.go('app.pages.list');
                }
            }, function (err) {
                toastr.error('Unable to process your request');
            });

        } else {
            toastr.error('form is invalid');
        }
    };

}
