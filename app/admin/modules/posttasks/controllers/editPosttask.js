angular.module('handyforall.posttasks').controller('editPosttaskCtrl', editPosttaskCtrl);

editPosttaskCtrl.$inject = ['posttaskEditReslove', 'PosttaskService', 'toastr', '$state', '$stateParams', 'Slug'];

function editPosttaskCtrl(posttaskEditReslove, PosttaskService, toastr, $state, $stateParams, Slug) {
    var eptc = this;

    eptc.editpaymentData = posttaskEditReslove[0];
    eptc.editpaymentData = {};
    eptc.editpaymentData = posttaskEditReslove[1];

    if ($stateParams.id) {
        eptc.action = 'edit';
        eptc.breadcrumb = 'SubMenu.EDIT_PAYMENT_PRICE';
    } else {
        eptc.action = 'add';
        eptc.breadcrumb = 'SubMenu.TASKSPOST ADD';
    }

    PosttaskService.getSetting().then(function (response) {
        eptc.editsettingData = response[0].settings.site_url;
    })
    eptc.disbledValue = false;
    eptc.submit = function submit(isValid, data) {
        if (isValid) {
            eptc.disbledValue = true;
            PosttaskService.savepaymentprice(data).then(function (response) {
                toastr.success('Payment Price Added Successfully');
                $state.go('app.posttasks.list', { page: $stateParams.page, items: $stateParams.items });
            }, function (err) {
                toastr.error('Unable to process your request');
            });
        } else {
            toastr.error('form is invalid');
        }

    };

}
