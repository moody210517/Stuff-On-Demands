/*
angular.module('handyforall.accounts').controller('accountsCtrl', accountsCtrl);


accountsCtrl.$inject = ['$scope', '$rootScope', 'MainService', 'accountService', 'accountServiceResolve', '$filter', '$uibModal', '$location', 'toastr', '$timeout', 'Slug', '$state', '$window', '$anchorScroll', 'AuthenticationService', '$stateParams', '$translate', 'NgMap'];
function accountsCtrl($scope, $rootScope, MainService, accountService, accountServiceResolve, $filter, $uibModal, $location, toastr, $timeout, Slug, $state, $window, $anchorScroll, AuthenticationService, $stateParams, $translate, NgMap) {

	var acc = this;
	acc.radiusby = $rootScope.settings.distanceby;
	if (acc.radiusby == 'km') {
		acc.radiusval = 1000;
	}
	else {
		acc.radiusval = 1609.34;
	}

	var stateparamcontent = $stateParams;
	acc.taskervariable = AuthenticationService.GetCredentials();
	var user = AuthenticationService.GetCredentials();
	if (accountServiceResolve[0]) {
		acc.user = accountServiceResolve[0] || {};
	}
	$scope.visibleValue = false;
	if (acc.accountMode == false) {
		$scope.visibleValue = false;
	}

	if (acc.user.gender) {
		acc.user.gender = acc.user.gender.toLowerCase().replace(/\s+/g, '');
	}

	if (acc.user.role == 'tasker') {
		if (acc.user.availability == 1) {
			acc.availabilityvalue = true;
		} else {
			acc.availabilityvalue = false;
		}
		if (acc.user.location) {
			var latlng = new google.maps.LatLng(acc.user.location.lat, acc.user.location.lng);
			var geocoder = geocoder = new google.maps.Geocoder();
			geocoder.geocode({ 'latLng': latlng }, function (results, status) {
				if (status == google.maps.GeocoderStatus.OK) {
					if (results[1]) {
						if (acc.user.availability_address) {
							acc.taskerareaaddress = acc.user.availability_address;
							acc.tempTaskAddress = acc.user.availability_address;
						} else {
							acc.taskerareaaddress = results[1].formatted_address;
							acc.tempTaskAddress = results[1].formatted_address;
						}
						acc.dummyAddress = 1;
					}
				}
			});
		}
	}

	// Croping
	$scope.myImage = '';
	acc.myCroppedImage = '';
	$scope.imageChangeValue = false;
	$scope.handleFileSelect = function (evt) {
		$scope.imageChangeValue = true;
		$scope.visibleValue = true;
		var file = evt.currentTarget.files[0];
		var reader = new FileReader();
		reader.onload = function (evt) {
			$scope.$apply(function ($scope) {
				$scope.myImage = evt.target.result;
			});
		};
		reader.readAsDataURL(file);
	};
	// End Croping

	$scope.maps = [];
	$scope.$on('mapInitialized', function (evt, evtMap) {
		$scope.maps.push(evtMap);
	});

	function Availability() {
		this.init = function () {
			$timeout(function () {
				google.maps.event.trigger($scope.maps[0], 'resize');
				$scope.maps[0].setCenter(new google.maps.LatLng(acc.user.location.lat, acc.user.location.lng));
			}, 100);
		}
	}

	acc.mapToInput = function (event) {
		if ($scope.maps[0]) {
			acc.user.radius = parseInt($scope.maps[0].shapes.circle.radius / acc.radiusval);
			var lat = $scope.maps[0].shapes.circle.center.lat();
			var lng = $scope.maps[0].shapes.circle.center.lng();
			var latlng = new google.maps.LatLng(lat, lng);
			var geocoder = geocoder = new google.maps.Geocoder();
			geocoder.geocode({ 'latLng': latlng }, function (results, status) {
				if (status == 'OK') {
					$scope.$apply(function () {
						acc.taskerareaaddress = results[0].formatted_address;
						acc.user.availability_address = results[0].formatted_address;
						acc.user.location.lng = lng;
						acc.user.location.lat = lat;
					})
				}
			});
		}
	}

	acc.valueChange = function () {
		var user = AuthenticationService.GetCredentials();
		if (user.currentUser.username) {
			if (user.currentUser.user_type == 'user') {
				MainService.getCurrentUsers(user.currentUser.username).then(function (response) {
					acc.user = response[0];
					$scope.visibleValue = false;
				}, function (err) {

				});
			} else if (user.currentUser.user_type == 'tasker') {
				return MainService.getCurrentTaskers(user.currentUser.username).then(function (response) {
					acc.user = response[0];
					$scope.visibleValue = false;
				}, function (err) {

				});
			}
		}
	};

	accountService.getsettings().then(function (response) {
		acc.getsettings = response;
		acc.inter = parseInt(acc.getsettings.settings.wallet.amount.maximum) + parseInt(acc.getsettings.settings.wallet.amount.minimum);
		acc.interamount = acc.inter / 2;
		acc.walletMinAmt = (response.settings.wallet.amount.minimum * $scope.DefaultCurrency[0].value).toFixed(2);
		acc.walletMaxAmt = (response.settings.wallet.amount.maximum * $scope.DefaultCurrency[0].value).toFixed(2);
		acc.walletMidAmt = ((response.settings.wallet.amount.maximum / 2) * $scope.DefaultCurrency[0].value).toFixed(2);
	});
	$scope.fileupload = function fileupload($files, $event, $rejectedFiles) {


		if ($files) {


			if ($files.length && $files[0].size < 2097152) {
				for (var i = 0; i < $files.length; i++) {
					$scope.avatar = $files[i];
					acc.user.avatar = $scope.avatar;
				}
			}
			else if (!$files[0]) {
				$translate('Please check the image Size or format').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
			} else {
				$translate('IMAGE SIZE IS SHOULD NOT BE LARGER THEN 1 MB').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
			}
		}
	};

	acc.filter = $location.$$search;
	acc.accountMenu = [
		{
			"heading": "ACCOUNT",
			"template": "app/site/modules/accounts/views/account.tab.html",
			"type": "common",
			"active": true
		},
		{
			"heading": "PASSWORD",
			"template": "app/site/modules/accounts/views/password.tab.html",
			"type": "common",
		},
		{
			"heading": "TASK DETAILS",
			"template": "app/site/modules/accounts/views/task-details.tab.html",
			"type": "user",
			"active": true
		},
		{
			"heading": "INVITE FRIENDS",
			"template": "app/site/modules/accounts/views/invitefriend.tab.html",
			"type": "user"
		},
		{
			"heading": "WALLET",
			"template": "app/site/modules/accounts/views/wallet.tab.html",
			"type": "user"
		},
		{
			"heading": "TRANSACTION",
			"template": "app/site/modules/accounts/views/user-transaction.tab.html",
			"type": "user"
		},

		//tasker
		{
			"heading": "ACCOUNT_INFO",
			"template": "app/site/modules/accounts/views/accountinfo.tab.html",
			"type": "tasker",
		},
		{
			"heading": "CATEGORY",
			"template": "app/site/modules/accounts/views/category.tab.html",
			"type": "tasker"
		},
		{
			"heading": "AVAILABILITY",
			"template": "app/site/modules/accounts/views/availability.tab.html",
			"type": "tasker",
			"function": new Availability()

		},
		{
			"heading": "PROFILE DETAILS",
			"template": "app/site/modules/accounts/views/profileinfo.tab.html",
			"type": "tasker"
		},
		{
			"heading": "JOB DETAILS",
			"type": "tasker",
			"template": "app/site/modules/accounts/views/task-invitation.tab.html"
		},
		{
			"heading": "TRANSACTION",
			"type": "tasker",
			"template": "app/site/modules/accounts/views/transaction.tab.html"
		}, {
			"heading": "REVIEWS",
			"template": "app/site/modules/accounts/views/reviews.tab.html",
			"type": "common"
		}, {
			"heading": "DEACTIVATE",
			"template": "app/site/modules/accounts/views/deactivate.tab.html",
			"type": "common"
		}
	];

	acc.SettingsTab = acc.accountMenu.filter(function (menu) {
		if (acc.user.role == 'user') {
			if (acc.user.type == 'facebook') {
				if ((menu.type == 'common') || (menu.type == 'user')) {
					if (menu.heading != 'PASSWORD') {
						if (stateparamcontent.status == undefined) {
							if (menu.heading == 'TASK DETAILS') {
								menu.active = false;
							}
							if (menu.heading == 'ACCOUNT') {
								menu.active = true;
							}
						} else {
							if (menu.heading == 'ACCOUNT') {
								menu.active = true;
							}
						}
						return menu
					}
				}
			} else {
				if ((menu.type == 'common') || (menu.type == 'user')) {
					if (stateparamcontent.status == undefined) {
						if (menu.heading == 'TASK DETAILS') {
							menu.active = false;
						}
						if (menu.heading == 'ACCOUNT') {
							menu.active = true;
						}
					} else {
						if (menu.heading == 'ACCOUNT') {
							menu.active = true;
						}
					}
					return menu
				}
			}
		}
		else {
			if ((menu.type == 'common') || (menu.type == 'tasker')) {
				if (stateparamcontent.status == undefined) {
					if (menu.heading == 'JOB DETAILS') {
						menu.active = false;
					}
					if (menu.heading == 'ACCOUNT') {
						menu.active = true;
					}
				} else {
					if (menu.heading == 'JOB DETAILS') {
						menu.active = true;
					}
				}
				return menu
			}
		}
	});

	acc.go = function go(route) {
		$state.go(route);
	};

	acc.accountMode = true;
	acc.saveAccount = function saveAccount(isValid) {

		if ($scope.imageChangeValue == true) {
			if (isValid) {
				acc.user.avatarBase64 = acc.myCroppedImage;
				// accountService.saveAccount(acc.user).then(function (response) {

				MainService.getData(routes.userSaveaccount, acc.user).then(function (response, err) {

					$translate('SAVED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
					$scope.imageChangeValue = false;
					acc.accountMode = false;
					$location.hash('editaccountdiv');
					$anchorScroll();
					$location.url($location.path());
					var user = AuthenticationService.GetCredentials();
					if (user.currentUser.username) {
						if (user.currentUser.user_type == 'user') {
							MainService.getCurrentUsers(user.currentUser.username).then(function (response) {
								acc.user = response[0];
								$scope.visibleValue = false;
							}, function (err) {

							});
						}
					}
				}, function (err) {
					if (err.msg) {
						toastr.error(err.msg);
					} else {
						$translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
					}
				});
			} else {
				$translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
			}
		} else {
			// if(acc.temp_address){
			acc.user.avatarBase64 = acc.myCroppedImage;
			accountService.saveAccount(acc.user).then(function (response) {
				$translate('SAVED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
				acc.accountMode = false;
				$scope.imageChangeValue = false;
				$location.hash('editaccountdiv');
				$anchorScroll();
				$location.url($location.path());
				var user = AuthenticationService.GetCredentials();
				if (user.currentUser.username) {
					if (user.currentUser.user_type == 'user') {
						MainService.getCurrentUsers(user.currentUser.username).then(function (response) {
							acc.user = response[0];
							$scope.visibleValue = false;

						}, function (err) {

						});
					}
				}
			}, function (err) {
				if (err.msg) {
					toastr.error(err.msg);
				} else {
					$translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
				}
			});
			// }
		}
	};

	acc.placeChanged = function () {



		acc.user.address.line1 = "";
		acc.user.address.line2 = "";
		acc.user.address.city = "";
		acc.user.address.state = "";
		acc.user.address.country = "";
		acc.user.address.zipcode = "";

		console.log("getting", acc.user.address)

		acc.place = this.getPlace();
		var UserDetails = {};
		UserDetails.location = {};
		UserDetails.location.lng = acc.place.geometry.location.lng();
		UserDetails.location.lat = acc.place.geometry.location.lat();
		acc.user.lat = UserDetails.location.lat;
		acc.user.lng = UserDetails.location.lng;

		var locationa = acc.place;
		acc.user.address.line1 = acc.place.formatted_address;

		if (locationa.name) {
			acc.user.address.line1 = locationa.name;
		}

		for (var i = 0; i < locationa.address_components.length; i++) {
			for (var j = 0; j < locationa.address_components[i].types.length; j++) {
				if (locationa.address_components[i].types[j] == 'neighborhood') {
					if (acc.user.address.line1 != locationa.address_components[i].long_name) {
						if (acc.user.address.line1 != '') {
							acc.user.address.line1 = acc.user.address.line1 + ',' + locationa.address_components[i].long_name;
						} else {
							acc.user.address.line1 = locationa.address_components[i].long_name;
						}
					}
				}
				if (locationa.address_components[i].types[j] == 'route') {
					if (acc.user.address.line1 != locationa.address_components[i].long_name) {
						if (acc.user.address.line2 != '') {
							acc.user.address.line2 = acc.user.address.line2 + ',' + locationa.address_components[i].long_name;
						} else {
							acc.user.address.line2 = locationa.address_components[i].long_name;
						}
					}

				}
				if (locationa.address_components[i].types[j] == 'street_number') {
					if (acc.user.address.line2 != '') {
						acc.user.address.line2 = acc.user.address.line2 + ',' + locationa.address_components[i].long_name;
					} else {
						acc.user.address.line2 = locationa.address_components[i].long_name;
					}

				}
				if (locationa.address_components[i].types[j] == 'sublocality_level_1') {
					if (acc.user.address.line2 != '') {
						acc.user.address.line2 = acc.user.address.line2 + ',' + locationa.address_components[i].long_name;
					} else {
						acc.user.address.line2 = locationa.address_components[i].long_name;
					}

				}
				if (locationa.address_components[i].types[j] == 'locality') {

					acc.user.address.city = locationa.address_components[i].long_name;
				}
				if (locationa.address_components[i].types[j] == 'country') {

					acc.user.address.country = locationa.address_components[i].long_name;
				}
				if (locationa.address_components[i].types[j] == 'postal_code') {

					acc.user.address.zipcode = locationa.address_components[i].long_name;
				}
				if (locationa.address_components[i].types[j] == 'administrative_area_level_1' || locationa.address_components[i].types[j] == 'administrative_area_level_2') {
					acc.user.address.state = locationa.address_components[i].long_name;
				}


				console.log("getting1234", acc.user.address)


			}
		}
	};

	// Password Tab
	acc.password = {};
	acc.password.userId = acc.user._id;

	acc.savePassword = function savePassword(isvalid, data) {
		if (isvalid) {
			if (data.newpassword == data.new_confirmed) {
				accountService.savePassword(data).then(function (response) {
					$translate('SAVED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
					$state.go('account.profile');
				}, function (err) {
					if (err.message) {
						toastr.error(err.message);
					} else {
						$translate('PLEASE TYPE A DIFFERENT PASSWORD').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
					}
				});
			} else {
				$translate('CONFIRM PASSWORD IS NOT MATCH').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });

			}
		} else {
			$translate('FORM IS INVALID').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
		}
	};

	acc.banking = {};
	acc.banking = acc.user.banking;
	acc.saveaccountinfo = function saveaccountinfo(isvalid, data) {
		acc.banking.userId = acc.user._id;
		if (isvalid) {
			accountService.saveaccountinfo(data).then(function (response) {
				$translate('SAVED SUCCESSFULLY').then(function (headline) {
					toastr.success(headline);
				}, function (headline) {
					toastr.success(headline);
				});
				$state.go('account.profile');
			}, function (err) {
				if (err.message) {
					//toastr.error(err.message);
				} else {
					//$translate('PLEASE TYPE A DIFFERENT PASSWORD').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
				}
			});
		} else {
			$translate('please fill all mandatory fileds').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
		}
	};


	acc.FacebookInviteFriends = function FacebookInviteFriends() {
		accountService.getsettings().then(function (response) {
			acc.getsettingdata = response;
			console.log('response = ', response);
			accountService.getseosetting().then(function (seoresponse) {
				console.log('seoresponse = ', seoresponse);

				acc.getseosetting = seoresponse;
				var invite = {};
				invite.name = "Signup with my code - " + acc.getsettingdata.settings.site_title;
				invite.link = acc.getsettingdata.settings.site_url;
				invite.description = "Signup with my code " + acc.user.unique_code + " to earn " + $scope.DefaultCurrency[0].symbol + acc.getsettings.settings.referral.amount.referral + " on your " + acc.getsettingdata.settings.site_title + " wallet";
				invite.picture = acc.getsettingdata.settings.site_url + "uploads/default/facebook-share.jpg";
				if (acc.getsettingdata) {
					console.log('invite.name = ', invite.name);
					console.log('invite.link = ', invite.link);
					console.log('invite.description = ', invite.description);
					console.log('invite.picture = ', invite.picture);

					FB.ui({ method: 'share', name: invite.name, link: invite.link, description: invite.description, picture: invite.picture });
				}
			})
		})
	};

	acc.addReview = function addReview(taskdetails) {
		accountService.gettaskreview(taskdetails._id).then(function (response) {
			var modalInstance = $uibModal.open({
				animation: true,
				templateUrl: 'app/site/modules/accounts/views/userreview.modal.tab.html',
				controller: 'addReviewModal',
				controllerAs: 'ARM',
				resolve: {
					TaskDetails: function () {
						return taskdetails;
					}
				}
			});

			modalInstance.result.then(function (data) {
				accountService.addUserReview(data).then(function (respo) {
					acc.reviewdata = respo;
					acc.GetTaskList("completed");
				});
			});

		});
	}


	$scope.$watchCollection('DefaultCurrency', function (newNames, oldNames) {
		if (acc.getsettings.settings) {
			acc.walletMinAmt = (acc.getsettings.settings.wallet.amount.minimum * newNames[0].value).toFixed(2);
			acc.walletMaxAmt = (acc.getsettings.settings.wallet.amount.maximum * newNames[0].value).toFixed(2);
			acc.walletMidAmt = ((acc.getsettings.settings.wallet.amount.maximum / 2) * newNames[0].value).toFixed(2);
		}
	});

	acc.changeWalletAmt = function changeWalletAmt(value) {
		acc.walletMinAmt = (acc.getsettings.settings.wallet.amount.minimum * $scope.DefaultCurrency[0].value).toFixed(2);
		acc.walletMaxAmt = (acc.getsettings.settings.wallet.amount.maximum * $scope.DefaultCurrency[0].value).toFixed(2);
		acc.walletMidAmt = ((acc.getsettings.settings.wallet.amount.maximum / 2) * $scope.DefaultCurrency[0].value).toFixed(2);
	}

	acc.changeWallet = function changeWallet(value) {
		acc.walletAamount = (parseFloat(value)).toFixed(2);
	}

	acc.savewallet = function savewallet(data, savewallet) {

		acc.walletMinAmt = (acc.getsettings.settings.wallet.amount.minimum * $scope.DefaultCurrency[0].value).toFixed(2);
		acc.walletMaxAmt = (acc.getsettings.settings.wallet.amount.maximum * $scope.DefaultCurrency[0].value).toFixed(2);
		acc.walletMidAmt = ((acc.getsettings.settings.wallet.amount.maximum / 2) * $scope.DefaultCurrency[0].value).toFixed(2);

		var detaileddata = {};
		detaileddata.data = data.amount;
		detaileddata.currencyvalue = savewallet;

		if (detaileddata.data) {
			if (!((parseFloat(data.amount) >= acc.walletMinAmt) && (parseFloat(data.amount) <= acc.walletMaxAmt))) {
				$translate('PLEASE ENTER THE AMOUNT TO ADD TO THE WALLET').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
			} else {
				var modalInstance = $uibModal.open({
					animation: true,
					templateUrl: 'app/site/modules/accounts/views/wallet.modal.tab.html',
					controller: 'WalletRechargeModal',
					controllerAs: 'WRM',
					resolve: {
						Rechargeamount: function () {
							return detaileddata;
						}
					}
				});

				modalInstance.result.then(function (data) {
					user = acc.user._id;
					accountService.updatewalletdata(data, user).then(function (response) {
						if (response.statusCode == 402) {
							toastr.error(response.message);
						} else {
							$translate('WALLET MONEY HAS BEEN UPDATED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
							acc.getwalletdetails = response.wallet;
							wallet.amount = "";
						}
					}, function (err) {
					});
				}, function () { });
			}
		} else {
			$translate('PLEASE ENTER THE AMOUNT TO ADD TO THE WALLET').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
		}
	};


	acc.savewalletpaypal = function savewalletpaypal(data, savewallet) {

		acc.walletMinAmt = (acc.getsettings.settings.wallet.amount.minimum * $scope.DefaultCurrency[0].value).toFixed(2);
		acc.walletMaxAmt = (acc.getsettings.settings.wallet.amount.maximum * $scope.DefaultCurrency[0].value).toFixed(2);
		acc.walletMidAmt = ((acc.getsettings.settings.wallet.amount.maximum / 2) * $scope.DefaultCurrency[0].value).toFixed(2);
		var detaileddata = {};
		detaileddata.data = data.amount;
		detaileddata.currencyvalue = savewallet;

		if (detaileddata.data) {
			if (!((parseFloat(data.amount) >= acc.walletMinAmt) && (parseFloat(data.amount) <= acc.walletMaxAmt))) {
				$translate('PLEASE ENTER THE AMOUNT TO ADD TO THE WALLET').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
			} else {
				user = acc.user._id;
				accountService.updatewalletdatapaypal(data, user).then(function (response) {
					if (response.status == 1 && response.payment_mode == 'paypal') {
						$window.location.href = response.redirectUrl;
					} else {
						$translate('UNABLE PROCESS YOUR PAYMENT').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
					}
				}, function (err) {
				});
			}
		} else {
			$translate('PLEASE ENTER THE AMOUNT TO ADD TO THE WALLET').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
		}
	};
	//Category
	accountService.getPaymentdetails().then(function (respo) {
		acc.paymentgateway = respo;
	});
	accountService.getCategories().then(function (respo) {
		acc.categories = respo;
	});

	accountService.getCategoriesofuser(acc.user._id).then(function (respo) {
		acc.usercategories = respo;
		acc.updatecat = function () {
			accountService.getCategoriesofuser(acc.user._id).then(function (respo) {
				acc.usercategories = respo;
			});
		}
		accountService.getExperience().then(function (respo) {
			acc.experiences = respo;
		});
	});
	// Payment
	acc.payment = function payment(isValid, formdata) {
		if (isValid) {
			accountService.confirmtask(acc.taskPayment).then(function (err, response) {
				$translate('SAVED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
			}, function (err) {
				if (err.msg) {
					toastr.error(err.msg);
				} else {
					$translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
				}
			});
		} else {
			$translate('PLEASE ENTER THE VALID DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
		}
	};

	MainService.getDefaultCurrency().then(function (response) {
		acc.DefaultCurrency = response;
	});

	acc.categoryModal = function (category) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/category.modal.tab.html',
			controller: 'CategoriesModalInstanceCtrl',
			controllerAs: 'ACM',
			resolve: {
				experiences: function () {
					return acc.experiences;
				},
				defaultcurrency: function () {
					return $scope.DefaultCurrency;
				},
				user: function (accountService) {
					if (category) {
						return accountService.edit(acc.user._id);
					} else {
						return acc.user;
					}
				},
				categories: function () {
					return acc.categories;
				},
				category: function () {
					return category;
				}
			}
		});

		modalInstance.result.then(function (selectedCategoryData, isValid) {
			selectedCategoryData.hour_rate = selectedCategoryData.hour_rate / $scope.DefaultCurrency[0].value;
			accountService.updateCategory(selectedCategoryData).then(function (response) {
				$translate('UPDATED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
				acc.updatecat();
			}, function (err) {
				if (err.msg) {
					toastr.error(err.msg);
				} else {
					$translate('PLEASE ENTER THE VALID DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
				}
			});
		});
	}

	acc.deletecategory = function (category, catname) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/deletecategory.modal.tab.html',
			controller: 'DeleteCategoriesModalInstanceCtrl',
			controllerAs: 'DACM',
			resolve: {
				user: function () {
					return acc.user;
				},
				category: function () {
					return category;
				},
				categoryname: function () {
					return catname;
				}
			}
		});

		modalInstance.result.then(function (deletecategorydata) {
			accountService.deleteCategory(deletecategorydata).then(function (response) {
				$translate('CATEGORY DELETED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
				acc.updatecat();
			}, function () {
			});
		}, function () {
		});
	};

	accountService.getQuestion().then(function (respo) {
		acc.getQuestion = respo;
	});

	if (acc.user.profile_details) {
		if (acc.user.profile_details.length > 0) {
			acc.profileDetails = acc.user.profile_details.reduce(function (total, current) {
				total[current.question] = current.answer;
				return total;
			}, {});
		} else {
			acc.profileDetails = [];
			acc.user.profile_details = [];
		}
	}
	acc.saveProfile = function saveProfile() {
		var i = 0;
		for (var key in acc.profileDetails) {
			if (acc.user.profile_details.filter(function (obj) { return obj.question === key; })[0]) {
				acc.user.profile_details[i].answer = acc.profileDetails[key];
			} else {
				acc.user.profile_details.push({ 'question': key, 'answer': acc.profileDetails[key] });
			}
			i++;
		}
		accountService.saveProfile(acc.user).then(function (response) {
			$translate('UPDATED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
		}, function (err) {
			if (err.msg) {
				$scope.addAlert(err.msg);
			} else {
				$translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
			}
		});
	}

	acc.taskitemsPerPage = 2;
	acc.tasktotalItem = 0;
	acc.taskInvitation = [];
	acc.getwalletdetails = {};
	acc.getsettings = {};
	acc.taskInvitationDetails = [];
	acc.tasker = [];
	acc.getTaskDetailsByStausResponse = false;

	acc.getTaskDetailsByStaus = function getTaskDetailsByStaus(status, page) {
		acc.taskInvitation = [];
		acc.getTaskDetailsByStausResponse = false;
		acc.tasktotalItem = 0;

		if (status == '6' || status == '7') {
			status = 'completed';
		}
		else if (status == '8') {
			status = 'cancelled';
		}
		else if (status == '2' || status == '3' || status == '4' || status == '5') {
			status = 'ongoing';
		}
		else if (status == '1') {
			status = 'assigned';
		}

		if (page == undefined) {
			acc.CurrentPage = 1;
		} else {
			acc.CurrentPage = page;
		}

		acc.currentStatus = status;
		accountService.getTaskDetailsByStaus(acc.user._id, acc.currentStatus, page, acc.taskitemsPerPage).then(function (response) {
			if (response.length > 0) {
				acc.taskInvitationDetails = response;
				acc.taskInvitation = response[0].TaskDetails;
				acc.tasktotalItem = response[0].count;
			}
			acc.getTaskDetailsByStausResponse = true;
		});
	}


	acc.getUserTaskDetailsByStaus = function getUserTaskDetailsByStaus(status, page) {
		acc.taskInvitation = [];
		acc.getUserTaskDetailsByStaus = false;
		acc.tasktotalItem = 0;
		if (status == '6' || status == '7') {
			status = 'completed';
		}
		else if (status == '8') {
			status = 'cancelled';
		}
		else if (status == '2' || status == '3' || status == '4' || status == '5') {
			status = 'ongoing';
		}
		else if (status == '1') {
			status = 'assigned';
		}
		acc.currentStatus = status;
		accountService.getUserTaskDetailsByStaus(acc.user._id, acc.currentStatus, page, acc.taskitemsPerPage).then(function (response) {
			if (response.length > 0) {
				acc.taskInvitationDetails = response;
				acc.taskInvitation = response[0].TaskDetails;
				acc.tasktotalItem = response[0].count;
			}
			acc.getTaskDetailsByStausResponse = true;
		});
	}



	acc.getWalleDetailsTemp = function getWalleDetailsTemp(status) {
		acc.index = 0;
		accountService.getwalletdetails(acc.user._id).then(function (response) {
			if (response) {
				acc.getwalletdetails = response;
			} else {
				acc.getwalletdetails.total = 0;
			}
		});
	}

	acc.getUserWalletTransaction = function getUserWalletTransaction() {
		acc.index = 1;
		accountService.getUserWalletTransaction(acc.user._id, acc.walletListCurrentPage, acc.walletListitemsPerPage).then(function (response) {
			if (response) {
				acc.currentPage = 1;
				acc.numPerPage = 10;
				acc.totalitems = response.transaction.length;
				acc.totalitem = response.transaction;

				acc.SubCategoryList = response.transaction;
				//console.log("acc.SubCategoryList",(acc.SubCategoryList))
				//console.log("acc.SubCategoryList",typeof(acc.SubCategoryList[0].trans_date))

				CategoryList(0, 10);
				function CategoryList(from, perPage) {
					acc.SubCategoryList = [];
					for (var i = from; i < perPage; i++) {
						if (i === acc.totalitem.length) return false;
						acc.SubCategoryList.push(acc.totalitem[i]);
					}
				}

				acc.getUserWalletTransaction = function (value) {
					if (acc.currentPage) {
						var spliceFrom = (acc.currentPage - 1) * acc.numPerPage;
						var offset = spliceFrom + acc.numPerPage;
						CategoryList(spliceFrom, offset);
					}
				}
			}
		});
	}

	acc.getTasker = function getTasker() {
		acc.tasker = [];
		accountService.getTasker(acc.user._id).then(function (response) {
			if (response.length > 0) {
				acc.tasker = response[0].TaskDetails;
			}
		});
	}

	acc.taskertransitemsPerPage = 5;
	acc.taskertranstotalItem = 0;
	acc.taskertransCurrentPage = 1;
	acc.getTransactionHis = function getTransactionHis(page) {
		accountService.getTransactionHis(acc.user._id, page, acc.taskertransitemsPerPage).then(function (response) {
			if (response) {
				acc.transcationhis = response.result;
				acc.taskertranstotalItem = response.count;
			}
		});
	}
	acc.transitemsPerPage = 5;
	acc.transtotalItem = 0;
	acc.transCurrentPage = 1;
	acc.getUserTransaction = function getUserTransaction(page) {
		accountService.getUserTransaction(acc.user._id, page, acc.transitemsPerPage).then(function (response) {
			if (response) {
				acc.usertranscation = response.result;
				acc.transtotalItem = response.count;
			}
		});
	}

	accountService.getcancelreason(acc.user.role).then(function (response) {
		if (response.length > 0) {
			acc.getcancelreason = response;
		}
	});

	acc.updatetaskstatus = function updatetaskstatus(taskid, status, currentpage) {
		var data = {};
		data.taskid = taskid;
		data.status = status;
		accountService.updatetaskstatus(data).then(function (response) {
			if (response.error) {
				$translate(response.error).then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
			} else {
				if (response.status == 3) {
					$translate('YOU START-OFF THE TASK').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
				}
				else if (response.status == 4) {
					$translate('YOU ARRIVED TO THE TASK LOCATION').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
				}
				else if (response.status == 6) {
					$translate('YOUR REQUEST FOR CASH').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
				}
				else {
					$translate('YOU STARTED TASK').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
				}
			}
			acc.getTaskDetailsByStaus("ongoing", currentpage);
			if (response.status == 6) {
				acc.getTaskDetailsByStaus("completed");
			}
			acc.currentPage = currentpage;
		});
	}

	acc.updatetaskstatuscash = function updatetaskstatus(taskid, status) {
		var data = {};
		data.taskid = taskid;
		data.status = status;
		accountService.updatetaskstatuscash(data).then(function (response) {
			if (response.error) {
				$translate(response.error).then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
			} else {
				$translate('PAYMENT_COMPLETED').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
			}
			acc.getTaskDetailsByStaus("completed");
		});
	}

	acc.TaskTranscationViewModal = function (index, catid) {
		var tasktranscationhis = acc.transcationhis[index];
		var transcation = {};
		transcation.date = tasktranscationhis.updatedAt;

		console.log("transactiondate", transcation.date)

		transcation.invoice = tasktranscationhis.invoice;
		transcation.bookingid = tasktranscationhis._id;
		if (tasktranscationhis.transactions) {
			transcation.transcationid = tasktranscationhis.transactions[0];
		}
		transcation.categoryname = tasktranscationhis.category.name;
		var taskerskills = tasktranscationhis.tasker.taskerskills;
		angular.forEach(taskerskills, function (key, value) {
			if (key.childid == tasktranscationhis.category._id) {
				transcation.perHour = key.hour_rate;
			}
		});
		transcation.worked_hours = tasktranscationhis.invoice.worked_hours;
		transcation.username = tasktranscationhis.user.username;
		transcation.addresss = tasktranscationhis.billing_address.city;
		transcation.tasker_earn = tasktranscationhis.invoice.amount.admin_commission;
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/model/transaction.modal.html',
			controller: 'TaskTranscationViewModal',
			controllerAs: 'TTEMS',
			size: 'lg',
			resolve: {
				TaskDetails: function () {
					return transcation;
				},
				task: function () {
					return acc.transcationhis[index];
				},
				defaultcurrency: function () {
					return $scope.DefaultCurrency;
				},
				getsettings: function () {
					return acc.getsettings;
				},
				getmaincatname: function () {
					return accountService.getmaincatname(catid);
				}
			}
		});

		modalInstance.result.then(function (data) {
		}, function () {
		});
	}


	acc.TaskUserTranscationViewModal = function (index, catid) {
		var tasktranscationhis = acc.usertranscation[index];
		var transcation = {};
		transcation.date = tasktranscationhis.updatedAt;
		transcation.invoice = tasktranscationhis.invoice;
		transcation.bookingid = tasktranscationhis._id;
		if (tasktranscationhis.transactions) {
			transcation.transcationid = tasktranscationhis.transactions[0];
		}
		transcation.categoryname = tasktranscationhis.category.name;
		var taskerskills = tasktranscationhis.tasker.taskerskills;
		angular.forEach(taskerskills, function (key, value) {
			if (key.childid == tasktranscationhis.category._id) {
				transcation.perHour = key.hour_rate;
			}
		});
		transcation.worked_hours = tasktranscationhis.invoice.worked_hours;
		transcation.username = tasktranscationhis.user.username;
		transcation.addresss = tasktranscationhis.billing_address.city;
		transcation.tasker_earn = tasktranscationhis.invoice.amount.admin_commission;
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/model/usertransaction.modal.html',
			controller: 'TaskUserTranscationViewModal',
			controllerAs: 'TTEMS',
			size: 'lg',
			resolve: {
				TaskDetails: function () {
					return transcation;
				},
				task: function () {
					return acc.usertranscation[index];
				},
				defaultcurrency: function () {
					return $scope.DefaultCurrency;
				},
				getsettings: function () {
					return acc.getsettings;
				},
				getmaincatname: function () {
					return accountService.getmaincatname(catid);
				}
			}
		});

		modalInstance.result.then(function (data) {
		}, function () {
		});
	}

	acc.getmaincatname = function (catid) {
		accountService.getmaincatname(catid).then(function (response) {
			acc.maincategoryname = response.name;
		});
	};

	acc.taskerareaChanged = function () {
		acc.place = this.getPlace();
		acc.user.location = {};
		acc.user.location.lng = acc.place.geometry.location.lng();
		acc.user.location.lat = acc.place.geometry.location.lat();
		acc.user.availability_address = acc.place.formatted_address;
		var locationa = acc.place;

		var dummy = locationa.address_components.filter(function (value) {
			return value.types[0] == "locality";
		}).map(function (data) {
			return data;
		});
		acc.dummyAddress = dummy.length;


	};

	acc.taskerconfirmpay = function (taskid, status) {

		var data = {};
		data.taskid = taskid;
		data.status = status;
		accountService.updateTaskcompletion(data).then(function (response) {
			if (response.status == 6) {
				$translate('TASK_COMPLETED').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
			}
			else {
				$translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
			}
			acc.getTaskDetailsByStaus("ongoing");
		});

	}

	acc.savewalletpaypal = function savewalletpaypal(data, savewallet) {

		acc.walletMinAmt = (acc.getsettings.settings.wallet.amount.minimum * $scope.DefaultCurrency[0].value).toFixed(2);
		acc.walletMaxAmt = (acc.getsettings.settings.wallet.amount.maximum * $scope.DefaultCurrency[0].value).toFixed(2);
		acc.walletMidAmt = ((acc.getsettings.settings.wallet.amount.maximum / 2) * $scope.DefaultCurrency[0].value).toFixed(2);
		var detaileddata = {};
		detaileddata.data = data.amount;
		detaileddata.currencyvalue = savewallet;

		if (detaileddata.data) {
			if (!((parseFloat(data.amount) >= acc.walletMinAmt) && (parseFloat(data.amount) <= acc.walletMaxAmt))) {
				$translate('PLEASE ENTER THE AMOUNT TO ADD TO THE WALLET').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
			} else {
				user = acc.user._id;
				accountService.updatewalletdatapaypal(data, user).then(function (response) {
					if (response.status == 1 && response.payment_mode == 'paypal') {
						$window.location.href = response.redirectUrl;
					} else {
						$translate('UNABLE PROCESS YOUR PAYMENT').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
					}
				}, function (err) {
				});
			}
		} else {
			$translate('PLEASE ENTER THE AMOUNT TO ADD TO THE WALLET').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
		}
	};

	acc.updateModalTask = function (index, status) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/task-dispute.modal.html',
			controller: 'DisputeReviewModalInstanceCtrl',
			controllerAs: 'DNM',
			resolve: {
				TaskDetails: function () {
					return acc.taskList[index];
				},
				status: function () {
					return status;
				}
			}
		});

		modalInstance.result.then(function (data) {
			if (acc.taskInvitation.length > 0 && angular.isDefined(acc.taskInvitation[index]._id)) {
				accountService.updateTask(acc.taskInvitation[index]._id, status).then(function (response) {
					acc.taskInvitation.splice(index, 1);
				}, function (err) {
				});
			}
		}, function () {
		});

	}

	acc.TaskReviewModalSave = function (index) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/task-review.modal.tab.html',
			controller: 'TaskReviewModalSave',
			controllerAs: 'TREMS',
			resolve: {
				TaskDetails: function () {
					return acc.taskList[index];
				}
			}
		});


		var userdata = acc.taskList[index];

		modalInstance.result.then(function (data) {
			var reviewdata = {};
			reviewdata.rating = data.rating;
			reviewdata.comments = data.comments;
			reviewdata.user = userdata.user;
			reviewdata.tasker = userdata.tasker._id;
			reviewdata.task = userdata._id;
			reviewdata.type = 'tasker';

			accountService.setReview(reviewdata).then(function (response) {
				acc.getreviewdetails;
			});
		});

	}





	acc.TaskReviewModal = function (index) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/task-review.modal.html',
			controller: 'TaskReviewModalCtrl',
			controllerAs: 'TREM',
			resolve: {
				TaskDetails: function () {
					return acc.taskInvitation[index];
				}
			}
		});

		var userdata = acc.taskInvitation[index];
		modalInstance.result.then(function (data) {
			var reviewdata = {};
			reviewdata.rating = data.rating;
			reviewdata.comments = data.comments;
			reviewdata.user = userdata.user._id;
			reviewdata.tasker = userdata.tasker;
			reviewdata.task = userdata._id;
			reviewdata.type = "tasker";

			accountService.inserttaskerreview(reviewdata).then(function (response) {
				accountService.getReview(acc.user._id, acc.reviewListCurrentPage, acc.reviewListitemsPerPage).then(function (respo) {
				});
				//acc.getTaskDetailsByStaus("completed");
				acc.taskInvitation[index].taskrating = [];
				acc.taskInvitation[index].taskrating.push(reviewdata);
			}, function (err) {
			});

		}, function () {
		});

	}


	acc.TaskInviteViewModal = function (index) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/taskinvite.view.modal.tab.html',
			controller: 'TaskInviteViewModalInstanceCtrl',
			controllerAs: 'TVMI',
			resolve: {
				TaskInvite: function () {
					return acc.taskInvitation[index];
				},
				DefaultCurrency: function () {
					return $scope.DefaultCurrency;
				},
				getsettings: function () {
					return acc.getsettings;
				}
			}
		});
		modalInstance.result.then(function (data) {
		}, function () {
		});
	};


	acc.TaskerextrapriceModal = function (taskid, status) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/taskerextraprice.view.modal.tab.html',
			controller: 'TaskerExtraViewModalInstanceCtrl',
			controllerAs: 'TEVMI',
			resolve: {
				Taskid: function () {
					return taskid;
				},
				status: function () {
					return status;
				},
				DefaultCurrency: function () {
					return $scope.DefaultCurrency;
				}
			}
		});
		modalInstance.result.then(function (data) {
			accountService.updateTaskcompletion(data).then(function (response) {
				if (response.status == 6) {
					$translate('TASK_COMPLETED').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
				}
				else {
					$translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
				}
				acc.getTaskDetailsByStaus("ongoing");
				acc.currentPage = 1;
			}, function () {
			});
		}, function () {
		});
	};

	//acc.taskListCurrentPage = 1;
	acc.taskListitemsPerPage = 2;
	acc.taskListtotalItem = 0;
	acc.taskList = [];
	acc.taskinfobyid = [];
	acc.getTaskListResponse = false;

	acc.taskinfobyid = function taskinfobyid(taskid) {
		accountService.gettaskinfobyid(taskid).then(function (response) {
			if (response.length > 0) {

			}
		});
	}

	acc.GetTaskList = function GetTaskList(status, page) {
		acc.status = status;
		acc.taskList = [];
		acc.getTaskListResponse = false;
		acc.taskListtotalItem = 0;
		if (page == undefined) {
			acc.taskListCurrentPage = 1;
		} else {
			acc.taskListCurrentPage = page;
		}
		accountService.taskListService(acc.user._id, status, acc.taskListCurrentPage, acc.taskListitemsPerPage).then(function (response) {
			if (response.length > 0) {
				acc.taskList = response[0].TaskDetails;
				console.log('acc.taskList = ', acc.taskList);
				acc.taskListtotalItem = response[0].count;
				accountService.getTaskDetails(acc.user._id).then(function (respo) {
					acc.taskList.review = respo;
				});
			}
			acc.getTaskListResponse = true;
		});
	}


	acc.updateTaskDetails = function (index, status) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/task-confirm.modal.html',
			controller: 'TaskReviewModalInstanceCtrl',
			controllerAs: 'TRM',
			resolve: {
				TaskDetails: function () {
					return acc.taskList[index];
				}
			}
		});

		modalInstance.result.then(function (data) {
			user = acc.user._id;
			task = acc.taskList[index]._id;
			type = 'user';
			if (acc.taskList.length > 0 && angular.isDefined(acc.taskList[index]._id)) {

				accountService.updateTask(acc.taskList[index]._id, status).then(function (response) {
					acc.taskList.splice(index, 1);
				}, function (err) {
				});
			}

		}, function () {
		});
	}

	acc.TaskDetailsViewModal = function (index) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/taskdetails.view.modal.tab.html',
			controller: 'TaskDetailsViewModalInstanceCtrl',
			controllerAs: 'TDVMI',
			resolve: {
				TaskDetails: function () {
					return acc.taskList[index];
				},
				DefaultCurrency: function () {
					return $scope.DefaultCurrency;
				}
			}
		});
		modalInstance.result.then(function (data) {
		}, function () {
		});
	};

	acc.TaskDetailsViewModalforstatus = function (index) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/taskdetailsforstatus.modal.tab.html',
			controller: 'TaskDetailsViewforstatusModalInstanceCtrl',
			controllerAs: 'TDVSMI',
			resolve: {
				TaskDetails: function () {
					return acc.taskList[index];
				},
				defaultcurrency: function () {
					return $scope.DefaultCurrency;
				}

			}
		});
		modalInstance.result.then(function (data) {
		}, function () {
		});
	};

	acc.reviewModal = function (data, task) {

		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/reviewdetails.view.modal.tab.html',
			controller: 'reviewModelCtrl',
			controllerAs: 'RMC',
			resolve: {
				data: function () {
					return data;
				},
				role: function () {
					return acc.user.role;
				}
			}
		});
	}

	acc.TaskDetailsViewModal = function (index) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/taskdetails.view.modal.tab.html',
			controller: 'TaskDetailsViewModalInstanceCtrl',
			controllerAs: 'TDVMI',
			resolve: {
				TaskDetails: function () {
					return acc.taskList[index];
				},
				DefaultCurrency: function () {
					return $scope.DefaultCurrency;
				}

			}
		});
		modalInstance.result.then(function (data) {
		}, function () {
		});
	};

	acc.TaskDetailsIgnoreModal = function (id, status) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/task-cancel.modal.tab.html',
			controller: 'TaskDetailsIgnoreModalInstanceCtrl',
			controllerAs: 'TDIMI',
			resolve: {
				userid: function () {
					return id;
				},
				status: function () {
					return status;
				},
				cancelreason: function () {
					return acc.getcancelreason;
				}

			}
		});

		modalInstance.result.then(function (taskignoredata) {
			accountService.usercanceltask(taskignoredata).then(function (response) {
				//acc.GetTaskList("assigned");
				acc.taskCurrentPage = 1;
				acc.GetTaskList('cancelled');
				acc.tabFourActive = true;
			}, function () {
				if (err.msg) {
					toastr.error(err.msg);
				} else {
					$translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
				}
			});
		}, function () {
		});

	};

	acc.ignoreTask = function (id, status) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/task-cancel.modal.tab.html',
			controller: 'TaskDetailsIgnoreModalInstanceCtrl',
			controllerAs: 'TDIMI',
			resolve: {
				userid: function () {
					return id;
				},
				status: function () {
					return status;
				},
				cancelreason: function () {
					return acc.getcancelreason;
				}
			}
		});
		modalInstance.result.then(function (taskignoredata) {
			accountService.ignoreTask(taskignoredata).then(function (response) {
				acc.currentPage = 1;
				acc.getTaskDetailsByStaus('cancelled');
				acc.tabFourActive = true;
			}, function () {
				if (err.msg) {
					$scope.addAlert(err.msg);
				} else {
					$translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
				}
			});
		}, function () {
		});
	};

	acc.taskerconfirmtask = function (id, taskerid, status) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/tasker-taskconfirm.modal.tab.html',
			controller: 'TaskDetailsconfirmModalInstanceCtrl',
			controllerAs: 'TDCMI',
			resolve: {
				taskid: function () {
					return id;
				},
				taskerid: function () {
					return taskerid;
				},
				status: function () {
					return status;
				}
			}
		});
		modalInstance.result.then(function (taskconfirmdata) {
			accountService.taskerconfirmTask(taskconfirmdata).then(function (response) {
				if (response.error) {
					toastr.error(response.error);
				} else if (response == "You have already booked a job in the chosen time, please choose a different time slot to perform job.") {
					toastr.warning(response);
				}
				acc.getTaskDetailsByStaus("assigned");
			}, function (err) {
				if (err.msg) {
					toastr.error(err.msg);
				} else {
					$translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
				}
			});
		},
			function () {
			});
	};

	//Availability Tab
	if (acc.user.role == 'tasker') {
		acc.availability = {};
		acc.availability.days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];




		var workingDays = [{ day: "Sunday", hour: { "morning": false, "afternoon": false, "evening": false }, not_working: true },
		{ day: "Monday", hour: { "morning": false, "afternoon": false, "evening": false }, not_working: true },
		{ day: "Tuesday", hour: { "morning": false, "afternoon": false, "evening": false }, not_working: true },
		{ day: "Wednesday", hour: { "morning": false, "afternoon": false, "evening": false }, not_working: true },
		{ day: "Thursday", hour: { "morning": false, "afternoon": false, "evening": false }, not_working: true },
		{ day: "Friday", hour: { "morning": false, "afternoon": false, "evening": false }, not_working: true },
		{ day: "Saturday", hour: { "morning": false, "afternoon": false, "evening": false }, not_working: true }];

		var workingTimes = {};
		workingTimes.morning = {
			from: moment.tz(new Date(99, 5, 24, 8, 0, 0, 0), $scope.date.timezone).format($scope.date.time_format),
			to: moment.tz(new Date(99, 5, 24, 12, 0, 0, 0), $scope.date.timezone).format($scope.date.time_format)
		};
		workingTimes.afternoon = {
			from: moment.tz(new Date(99, 5, 24, 12, 0, 0, 0), $scope.date.timezone).format($scope.date.time_format),
			to: moment.tz(new Date(99, 5, 24, 16, 0, 0, 0), $scope.date.timezone).format($scope.date.time_format)
		};
		workingTimes.evening = {
			from: moment.tz(new Date(99, 5, 24, 16, 0, 0, 0), $scope.date.timezone).format($scope.date.time_format),
			to: moment.tz(new Date(99, 5, 24, 20, 0, 0, 0), $scope.date.timezone).format($scope.date.time_format)
		};
		acc.workingDays = workingDays;
		var DaysData = [{ Morning: "MORNING", afternoon: "AFTERNOON", evening: "EVENING", Save: "SAVE" }];

		angular.forEach(acc.workingDays, function (workingDays, key) {
			angular.forEach(acc.user.working_days, function (UserWorkingdays) {
				if (UserWorkingdays.day == workingDays.day) {
					if (UserWorkingdays.hour.morning == true || UserWorkingdays.hour.afternoon == true || UserWorkingdays.hour.evening == true) {
						UserWorkingdays.not_working = false;
						acc.workingDays[key] = UserWorkingdays;
					}
				}
			})
		});

		acc.availabilityModal = function (size, index) {
			var modalInstance = $uibModal.open({
				animation: true,
				backdrop: 'static',
				keyboard: false,
				templateUrl: 'app/site/modules/accounts/views/availability.modal.tab.html',
				controller: 'AvailabilityModalInstanceCtrl',
				//controllerAs: 'AAM',
				size: size,
				resolve: {
					workingDays: function () {
						return acc.workingDays;
					},
					workingTimes: function () {
						return workingTimes;
					},
					DaysData: function () {
						return DaysData;
					},
					selectedIndex: function () {
						return index;
					}
				}
			});
			modalInstance.result.then(function (WorkingDays) {
				//acc.workingDays[data.index] = data.working_day;
				//acc.user.working_days = $filter('filter')(acc.workingDays, { "not_working": false });
				//acc.user.working_days = acc.workingDays;
				acc.user.working_days[index] = WorkingDays;
			}, function () {
			});
		};


		acc.emptyLatLng = function (temp_address) {
			if (temp_address != acc.taskerareaaddress) {
				acc.user.location.lat = '';
				acc.user.location.lng = '';
			}
		}
		acc.saveAvailability = function () {
			if (acc.user.location.lat == '' || acc.user.location.lng == '') {
				toastr.error('Invalid Address');
				return;
			} else {
				accountService.saveAvailability(acc.user).then(function (response) {
					$translate('UPDATED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
				}, function (err) {
					if (err.msg) {
						toastr.error(err.msg);
					} else {
						$translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
					}
				});
			}

		}
	}


	acc.availabilityChange = function (value) {
		acc.data = {};
		if (value == false) {
			acc.data.availability = 0;
		} else {
			acc.data.availability = 1;
		}
		acc.data._id = acc.user._id;
		accountService.updateAvailability(acc.data).then(function (response) {
			$translate('TASKER AVAILABILITY UPDATED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
		}, function (err) {
			if (err.msg) {
				toastr.error(err.msg);
			} else {
				$translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
			}
		});

	};
	acc.deactivate = function (deactivateAcc) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/deactivate.modal.tab.html',
			controller: 'DeactivateCtrl',
			controllerAs: 'DECM',
			resolve: {
				user: function () {
					return acc.user;
				}
			}
		});

		modalInstance.result.then(function (userid) {
			accountService.deactivateAccount(userid).then(function (response) {
				$translate('YOUR ACCOUNT DEACTIVATED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
			}, function () {
				if (err.msg) {
					toastr.error(err.msg);
				} else {
					$translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
				}
			});
		});
	};


	//review tab
	acc.reviewListCurrentPage = 1;
	acc.reviewListitemsPerPage = 5;
	acc.reviewListtotalItem = 0;
	acc.getreviewdetails = function (role) {
		acc.index = 0;
		accountService.getReview(acc.user._id, acc.reviewListCurrentPage, acc.reviewListitemsPerPage, acc.user.role).then(function (respo) {
			$scope.truefalse = "true";
			acc.reviewListtotalItem = respo.count;
			acc.getReview = respo.result;
			acc.finalResult = [];
			angular.forEach(acc.getReview, function (value, key) {
				if (value.task) {
					acc.finalResult.push(value);
				}
			});

		});
	}

	acc.getuserreviewdetails = function (role) {
		acc.index = 1;
		accountService.getuserReview(acc.user._id, acc.reviewListCurrentPage, acc.reviewListitemsPerPage, acc.user.role).then(function (respo) {
			$scope.truefalse = "true";
			acc.reviewListtotalItem = respo.count;
			acc.getReview = respo.result;
			acc.finalResult = [];
			angular.forEach(acc.getReview, function (value, key) {
				if (value.task) {
					acc.finalResult.push(value);
				}
			});
		});
	}

	//tasker table

	acc.accountMode = true;
	acc.password = {};
	acc.password.userId = acc.user._id;
	acc.saveTaskerPassword = function saveTaskerPassword(isvalid) {
		if (isvalid) {
			accountService.saveTaskerPassword(acc.password).then(function (response) {
				$translate('UPDATED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
				$state.go('account.profile');
			}, function (err) {
				if (err.msg) {
					toastr.error(err.msg);
				} else {
					$translate('PLEASE TYPE A DIFFERENT PASSWORD').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
				}
			});
		} else {
			$translate('FORM IS INVALID').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
		}
	};
	acc.deactivateTasker = function (deactivateTaskerAcc) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'app/site/modules/accounts/views/deactivate.modal.tab.html',
			controller: 'DeactivateCtrl',
			controllerAs: 'DECM',
			resolve: {
				user: function () {
					return acc.user;
				}
			}
		});

		modalInstance.result.then(function (userid) {
			accountService.deactivateTaskerAccount(userid).then(function (response) {
				$translate('YOUR ACCOUNT DEACTIVATED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
			}, function () {
				if (err.msg) {
					toastr.error(err.msg);
				} else {
					$translate('UNABLE TO SAVE YOUR DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
				}
			});
		});
	};
}
*/

