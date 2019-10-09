angular.module('handyforall.question').controller('editQuestionerCtrl', editQuestionerCtrl);

editQuestionerCtrl.$inject = ['QuestionEditReslove', 'QuestionService', 'toastr', '$state', '$stateParams'];

function editQuestionerCtrl(QuestionEditReslove, QuestionService, toastr, $state, $stateParams) {
    var edqc = this;
    edqc.editQuestionData = QuestionEditReslove[0];

    if ($stateParams.id) {
        edqc.action = 'edit';
        edqc.breadcrumb = 'SubMenu.EDIT_QUESTION';
    } else {
        edqc.action = 'add';
        edqc.breadcrumb = 'SubMenu.ADD_QUESTION';
    }

    edqc.submit = function submit(isValid) {
        if (isValid) {
            QuestionService.save(edqc.editQuestionData).then(function (response) {
                toastr.success('Question Added Successfully');
                $state.go('app.tasker_management.question.viewsQuestion');
            }, function (err) {
                toastr.error('Unable to process your request');
            });
        } else {
            toastr.error('form is invalid');
        }

    };



}
