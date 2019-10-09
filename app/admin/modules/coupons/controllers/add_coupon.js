angular.module('handyforall.coupons').controller('editCouponCtrl', editCouponCtrl);

editCouponCtrl.$inject = ['toastr', 'CouponService', 'CouponEditServiceResolve', '$state', '$stateParams', 'CouponAvailableUserServiceResolve'];

function editCouponCtrl(toastr, CouponService, CouponEditServiceResolve, $state, $stateParams, CouponAvailableUserServiceResolve) {

    var ecc = this;
    ecc.requiredValue = true;
    ecc.availableUsers = CouponAvailableUserServiceResolve;

    if ($stateParams.id) {
        ecc.action = 'edit';
    } else {
        ecc.action = 'add';
    }

    ecc.Date = new Date();
    ecc.editData = CouponEditServiceResolve;

    if (ecc.editData.valid_from) { ecc.editData.valid_from = new Date(ecc.editData.valid_from); }
    if (ecc.editData.expiry_date) { ecc.editData.expiry_date = new Date(ecc.editData.expiry_date); }

    ecc.discount_type = { Flat: 'Flat Discount', Percentage: 'Percentage Discount' };
    ecc.disbledValue = false;
    ecc.submitData = function submitEditPageData(isValid, data) {
	// console.log("data.expiry_date",data.expiry_date)
	var expiryday 		= data.expiry_date.getDate();
	var expirymonth 	= data.expiry_date.getMonth()+1;
	var expiryyear 		= data.expiry_date.getYear();


	var today       = new Date();
	var todayday 		= today.getDate();
	var todaymonth 	= today.getMonth()+1;
	var todayyear 	= today.getYear();

/*if(todayyear == expiryyear || todayyear <= expiryyear){
  if(todaymonth == expirymonth || (todaymonth <= expirymonth && todayyear <= expiryyear))
  {

  }
 // console.log(expiryyear);
}*/
  var expvalid  = expiryday + '-' + expirymonth  + '-' + expiryyear
	var todvalid  = todayday + '-' + todaymonth  + '-' + todayyear;
       if (isValid) {
			/*if(data.expiry_date != undefined) {
				if(expvalid >= todvalid){*/
					CouponService.submit(data).then(function (response) {
            if (response.nModified == 1) {
              toastr.success('Coupon updated successfully', 'Success');
							$state.go('app.coupons.list');
            }
            else {
							toastr.success('Coupon added successfully', 'Success');
							$state.go('app.coupons.list');
             }
						}, function (err) {
							toastr.error('Coupon code already exists');
						});
			/*	}
				else {
					toastr.error('Enter Valid Date1');
				}
			}
			else {
				toastr.error('Enter Valid Date2');
			}
        */
      }
		/*else {
            toastr.error('form is invalid');
        }*/
    };

}
