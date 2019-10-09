angular.module('handyforall.task').controller('taskProfileCtrl', taskProfileCtrl);
taskProfileCtrl.$inject = ['$scope', '$rootScope', '$location', '$stateParams', '$uibModal', 'TaskService', 'TaskProfileResolve', 'toastr', '$state', '$translate', '$cookieStore'];
function taskProfileCtrl($scope, $rootScope, $location, $stateParams, $uibModal, TaskService, TaskProfileResolve, toastr, $state, $translate, $cookieStore) {
  var tpc = this;
  if (angular.isDefined($stateParams.taskerId)) {
    tpc.taskerId = $stateParams.taskerId;
  }
  if (angular.isDefined($stateParams.slug)) {
    tpc.cate = $stateParams.slug;
  }
  tpc.taskDetailInfo = {};
  tpc.availableSymbal = false;
  if (angular.isDefined($stateParams.date)) {
    tpc.date = $stateParams.date;
  }
  if (angular.isDefined($stateParams.minprice)) {
    tpc.minvalue = $stateParams.minprice;
  }
  if (angular.isDefined($stateParams.maxprice)) {
    tpc.maxvalue = $stateParams.maxprice;
  }
  if (angular.isDefined($stateParams.kmmaxvalue)) {
    tpc.kmmaxvalue = $stateParams.kmmaxvalue;
  }
  if (angular.isDefined($stateParams.kmminvalue)) {
    tpc.kmminvalue = $stateParams.kmminvalue;
  }
  if (angular.isDefined($stateParams.time)) {
    tpc.time= $stateParams.time;
  }
  if (angular.isDefined($stateParams.task)) {
    tpc.task = $stateParams.task;
  }
  if (angular.isDefined($stateParams.hour)) {
    tpc.hour = $stateParams.hour;
  }
  if (angular.isDefined($stateParams.day)) {
    tpc.day = $stateParams.day;
  }
  if (angular.isDefined($stateParams.current_page)) {
    tpc.current_page = $stateParams.current_page;
  }
  if (angular.isDefined($stateParams.user)) {
    tpc.user = $stateParams.user;
  }

  if (TaskProfileResolve) {
    if (TaskProfileResolve.location) {
      var latlng = new google.maps.LatLng(TaskProfileResolve.location.lat, TaskProfileResolve.location.lng);
      var geocoder = geocoder = new google.maps.Geocoder();
      geocoder.geocode({ 'latLng': latlng }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          if (results[1]) {
            if (TaskProfileResolve.availability_address) {
              TaskProfileResolve.availability_address = TaskProfileResolve.availability_address;
            } else {
              TaskProfileResolve.availability_address = results[1].formatted_address;
            }
          }
        }
      })
    }

    tpc.taskDetailInfo = TaskProfileResolve;
    if (tpc.taskDetailInfo.availability == 0) {
      tpc.availabilityValue = "Tasker is Unavailable";
      tpc.availableSymbal = false;
    } else {
      tpc.availabilityValue = "Tasker is Available";
      tpc.availableSymbal = true;
    }
    tpc.questionValue = "Tasker has not provided any details";
    tpc.answerValue = "Answer is Unavailable";

    if (tpc.taskDetailInfo.profile_details[0]) {
      if (tpc.taskDetailInfo.profile_details[0].answer) {
        tpc.checkVAlue = 1;
        tpc.answerValue = tpc.taskDetailInfo.profile_details;
      }
      if (tpc.taskDetailInfo.profile_details[0].question) {
        tpc.questionValue = tpc.taskDetailInfo.profile_details;
        // console.log("tpc.questionValue/*/*/*",tpc.questionValue);
      }
    }
  } else {
    $translate('WE ARE LOOKING FOR THIS TROUBLE SORRY UNABLE TO FETCH DATA').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
    $state.go('landing');
  }

  TaskService.taskerreviews(tpc.taskerId).then(function (response) {
    if (response[0]) {
      tpc.taskprofile = response[0];
      console.log("tpc.taskprofile", tpc.taskprofile)
      tpc.taskertempid = tpc.taskprofile[0]._id;

      tpc.profilelength = tpc.taskprofile.length;
      tpc.overallRating = 0;
      angular.forEach(tpc.taskprofile, function (value, key) {
        if (value.rate) {
          tpc.overallRating = tpc.overallRating + value.rate.rating;
        }
      });
      tpc.overallrate = tpc.overallRating / tpc.profilelength;

      if (tpc.taskprofile[0].createdAt) {
        tpc.convertdate = new Date(tpc.taskprofile[0].createdAt);
      }
      tpc.dateConversion = tpc.convertdate.getFullYear();
      tpc.induvidualrating = parseInt(response[1]);

      if (TaskProfileResolve.taskerskills) {
        angular.forEach(TaskProfileResolve.taskerskills, function (value1, key1) {
          if (value1.childid == $stateParams.sub_id) {
            tpc.experience = value1.experience.name;

          }
        });
      }
    }
  }, function (err) {
    toastr.error(err);
  });
tpc.clearvalue = function (){
  console.log('hai');
$cookieStore.remove('text');
}
  /* *confirmatask */
  tpc.confirmatask = function confirmatask(message,hourlyprice) {
    if(tpc.user){
      swal({
        title: 'Confirm & Book',
        text: 'Are You Sure Want To Confirm This Task',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Confirm!'
    }).then(function (response) {
      TaskService.taskdetails($stateParams.task).then(function (response) {

        var newData = response[0];
        var data = {};
        data._id = newData._id
        data.status = 1;
        data.user = tpc.user;
        data.tasker = TaskProfileResolve._id;
        data.hourly_rate = hourlyprice;
        data.task_hour = newData.task_hour;
        data.task_date = newData.task_date;
        data.task_day = newData.task_day;
        data.invoice = {
          'amount': {
            "minimum_cost": newData.category.commision,
            "task_cost": newData.category.commision,
            "total": newData.category.commision,
            "grand_total": newData.category.commision
          }
        };
        data.booking_information = {
          'service_type': newData.category.name,
          'work_type': newData.category.name,
          'work_id': newData.category._id,
          'instruction': newData.task_description,
          'booking_date': '',
          'reach_date': '',
          'est_reach_date': '',
          'location': newData.billing_address.line1 + "," + newData.billing_address.line2 + "," + newData.billing_address.city + "," + newData.billing_address.state + "," + newData.billing_address.country + "," + newData.billing_address.zipcode
        }
        data.history = {};
        data.history.job_booking_time = new Date();
        data.history.est_reach_date = '';
        TaskService.profileconfirmtask(data).then(function (result) {
          $translate('REQUEST HAS BEEN SENT TO TASKER SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
          $state.go('landing', { reload: false });
        }, function (error) {
          toastr.error(error);
        });
      })
    }).catch(function (err) { });
  }
  else{
     swal({
            title: 'Information',
            text: 'To Proceed Further, Please Login or Signup',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Confirm!'
        }).then(function (response) {
            tpc.query ={};
            tpc.query.task =  tpc.task;
            $cookieStore.put("categeoryslug", tpc.query);
			$state.go('login', { type: 'user' });
        }).catch(function (err) { });
  }


  }
    /*End*/
}

angular.module('handyforall.task').controller('ConfirmtaskModel', function ($uibModalInstance) {
	var ccm = this;
	ccm.ok = function () {
		$uibModalInstance.close('ok');
	};
	ccm.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});
