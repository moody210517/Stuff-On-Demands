angular.module('handyforall.contactus')
	.controller('contactCtrl', contactCtrl);

contactCtrl.$inject = ['$scope', 'ContactService', '$rootScope', '$location', '$filter', '$state', 'toastr', '$translate',  '$sce'];

function contactCtrl($scope, ContactService, $rootScope, $location, $filter, $state, toastr, $translate, $sce) {

	var cttc = this;
	cttc.Messagedetails = {};

	cttc.site_address = $sce.trustAsResourceUrl("https://www.google.com/maps/embed/v1/place?key="+$rootScope.googleMapAPI+"&q="+$rootScope.site_address);

	cttc.userMessage = function userMessage(isValid, formData) {
		if (isValid && cttc.Messagedetails.mobile != undefined) {
			console.log("cttc.Messagedetails.mobile",cttc.Messagedetails.mobile);
				cttc.Messagedetails.mobile = cttc.Messagedetails.mobile.code + "-" + cttc.Messagedetails.mobile.number;
				ContactService.savemessage(cttc.Messagedetails).then(function (response) {
					//$scope.addAlert('success', 'Message Sent Successfully');
					$translate('WELL GET IN TOUCH WITH YOU SHORTLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
					//toastr.success('Message Sent Successfully');
					$state.go('landing');
				}, function (err) {
					if (err.msg) {
						//$scope.addAlert('danger', err.msg);
						toastr.error('danger', err.msg)
					}
				});
		} else {
			$translate('PLEASE ENTER THE VALID DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
			//	$scope.addAlert('danger', 'Please enter the valid data');
		}
	};
	cttc.subscription = function subscription(data) {
	};
};
