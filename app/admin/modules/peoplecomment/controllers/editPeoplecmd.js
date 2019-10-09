angular.module('handyforall.peoplecmd').controller('editPeoplecmdCtrl', editPeoplecmdCtrl);

editPeoplecmdCtrl.$inject = ['PeoplecmdEditReslove', 'PeoplecmdService', 'toastr', '$state', '$stateParams', 'Slug'];

function editPeoplecmdCtrl(PeoplecmdEditReslove, PeoplecmdService, toastr, $state, $stateParams, Slug) {
    var epcc = this;

    epcc.editpeopletData = PeoplecmdEditReslove[0];
    epcc.editpeopletData = {};
    epcc.editpeopletData = PeoplecmdEditReslove[1];

    if ($stateParams.id) {
        epcc.action = 'edit';
        epcc.breadcrumb = 'SubMenu.EDIT_PEOPLE_COMMENT';
    } else {
        epcc.action = 'add';
        epcc.breadcrumb = 'SubMenu.PEOPLE_COMMENT_ADD';
    }

    PeoplecmdService.getSetting().then(function (response) {
        epcc.editsettingData = response[0].settings.site_url;
    })
    epcc.disbledValue = false;
    epcc.submit = function submit(isValid, data) {
        if (isValid) {
            epcc.disbledValue = true;
            PeoplecmdService.savepeoplecmd(data).then(function (response) {
                toastr.success('People Comments Added Successfully');
                $state.go('app.peoplecomment.list', { page: $stateParams.page, items: $stateParams.items });
            }, function (err) {
                toastr.error('Unable to process your request');
            });
        } else {
            toastr.error('form is invalid');
        }

    };

}
