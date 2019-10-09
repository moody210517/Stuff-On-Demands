(function () {
	'use strict';
	angular.module('handyforall.languages', []).controller('languageSettingsEditCtrl', languageSettingsEditCtrl);

	languageSettingsEditCtrl.$inject = ['languageServiceResolve', 'toastr', 'languageService', '$state', '$stateParams'];

	function languageSettingsEditCtrl(languageServiceResolve, toastr, languageService, $state, $stateParams) {
		var lsec = this;
		lsec.languageData = {};
		lsec.languageData = languageServiceResolve[0][0];

		if ($stateParams.id) {
			lsec.action = 'edit';
			lsec.breadcrumb = 'SubMenu.LANGUAGE_EDITSETTINGS';
			lsec.msg = 'Edited';
		} else {
			lsec.action = 'add';
			lsec.breadcrumb = 'SubMenu.LANGUAGE_ADDSETTINGS';
			lsec.msg = 'Added';
		}
		lsec.submitlanguage = function submitlanguage(data, isValid) {
			if (isValid) {
				if (data.status == 2) {
					if (lsec.languageData.default == 1) {
						toastr.error('Please chnage your Default language to some other language then only You can able to Unselect this language.....');
					} else {
						languageService.editlanguage(data).then(function (response) {
							$state.go('app.settings.languageSettings.list', {}, { reload: true });
							toastr.success('Template ' + lsec.msg + ' successfully');
						}, function (err) {
							toastr.error('Unable to process your request');
						});
					}
				} else {
					languageService.editlanguage(data).then(function (response) {
						$state.go('app.settings.languageSettings.list', {}, { reload: true });
						toastr.success('Template ' + lsec.msg + ' successfully');
					}, function (err) {
						toastr.error('Unable to process your request');
					});
				}
			}
			else {
				toastr.error("Form is invalid");
			}
		};

	}

})();