angular.module('handyforall.accounts').controller('TaskPayModalInstanceCtrl', function ($scope, $filter, $uibModalInstance, Taskinfobyid, updatingstatus) {

	var tpm = this;
	var total = 0;
	tpm.user = Taskinfobyid.taskdata[0].user;
	tpm.taskid = Taskinfobyid.taskdata[0]._id;
	tpm.status = updatingstatus;
	tpm.bookingid = Taskinfobyid.taskdata[0].booking_id;
	tpm.taskname = Taskinfobyid.taskdata[0].category.name;
	tpm.admincommision = Taskinfobyid.settingsdata.settings.admin_commission;
	tpm.servicetax = Taskinfobyid.settingsdata.settings.service_tax;
	tpm.minimumamount = Taskinfobyid.settingsdata.settings.minimum_amount;
	tpm.taskdescription = Taskinfobyid.taskdata[0].task_description;
	tpm.hourlyrate = $filter('filter')(Taskinfobyid.taskdata[0].tasker.taskerskills, { "childid": Taskinfobyid.taskdata[0].category._id });

	tpm.totalhour1 = function () {

		tpm.total = tpm.hourlyrate[0].hour_rate;

		if (tpm.totalhour > 1) {
			tpm.newtotal = ((parseInt(tpm.minimumamount)) + (parseInt(tpm.total) * (parseInt(tpm.totalhour) - 1)));
			tpm.taxamount = parseInt(tpm.newtotal) * (parseInt(tpm.servicetax) / 100);
			tpm.adminamount = parseInt(tpm.newtotal) * (parseInt(tpm.admincommision) / 100);
			tpm.commisionamount = parseInt(tpm.adminamount) + parseInt(tpm.taxamount);
			tpm.grandtotal = parseInt(tpm.newtotal) + parseInt(tpm.commisionamount);
		}
		else if (tpm.totalhour <= 1) {
			tpm.newtotal = parseInt(tpm.minimumamount);
			tpm.taxamount = parseInt(tpm.minimumamount) * (parseInt(tpm.servicetax) / 100);
			tpm.adminamount = parseInt(tpm.minimumamount) * (parseInt(tpm.admincommision) / 100);
			tpm.commisionamount = parseInt(tpm.adminamount) + parseInt(tpm.taxamount);
			tpm.grandtotal = parseInt(tpm.minimumamount) + parseInt(tpm.commisionamount);
		} else {
			tpm.grandtotal = parseInt(tpm.total);
		}
	};

	tpm.ok = function () {
		$uibModalInstance.close(tpm);
	};

	tpm.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};

});




