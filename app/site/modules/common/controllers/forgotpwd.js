angular.module('handyforall.forgotpassword').controller('pwdloginCtrl', pwdloginCtrl);
pwdloginCtrl.$inject = ['$scope', 'ForgotpasswordService', 'toastr', '$translate', '$stateParams'];
function pwdloginCtrl($scope, ForgotpasswordService, toastr, $translate, $stateParams) {
    var pwc = this;
    pwc.type = $stateParams.type;
    pwc.forgotpass = function forgotpass(isValid, formData) {
        if (isValid) {
            var data = {};
            data.email = formData;
            data.type = $stateParams.type;
            ForgotpasswordService.saveUserInfo(data).then(function (response) {
                $translate('PASSWORD RESET MAIL HAS BEEN SENT TO YOUR EMAIL ID').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
            }, function (err) {
                $translate('INVALID EMAIL ID').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            });
        } else {
            $translate('EMAIL IS REQUIRED').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }
    }
}

angular.module('handyforall.forgotpassword').controller('pwdmailCtrl', pwdmailCtrl);
pwdmailCtrl.$inject = ['$scope', 'toastr', 'ForgotpasswordService', '$state', '$stateParams', '$translate'];
function pwdmailCtrl($scope, toastr, ForgotpasswordService, $state, $stateParams, $translate) {

    var pwmc = this;
    pwmc.forgotpassmailuser = function forgotpassmailuser(isValid, formData) {


        if (isValid) {


            var data = {};
            data.user = $stateParams.userid;
            data.reset = $stateParams.resetid;
            data.password = formData;
            data.type = $stateParams.type;

            ForgotpasswordService.saveUsermailpwd(data).then(function (response) {
                $translate('PASSWORD HAS BEEN CHANGED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                $state.go('login', { type: 'user' });
            }, function (err) {
                $translate('ERROR IN CHANGING PASSWORD').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            });
        } else {
            $translate('ERROR IN CHANGING PASSWORD').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        }
    }
}