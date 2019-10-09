angular.module('handyforall.contactus').controller('editContactCtrl', editContactCtrl);

editContactCtrl.$inject = ['contactEditReslove', 'ContactService', 'toastr', '$state', '$filter'];

function editContactCtrl(contactEditReslove, ContactService, toastr, $state, $filter) {
    var edcc = this;
    edcc.editContactData = contactEditReslove[0];

    edcc.Sendmail = function Sendmail(data) {
        if (data) {
            ContactService.sendMail(edcc.editContactData).then(function (response) {
                if (response) {
                    toastr.success('Mail Sended Successfully');
                    $state.go('app.contact.view');
                }
            })
        }
    }
}