angular.module('handyforall.accounts').controller('DeactivateCtrl', function ($uibModalInstance, user, $state) {
	var decm = this;
	decm.user = user;
	decm.userid = decm.user._id;
	decm.ok = function () {
		$uibModalInstance.close(decm.userid);
		$state.go('Deactivate');
	};
	decm.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});

angular.module('handyforall.accounts').controller('CategoriesModalInstanceCtrl', function (accountService, $uibModalInstance, experiences, user, toastr, categories, category, defaultcurrency, $translate) {

	var acm = this;
	if (category) {
		acm.role = 'Edit';
	}
	else {
		acm.role = 'New';
	}
	acm.user = user;
	acm.defaultcurrency = defaultcurrency;

	acm.categories = categories;
	acm.experiences = experiences;
	acm.category = acm.categories.filter(function (obj) {

		return obj._id === category;
	})[0];

	acm.selectedCategoryData = {};
	acm.selectedCategoryData.skills = [];
	acm.selectedCategoryData.hour_rate = 0
	if (acm.category) {
		acm.mode = 'EDIT';
	} else {
		acm.mode = 'ADD';
	}

	for (var i = 0; i < acm.user.taskerskills.length; i++) {
		if (acm.user.taskerskills[i].childid == category) {
			acm.selectedCategoryData = acm.user.taskerskills[i];
		}
	}

	acm.selectedCategoryData.userid = acm.user._id;
	acm.onChangeCategory = function (category) {
		acm.category = acm.categories.filter(function (obj) {
			return obj._id === category;
		})[0];
	};

	acm.onChangeCategoryChild = function (category) {
		accountService.getChild(category).then(function (response) {
			acm.MinimumAmount = response.commision;
		});
		acm.category = acm.user.taskerskills.filter(function (obj) {
			if (obj.childid === category) {
				$translate('ALREADY THE CATEGORY IS EXISTS').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
				$uibModalInstance.dismiss('cancel');
			}
			else {
				return obj._id === category;
			}
		})[0];
	};

	if (acm.selectedCategoryData.childid) {
		accountService.getChild(acm.selectedCategoryData.childid).then(function (response) {
			acm.MinimumAmount = response.commision;
		});
	}


	acm.selectedCategoryData.hour_rate = parseFloat((acm.selectedCategoryData.hour_rate * acm.defaultcurrency[0].value).toFixed(2));
	acm.ok = function (valid) {
		if (valid) {
			$uibModalInstance.close(acm.selectedCategoryData);
		} else {
			$translate('FORM IS INVALID').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
		}
	};
	acm.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});

