angular.module('handyforall.cancellation').controller('editCancellationCtrl', editCancellationCtrl);

editCancellationCtrl.$inject = ['editcancellationResolve', 'cancellationService', '$scope', 'toastr', '$state', '$stateParams'];

function editCancellationCtrl(editcancellationResolve, cancellationService, $scope, toastr, $state, $stateParams) {

    var ecal = this;
    ecal.editData = editcancellationResolve[0];
    if ($stateParams.id) {
        ecal.action = 'Edit';
        ecal.breadcrumb = 'SubMenu.CANCELLATION';
    } else {
        ecal.action = 'Add';
        ecal.breadcrumb = 'SubMenu.CANCELLATION';
    }
    ecal.submit = function submit(isValid) {
        if (isValid) {
            cancellationService.save(ecal.editData).then(function (response) {
                if (ecal.action == 'edit') {
                    var action = "edited";
                } else {
                    var action = "added";
                }
                toastr.success('Cancellation reason ' + action + ' Successfully');
                $state.go('app.cancellation.list');
            }, function (err) {
                toastr.error('Unable to process your request');
            });
        } else {
            toastr.error('form is invalid');
        }

    };

}
