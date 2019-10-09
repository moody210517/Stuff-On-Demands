(function () {

    'use strict';

    angular.module('handyforall.currencies', []).controller('currencySettingsAddCtrl', currencySettingsAddCtrl);
    currencySettingsAddCtrl.$inject = ['currencyServiceResolve', 'CurrencyService', 'toastr', '$state', '$stateParams'];
    function currencySettingsAddCtrl(currencyServiceResolve, CurrencyService, toastr, $state, $stateParams) {
        var csac = this;
        if ($stateParams.id) {
            csac.action = 'edit';
            csac.breadcrumb = 'SubMenu.CURRENCY_EDITSETTINGS';
            csac.msg = "Edited";
        } else {
            csac.action = 'add';
            csac.breadcrumb = 'SubMenu.CURRENCY_ADDSETTINGS';
            csac.msg = "Added";

        }
        if (currencyServiceResolve) {
            csac.currencyData = currencyServiceResolve[0];
        }

        csac.submitCurrency = function submitCurrency(isValid, data) {
            if (isValid) {
                if (data.status == 2) {
                    if (csac.currencyData.default == 1) {
                        toastr.error('Please chnage your Default Currency to some other Currency then only You can able to Unselect this Currency.....');
                    } else {
                        CurrencyService.save(data).then(function (response) {
                            $state.go('app.settings.currencySettings.list');
                            toastr.success('Currency ' + csac.msg + ' Successfully');
                        }, function (err) {
                            toastr.error('Unable to process your request');
                        });
                    }
                } else {
                    CurrencyService.save(data).then(function (response) {
                        $state.go('app.settings.currencySettings.list');
                        toastr.success('Currency ' + csac.msg + ' Successfully');
                    }, function (err) {
                        toastr.error('Unable to process your request');
                    });
                }
            }
            else {
                toastr.error('form is invalid');
            }
        };
    }
})();