angular.module('handyforall.accounts').controller('AvailabilityModalInstanceCtrl', function ($scope, $uibModalInstance, workingDays, workingTimes, DaysData, selectedIndex) {
	$scope.WorkingDays = workingDays[selectedIndex];
	$scope.workingTimes = workingTimes;
	$scope.days = DaysData;

	$scope.ok = function () {
		if ($scope.WorkingDays.hour.morning == true || $scope.WorkingDays.hour.afternoon == true || $scope.WorkingDays.hour.evening == true) {
			$scope.WorkingDays.not_working = false;
		} else {
			$scope.WorkingDays.not_working = true;
		}
		$uibModalInstance.close($scope.WorkingDays, selectedIndex);
	};

	$scope.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});

angular.module('handyforall.accounts').controller('TaskInviteViewModalInstanceCtrl', function ($uibModalInstance, TaskInvite, DefaultCurrency, getsettings) {
	var tvmi = this;
	tvmi.TaskInvite = TaskInvite;
	tvmi.DefaultCurrency = DefaultCurrency;
	tvmi.getsettings = getsettings;
	tvmi.ok = function (working_day, index) {
		var data = {};
		$uibModalInstance.close(data);
	};
	tvmi.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});

angular.module('handyforall.accounts').controller('TaskerExtraViewModalInstanceCtrl', function ($uibModalInstance, $translate, Taskid, status, DefaultCurrency, accountService, toastr) {

	var tevmi = this;
	tevmi.defaultcurrency = DefaultCurrency;
	tevmi.addmaterial = false;
	tevmi.total = 0;
	tevmi.choices = [];
	tevmi.addNewChoice = function () {
		var newItemNo = tevmi.choices.length + 1;
		tevmi.choices.push({ 'id': 'choice' + newItemNo });
		tevmi.calculateChoice();
	};

	tevmi.calculateChoice = function () {
		tevmi.total = 0;
		if (tevmi.newchoice) {
			for (var i = 0; i < tevmi.choices.length; i++) {
				if (tevmi.newchoice.value[i]) {
					tevmi.total = tevmi.total + parseFloat(tevmi.newchoice.value[i])
				}
			}
		}
	};

	tevmi.removeChoice = function () {
		var lastItem = tevmi.choices.length - 1;
		if (lastItem != 0) {
			tevmi.newchoice.value[lastItem] = '';
			tevmi.newchoice.name[lastItem] = '';
			tevmi.choices.pop({ 'id': 'choice' + lastItem });
		} else {
			tevmi.addmaterial = false;
			tevmi.newchoice.value[lastItem] = '';
			tevmi.newchoice.name[lastItem] = '';
			tevmi.choices.pop({ 'id': 'choice' + lastItem });
		}
		tevmi.calculateChoice();
	};


	tevmi.taskid = Taskid;
	tevmi.defaultCurrency = DefaultCurrency;
	tevmi.status = status;
	var newdata = [];

	tevmi.ok = function (test, valid) {
		if (!valid) {
			$translate('PLEASE ENTER ALL FEILD').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });

		} else {
			if (test.newchoice) {
				for (var i = 0; i < test.choices.length; i++) {
					var data = {};
					data.name = test.newchoice.name[i];
					data.price = parseFloat((test.newchoice.value[i] / tevmi.defaultcurrency[0].value).toFixed(2));
					newdata.push(data);
				}

				tevmi.newdata = newdata;
				$uibModalInstance.close(tevmi);
			}
			else {
				var data = {}
				data.taskid = test.taskid;
				data.status = test.status;
				$uibModalInstance.close(data);
			}
		}

	};
	tevmi.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};

});

