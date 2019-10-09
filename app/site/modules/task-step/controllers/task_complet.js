angular.module('handyforall.task')
    .controller('taskFilterCtrl', taskFilterCtrl);

taskFilterCtrl.$inject = ['$scope', '$rootScope', '$location', '$stateParams', 'SearchResolve', 'TaskService', 'toastr', '$state', '$filter', 'AuthenticationService', '$modal', 'MainService', '$translate', 'ngMeta', 'NgMap', '$scope', '$q', '$log', '$uibModal', 'swal', '$cookieStore'];

function taskFilterCtrl($scope, $rootScope, $location, $stateParams, SearchResolve, TaskService, toastr, $state, $filter, AuthenticationService, $modal, MainService, $translate, ngMeta, NgMap, $scope, $q, $log, $uibModal, swal, $cookieStore) {

    var tfc = this;

    tfc.slug = $cookieStore.get('slug');    

    var searchConfig = SearchResolve.response;
    var filtersInit = searchConfig.filtersInit || {};
    tfc.taskinfo = searchConfig.task;
    tfc.category = searchConfig.category;
    tfc.user = AuthenticationService.GetCredentials().currentUser;

    if (searchConfig.category.name) {
        ngMeta.setTitle(searchConfig.category.name);
    }

    tfc.filters = {
        view: 'list', sort: '1', page: 1, perPage: 5,
        price: [filtersInit.pricemin || 0, filtersInit.pricemax || 1000],
        distance: filtersInit.dstmax || 100
    }; // list or map

    var queryString = $stateParams.query;
    console.log("$stateParams--------",$stateParams)
    
    if (queryString) {
        tfc.query = JSON.parse(queryString);
        tfc.filters.view = tfc.query.view ? tfc.query.view : tfc.filters.view;
        tfc.filters.sort = tfc.query.sort ? tfc.query.sort : tfc.filters.sort;
        tfc.filters.time = tfc.query.time ? tfc.query.time : tfc.filters.time;
        tfc.filters.price = tfc.query.price ? tfc.query.price : tfc.filters.price;
        tfc.filters.distance = tfc.query.distance ? tfc.query.distance : tfc.filters.distance;
        tfc.filters.page = tfc.query.page ? tfc.query.page : tfc.filters.page;
    }

    /**
     * ====================== Setup the Search Page Skeleton ========================
     */

    // Task Date Select Box
    $scope.formattedDate = [];
    for (var i = 0; i <= 30; i++) {
        var date = moment().add(i, 'day');
        $scope.formattedDate.push({ date: date.format('DD-MMMM-YYYY'), day: date.format('dddd') });
    }
    var isAvailable = tfc.query.date ? $scope.formattedDate.find(function (o) { return o.date == tfc.query.date }) : null;
    tfc.filters.date = isAvailable ? isAvailable : $scope.formattedDate[0];

    // Task Time Select Box
    function filterDate() {
        tfc.timinglist = [
            { value: "morning", time: "0:00 AM", data: "00:00" },
            { value: "morning", time: "0:30 AM", data: "00:30" },
            { value: "morning", time: "1:00 AM", data: "01:00" },
            { value: "morning", time: "1:30 AM", data: "01:30" },
            { value: "morning", time: "2:00 AM", data: "02:00" },
            { value: "morning", time: "2:30 AM", data: "02:30" },
            { value: "morning", time: "3:00 AM", data: "03:00" },
            { value: "morning", time: "3:30 AM", data: "03:30" },
            { value: "morning", time: "4:00 AM", data: "04:00" },
            { value: "morning", time: "4:30 AM", data: "04:30" },
            { value: "morning", time: "5:00 AM", data: "05:00" },
            { value: "morning", time: "5:30 AM", data: "05:30" },
            { value: "morning", time: "6:00 AM", data: "06:00" },
            { value: "morning", time: "6:30 AM", data: "06:30" },
            { value: "morning", time: "7:00 AM", data: "07:00" },
            { value: "morning", time: "7:30 AM", data: "07:30" },
            { value: "morning", time: "8:00 AM", data: "08:00" },
            { value: "morning", time: "8:30 AM", data: "08:30" },
            { value: "morning", time: "9:00 AM", data: "09:00" },
            { value: "morning", time: "9:30 AM", data: "09:30" },
            { value: "morning", time: "10:00 AM", data: "10:00" },
            { value: "morning", time: "10:30 AM", data: "10:30" },
            { value: "morning", time: "11:00 AM", data: "11:00" },
            { value: "morning", time: "11:30 AM", data: "11:30" },
            { value: "afternoon", time: "12:00 PM", data: "12:00" },
            { value: "afternoon", time: "12:30 PM", data: "12:30" },
            { value: "afternoon", time: "1:00 PM", data: "13:00" },
            { value: "afternoon", time: "1:30 PM", data: "13:30" },
            { value: "afternoon", time: "2:00 PM", data: "14:00" },
            { value: "afternoon", time: "2:30 PM", data: "14:30" },
            { value: "afternoon", time: "3:00 PM", data: "15:00" },
            { value: "afternoon", time: "3:30 PM", data: "15:30" },
            { value: "evening", time: "4:00 PM", data: "16:00" },
            { value: "evening", time: "4:30 PM", data: "16:30" },
            { value: "evening", time: "5:00 PM", data: "17:00" },
            { value: "evening", time: "5:30 PM", data: "17:30" },
            { value: "evening", time: "6:00 PM", data: "18:00" },
            { value: "evening", time: "6:30 PM", data: "18:30" },
            { value: "evening", time: "7:00 PM", data: "19:00" },
            { value: "evening", time: "7:30 PM", data: "19:30" },
            { value: "evening", time: "8:00 PM", data: "20:00" },
            { value: "evening", time: "8:30 PM", data: "20:30" },
            { value: "evening", time: "9:00 PM", data: "21:00" },
            { value: "evening", time: "9:30 PM", data: "21:30" },
            { value: "evening", time: "10:00 PM", data: "22:00" },
            { value: "evening", time: "10:30 PM", data: "22:30" },
            { value: "evening", time: "11:00 PM", data: "23:00" },
            { value: "evening", time: "11:30 PM", data: "23:30" }

        ];

        tfc.filterTiming = [];
        var startDate = moment(tfc.filters.date.date, 'DD-MMMM-YYYY');
        var endDate = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });

        if (startDate.diff(endDate, 'days') <= 0) {
            for (var i = 0; i < tfc.timinglist.length; i++) {
                if (tfc.timinglist[i].data > new Date().getHours() + ":00") {
                    tfc.filterTiming.push(tfc.timinglist[i]);
                }
            }
            if(tfc.category.hours) {
                if(tfc.filterTiming.length <= tfc.category.hours * 2) {
                    tfc.timeout = true;
                } else {
                    tfc.timeout = false;
                }
            }
        } else {
            tfc.filterTiming = tfc.timinglist;
        }
        tfc.filterTiming = tfc.filterTiming.length > 0 ? tfc.filterTiming : tfc.timinglist;
        var isAvailable = tfc.filterTiming.find(function (o) { return o.data == tfc.filters.time });
        tfc.filters.time = (tfc.filters.time && isAvailable) ? tfc.filters.time : tfc.filterTiming[0].data;
    }

    filterDate();

    // Price Filter Setup
   
    tfc.priceFilter = {
        min: tfc.filters.price[0] || 0,
        max: tfc.filters.price[1] || 0,
        options: {
            floor: filtersInit.pricemin || 0,
            ceil: filtersInit.pricemax || 1000,
            onEnd: function () {
                tfc.filters.page = 1;
                getTaskerDetails();
            },
            translate: function (value, sliderId, label) {
                // console.log(":::::::::: Translate :::::::::::", $rootScope.currency);
                return $rootScope.currency.symbol + '' + ($rootScope.currency.value * value)
            }
        }
    };

    // Distance Filter Setup
    tfc.radiustext = $rootScope.settings.distanceby == 'mi' ? 'MILE' : 'KILOMETER';
    tfc.radiusval = $rootScope.settings.distanceby == 'km' ? 1000 : 1609.34;
    tfc.distanceFilter = {
        value: tfc.filters.distance,
        max: 1000,
        options: {
            floor: 1,
            ceil: filtersInit.dstmax || 1000,
            showSelectionBar: true,
            onEnd: function () {
                tfc.filters.page = 1;
                getTaskerDetails();
            }
        },
    };

    /**
     * ====================== End Of Search Page Skeleton ========================
     */

    $scope.$watchCollection('DefaultCurrency', function (newNames, oldNames) {
        $rootScope.currency = newNames;
        $scope.$broadcast('rzSliderForceRender');
    });

    tfc.changeViewType = function () {
        getTaskerDetails();
    }

    tfc.filterDate = function () {
        filterDate();
        tfc.filters.page = 1;
        getTaskerDetails();
    }

    tfc.filterTime = function () {
        tfc.filters.page = 1;
        getTaskerDetails();
    }

    function getTaskerDetails() {
        
        tfc.tasker_list = false;
        tfc.TaskerDetails = [];
        tfc.TaskerDetails.length = 1;

        var search = {};
        if(tfc.user){
        search.user = tfc.user.user_id;
        tfc.filters.type = 1;
        }
        else{
        tfc.filters.type = 0;
        }
        search.category = tfc.category._id;
        search.task = tfc.taskinfo._id;
        search.date = moment(tfc.filters.date.date, 'DD-MMMM-YYYY').format('YYYY-MM-DD');
        search.time = tfc.filters.time;
        search.timeout = tfc.timeout;
        search.price = [tfc.priceFilter.min, tfc.priceFilter.max];
        search.distance = tfc.distanceFilter.value;
        search.sort = tfc.filters.sort;
        search.skip = (parseInt(tfc.filters.page) - 1) * tfc.filters.perPage;
        search.limit = tfc.filters.limit || tfc.filters.perPage;
        search.view = tfc.filters.view;        

        TaskService.getTaskerByGeoFilter(search).then(function (response) {
            console.log("Available tasker data",response);
           
            if (response.count > 0) {
                tfc.tasker_list = true;
                tfc.TaskerDetails = response.taskers;
                tfc.filters.totalTasker = response.count;

                /*Map*/
                if (tfc.filters.view == 'map') {
                    NgMap.getMap().then(function (map) {
                        $scope.map = map;
                        $scope.lat = tfc.taskinfo.location.lat;
                        $scope.lng = tfc.taskinfo.location.lng;
                        $scope.markerData = [];
                        $scope.getCityInfo = function () {
                            for (var i = 0; i < tfc.TaskerDetails.length; i++) {
                                $scope.markerData.push({
                                    "id": i,
                                    "latitude": tfc.TaskerDetails[i].location.lat,
                                    "longitude": tfc.TaskerDetails[i].location.lng,
                                    "title": tfc.TaskerDetails[i].availability_address,
                                    "tasker": tfc.TaskerDetails[i],
                                    "icon": tfc.TaskerDetails[i].avatar,
                                    "avatar": tfc.TaskerDetails[i].avatar,
                                    "position": [tfc.TaskerDetails[i].location.lat, tfc.TaskerDetails[i].location.lng]
                                });
                            }
                        }
                        $scope.getCityInfo();  
                        tfc.showCity = function (event, cityItem) {
                            $scope.selectedCity = cityItem;
                            $scope.map.showInfoWindow('myInfoWindow', 'm' + cityItem.id);
                        }
                    });
                }
                /*Map End*/
            }else if(response.count == 0){
                tfc.TaskerDetails =[];
                tfc.tasker_list = true;
            }

            tfc.query = {};
            tfc.query.sort = tfc.filters.sort;
            tfc.query.page = tfc.filters.page;
            tfc.query.date = tfc.filters.date.date;
            tfc.query.time = tfc.filters.time;
            tfc.query.price = search.price;
            tfc.query.distance = search.distance;
            tfc.query.view = tfc.filters.view;

            $state.go("search", { query: JSON.stringify(tfc.query) }, {
                notify: false, reload: false, location: 'replace', inherit: true
            });

        }, function (error) { });
    };
    getTaskerDetails();

    function confirmatask(tasker) {
        if(tfc.user){
        swal({
            title: 'Confirm & Book',
            text: 'Are You Sure Want To Confirm This Task.',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Confirm!'
        }).then(function (response) {
            if (response) {

                var task = {};
                task.tasker = tasker;
                task.user = tfc.user.user_id;
                task.task = tfc.taskinfo._id;
                task.time = tfc.filters.time;

                var from = moment(tfc.filters.time,'HH:mm').format('HH');
                var to = moment(tfc.filters.time,'HH:mm').add(tfc.category.hours, 'h').format('HH');

                var tasktime = [];

                if(to - from > 1) {
                    tasktime.push(parseInt(from), parseInt(from) + 1, parseInt(to));
                } else {
                    tasktime.push(parseInt(from), parseInt(to));
                }

                task.slots = tasktime;
                // task.task_date = tfc.filters.date;

                TaskService.confirmtask(task).then(function (result) {
                    if (result.status == 1) {
                        $translate('REQUEST HAS BEEN SENT TO TASKER SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                        $state.go('account.tasks', { reload: false });
                    } else {
                        toastr.error('Unable to book this tasker');
                    }
                }, function (error) {
                    toastr.error(error);
                });
            }
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
            tfc.query.task =  tfc.taskinfo._id;
            $cookieStore.put("categeoryslug", tfc.query);
			$state.go('login', { type: 'user' });
        }).catch(function (err) { });
    }
    }

    angular.extend(tfc, {
        confirmatask: confirmatask,
        getTaskerDetails: getTaskerDetails
    });
}

angular.module('handyforall.task').directive('setClassWhenAtTop', function ($window) {
    var $win = angular.element($window);
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var topClass = attrs.setClassWhenAtTop,
                offsetTop = element.offset().top;

            $win.on('scroll', function (e) {
                if ($win.scrollTop() >= offsetTop) {
                    element.addClass(topClass);
                } else {
                    element.removeClass(topClass);
                }
            });
        }
    };
});