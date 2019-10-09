angular.module('handyforall.settings').controller('generalSettingsCtrl', generalSettingsCtrl);

generalSettingsCtrl.$inject = ['GeneralSettingsServiceResolve', 'TimeZoneSettingsServiceResolve', 'toastr', 'SettingsService'];
function generalSettingsCtrl(GeneralSettingsServiceResolve, TimeZoneSettingsServiceResolve, toastr, SettingsService) {
	var gsc = this;
	gsc.generalSettings = GeneralSettingsServiceResolve[0];
	gsc.generalSettings.timenow = new Date().getTime();
	gsc.timezone = TimeZoneSettingsServiceResolve;
	if (gsc.generalSettings.minaccepttime || gsc.generalSettings.accepttime) {
		gsc.generalSettings.accepttime = parseInt(gsc.generalSettings.accepttime)
		gsc.generalSettings.minaccepttime = parseInt(gsc.generalSettings.minaccepttime)
	}


	gsc.time_format = ['hh:mm a', 'HH:mm'];
	gsc.date_format = ['MMMM Do, YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'];

	if (gsc.time_format.indexOf(gsc.generalSettings.time_format) < 0) {
		gsc.customtime = gsc.generalSettings.time_format;
	}

	if (gsc.date_format.indexOf(gsc.generalSettings.date_format) < 0) {
		gsc.customdate = gsc.generalSettings.date_format;
	}

	gsc.clockFunc = function clockFunc() {
		gsc.generalSettings.timezone = gsc.generalSettings.time_zone;
		gsc.generalSettings.format = gsc.generalSettings.date_format;
	}

	gsc.datekeyFunc = function datekeyFunc() {
		gsc.generalSettings.datekeyformat = gsc.generalSettings.date_format;
	}

	gsc.submitGeneralSettings = function submitGeneralSettings(isValid, data) {
		if (isValid) {
			SettingsService.editGeneralSettings(gsc.generalSettings).then(function (response) {
				if (response.code == 11000) {
					toastr.error('Setting Not Added Successfully');
				} else {
					toastr.success('General Settings Saved Successfully');
				}
			}, function (err) {
				toastr.error('Your credentials are gone' + err.data[0].msg + '--' + err.data[0].param);
			});
		} else {
			toastr.error('form is invalid');
		}
	};

	//wallet setting
	gsc.walletStatus = GeneralSettingsServiceResolve[0].wallet.status;
	if (gsc.walletStatus == 1) {
		gsc.walletStatus = true;
	} else {
		gsc.walletStatus = false;
	}

	gsc.walletStatusChange = function (value) {
		if (value == false) {
			gsc.generalSettings.wallet.status = 0;
		} else {
			gsc.generalSettings.wallet.status = 1;
		}
	}

	//cash Setting
	gsc.cashStatus = GeneralSettingsServiceResolve[0].pay_by_cash.status;
	if (gsc.cashStatus == 1) {
		gsc.cashStatus = true;
	} else {
		gsc.cashStatus = false;
	}

	gsc.cashStatusChange = function (value) {
		if (value == false) {
			gsc.generalSettings.pay_by_cash.status = 0;
		} else {
			gsc.generalSettings.pay_by_cash.status = 1;
		}
	}


	//Referral Setting
	gsc.referralStatus = GeneralSettingsServiceResolve[0].referral.status;
	if (gsc.referralStatus == 1) {
		gsc.referralStatus = true;
	} else {
		gsc.referralStatus = false;
	}

	gsc.referralStatusChange = function (value) {
		if (value == false) {
			gsc.generalSettings.referral.status = 0;
		} else {
			gsc.generalSettings.referral.status = 1;
		}
	}



	// category commission
	// if(GeneralSettingsServiceResolve[0].categorycommission){
	// console.log("commission",GeneralSettingsServiceResolve[0].categorycommission);
	// if(GeneralSettingsServiceResolve[0].categorycommission.status){
	// console.log("inside",GeneralSettingsServiceResolve[0].categorycommission.status);
	// gsc.categorycomStatus = GeneralSettingsServiceResolve[0].categorycommission.status;
	// }else{
	// gsc.categorycomStatus = 0;
	// }
	// }

	if (GeneralSettingsServiceResolve[0].categorycommission) {
		if (GeneralSettingsServiceResolve[0].categorycommission.status == 1) {
			gsc.categorycomStatus = true;
		} else {
			gsc.categorycomStatus = false;
		}
	} else {
		gsc.categorycomStatus = false;
	}
	gsc.categoryStatusChange = function (value) {
		gsc.generalSettings.categorycommission = {};
		if (value == false) {
			gsc.generalSettings.categorycommission.status = 0;
		} else {
			gsc.generalSettings.categorycommission.status = 1;
		}
	};


	gsc.placechange = function () {

		gsc.place = this.getPlace();
		//gsc.tasker.location = {};
		var locationalng = gsc.place.geometry.location.lng();
		var locationalat = gsc.place.geometry.location.lat();

		var locationa = gsc.place;
		if (gsc.place) {
			gsc.validlocation = true;
		} else {
			gsc.validlocation = false;

		}

		gsc.generalSettings.location = gsc.place.formatted_address;
		var dummy = locationa.address_components.filter(function (value) {
			return value.types[0] == "sublocality_level_1";
		}).map(function (data) {
			return data;
		});
	};

}