angular.module('handyforall.accounts').controller('TaskDetailsViewModalInstanceCtrl', function ($uibModalInstance, TaskDetails, DefaultCurrency) {
	var tdvmi = this;
	tdvmi.TaskDetails = TaskDetails;
	tdvmi.DefaultCurrency = DefaultCurrency;

	tdvmi.taskdescription = TaskDetails.task_description;
	tdvmi.ok = function () {
		$uibModalInstance.close();
	};
	tdvmi.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});


angular.module('handyforall.accounts').controller('TaskDetailsViewforstatusModalInstanceCtrl', function ($uibModalInstance, TaskDetails, defaultcurrency) {
	var tdvsmi = this;
	tdvsmi.defaultcurrency = defaultcurrency;
	tdvsmi.TaskDetails = TaskDetails;
	var a = TaskDetails.invoice.worked_hours;
	var hours = Math.trunc(a / 60);
	var minutes = a % 60;

	if (hours == 0) {
		if (minutes == 0.1) {
			tdvsmi.Task_time = minutes + " min";
		} else {
			tdvsmi.Task_time = minutes + " mins";
		}

	} else {
		tdvsmi.Task_time = hours + " hours " + minutes + " mins";
	}

	tdvsmi.taskdescription = TaskDetails.task_description;
	tdvsmi.ok = function () {
		$uibModalInstance.close();
	};
	tdvsmi.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});

