angular.module('handyforall.experience').controller('editExperienceCtrl', editExperienceCtrl);

editExperienceCtrl.$inject = ['ExperienceService', 'toastr', 'ExperienceEditReslove', '$state', '$stateParams'];
function editExperienceCtrl(ExperienceService, toastr, ExperienceEditReslove, $state, $stateParams) {
    var eec = this;
    eec.editExperienceData = ExperienceEditReslove;
    /*,ExperienceEditReslove*/
    if ($stateParams.id) {
        eec.action = 'edit';
        eec.breadcrumb = 'SubMenu.EDIT_EXPERIENCE';
    } else {
        eec.action = 'add';
        eec.breadcrumb = 'SubMenu.ADD_EXPERIENCE';
    }
    eec.submit = function submit(isValid) {
        if (isValid) {
            ExperienceService.save(eec.editExperienceData).then(function (response) {
                if (eec.action == 'edit') {
                    var action = "edited";
                } else {
                    var action = "added";
                }
                toastr.success('Experience ' + action + ' Successfully');
                $state.go('app.tasker_management.experience.list');
            }, function (err) {
                toastr.error('Unable to process your request');
            });
        } else {
            toastr.error('form is invalid');
        }

    };


}
