angular.module('handyforall.forgotpassword').controller('otploginCtrl', otploginCtrl);
otploginCtrl.$inject = ['$scope', '$state', 'ForgotpwduserService', 'toastr', '$translate', '$stateParams', 'AuthenticationService', '$cookieStore', '$location'];
function otploginCtrl($scope, $state, ForgotpwduserService, toastr, $translate, $stateParams, AuthenticationService, $cookieStore, $location) {
    var otpc = this;

    otpc.newstatus = false;

    ForgotpwduserService.getuserdata($stateParams.id).then(function (response) {
        otpc.user = response;
    })

    otpc.activate = function activate(isValid, formData) {
        if (formData != otpc.user.phone.number) {
            $translate('MOBILE NUMBER IS NOT MATCH').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
        } else {
            if (formData) {
                var data = {};
                data.mobile = formData;
                data.userid = $stateParams.id;
                ForgotpwduserService.activateUserAccount(data).then(function (response) {
                    if (response.otpkey) {
                        otpc.newstatus = true;
                        if(response.sms == 'development'){
                            otpc.otp = response.otpkey;
                        }
                    }
                }, function (err) {
                    otpc.newstatus = true;
                    $translate(err.message).then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                });
            }
        }
    }


    otpc.otpsignup = function otpsignup(isValid, otpvalue) {
        if (otpvalue) {
            var data = {};
            data.otpKey = otpvalue;
            data.userid = $stateParams.id;

            ForgotpwduserService.otpsave(data).then(function (response) {
                if (response) {
                    $translate('ACCOUNT VERIFIED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                    $state.go('login', { type: 'user' });
                } else {
                    $translate('INVALID OTP').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                }
            }, function (err) {
                $translate('INVALID EMAIL ID').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            });
        } else {
            $translate('Enter OTP').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });

        }
    }
    otpc.resendotp = function resendotp(isValid, formData) {
        if ($stateParams.id) {
            ForgotpwduserService.resendotp($stateParams.id).then(function (response) {
                $translate('OTP RESEND SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
            }, function (err) {
                $translate('INVALID DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                // toastr.error('User Not exist');
            });
        } else {
            $translate('OTP IS REQUIRED').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });

        }
    }

}