angular.module('handyforall.accounts').controller('TaskDetailsIgnoreModalInstanceCtrl', function ($translate, $uibModalInstance, $state, userid, status, toastr, cancelreason) {
	var tdimi = this;
	tdimi.userid = userid;
	tdimi.taskstatus = status;
	tdimi.cancelreason = cancelreason;
	tdimi.other = 0;
	tdimi.ok = function (data) {
		if (data.reason) {
			$uibModalInstance.close(tdimi);

		} else {
			$translate('REASON FIELD IS EMPTY').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
		}
	};
	tdimi.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
	tdimi.otherclick = function (other) {
		tdimi.other = 1;
	};
	tdimi.click = function (other) {
		tdimi.other = 0;
	};


});

angular.module('handyforall.accounts').controller('WalletRechargeModal', function ($uibModalInstance, $state, $translate, Rechargeamount, toastr) {
	var wrm = this;
	wrm.rechargeamount = Rechargeamount;
	var walletamount = wrm.rechargeamount.data.replace(/,/g, '');
	var currencyvalue = wrm.rechargeamount.currencyvalue;
	var result = parseFloat(walletamount) / parseFloat(currencyvalue);
	var walletamount = "";
	wrm.walletamount = result.toFixed(2);
	wrm.ok = function (isValid) {
		if (isValid == true) {
			$uibModalInstance.close(wrm);
		}
		else {
			$translate('FORM IS INVALID').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });

		}

	};
	wrm.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});

angular.module('handyforall.accounts').controller('TaskDetailsconfirmModalInstanceCtrl', function ($uibModalInstance, $state, taskid, status, taskerid) {
	var tdcmi = this;
	tdcmi.taskid = taskid;
	tdcmi.taskstatus = status;
	tdcmi.taskerid = taskerid;
	tdcmi.ok = function () {
		$uibModalInstance.close(tdcmi);
	};
	tdcmi.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};

});

angular.module('handyforall.accounts').controller('DeleteCategoriesModalInstanceCtrl', function ($uibModalInstance, user, category, categoryname, $translate, toastr) {
	var dacm = this;
	dacm.category = category;
	dacm.user = user;
	var categoryinfo = {};
	categoryinfo.userid = user._id;
	categoryinfo.categoryid = category;
	categoryinfo.categoryname = categoryname;
	dacm.ok = function () {
		$uibModalInstance.close(categoryinfo);
		$translate('CATEGORY DELETED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
	};
	dacm.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});

angular.module('handyforall.accounts').controller('DisputeReviewModalInstanceCtrl', function ($uibModalInstance, TaskDetails, accountService, status, $state) {
	var dnm = this;
	dnm.indexValue = TaskDetails._id;
	dnm.ststusvalue = status;
	dnm.ok = function () {
		accountService.disputeUpdateTask(dnm.indexValue, dnm.ststusvalue).then(function (response) {
			$state.reload();
		}, function (err) {
		});
		$uibModalInstance.close(dnm.review);
	};
	dnm.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};

});

angular.module('handyforall.accounts').controller('TaskReviewModalCtrl', function ($uibModalInstance, TaskDetails) {
	var trem = this;
	trem.TaskDetails = TaskDetails;
	trem.ok = function () {
		$uibModalInstance.close(trem.review);
	};
	trem.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};

});

angular.module('handyforall.accounts').controller('TaskReviewModalSave', function ($uibModalInstance) {
	var trem = this;
	trem.ok = function () {
		$uibModalInstance.close(trem.review);
	};
	trem.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};

});

angular.module('handyforall.accounts').controller('TaskTranscationViewModal', function ($scope, task, $uibModalInstance, accountService, TaskDetails, defaultcurrency, getsettings, getmaincatname) {
	var trems = this;
	trems.TaskDetails = TaskDetails;
	trems.task = task;
	trems.maincategoryname = getmaincatname.name;
	trems.defaultcurrency = defaultcurrency;
	trems.getsettings = getsettings;
	trems.downloadPdf = function () {
		accountService.downloadPdf(trems.TaskDetails.bookingid).then(function (response) {
		});
	}
	trems.ok = function () {
		$uibModalInstance.close(trems.review);
	};
	trems.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};

});

angular.module('handyforall.accounts').controller('TaskUserTranscationViewModal', function ($scope, task, $uibModalInstance, accountService, TaskDetails, defaultcurrency, getsettings, getmaincatname) {
	var trems = this;
	trems.TaskDetails = TaskDetails;
	trems.task = task;
	trems.maincategoryname = getmaincatname.name;
	trems.defaultcurrency = defaultcurrency;
	trems.getsettings = getsettings;
	if (((trems.TaskDetails.invoice.amount.total + trems.TaskDetails.invoice.amount.service_tax) * trems.defaultcurrency[0].value) > (trems.TaskDetails.invoice.amount.coupon * trems.defaultcurrency[0].value)) {
		trems.checkvalue = "big";
		trems.total = ((((trems.TaskDetails.invoice.amount.total + trems.TaskDetails.invoice.amount.service_tax + trems.TaskDetails.invoice.amount.extra_amount) * trems.defaultcurrency[0].value) - trems.TaskDetails.invoice.amount.coupon) * trems.defaultcurrency[0].value).toFixed(2);
	} else {
		trems.checkvalue = "small";
		trems.total = ((trems.TaskDetails.invoice.amount.extra_amount + trems.TaskDetails.invoice.amount.service_tax) * trems.defaultcurrency[0].value).toFixed(2);
	}

	trems.downloadPdf = function () {
		accountService.downloadPdf(trems.TaskDetails.bookingid).then(function (response) {
		});
	}
	trems.ok = function () {

		$uibModalInstance.close(trems.review);
	};
	trems.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});
angular.module('handyforall.accounts').controller('addReviewModal', function ($uibModalInstance, TaskDetails, $scope, $state) {
	var arm = this;
	arm.user = TaskDetails.user;
	arm.tasker = TaskDetails.tasker._id;
	arm.task = TaskDetails._id;
	arm.type = 'user';
	arm.ok = function () {
		$uibModalInstance.close(arm);
		$state.go('account.profile');
	};
	arm.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});
angular.module('handyforall.accounts').controller('reviewModelCtrl', function ($uibModalInstance, data, role) {
	var rmc = this;
	rmc.reviewData = data;
	rmc.role = role;
	rmc.ok = function () {
		$uibModalInstance.close(rmc);
	};
	rmc.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
})
angular.module('handyforall.accounts').directive('cropImgChange', function () {
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			var onChangeHandler = scope.$eval(attrs.cropImgChange);
			element.bind('change', onChangeHandler);
		}
	};
});
