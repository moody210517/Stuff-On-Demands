var app = angular.module('handyforall.task');
app.factory('TaskService', TaskService);

function TaskService($http, $q) {
    var taskService = {
        taskbaseinfo: taskbaseinfo,
        checktaskeravailability: checktaskeravailability,
        getTaskerByGeoFilter: getTaskerByGeoFilter,
        //getTaskerByGeoFiltermap: getTaskerByGeoFiltermap,
        gettaskuser: gettaskuser,
        //createOrder: createOrder,
        taskprofileinfo: taskprofileinfo,
        taskerreviews: taskerreviews,
        saveuser: saveuser,
        addtask: addtask,
        getTaskDetailsbyid: getTaskDetailsbyid,
        confirmtask: confirmtask,
        deleteaddress: deleteaddress,
        getaddressdata: getaddressdata,
        AddAddress: AddAddress,
        addressStatus: addressStatus,
        searchTasker: searchTasker,
        taskerCount: taskerCount,
        getuserdata: getuserdata,
        taskdetails: taskdetails,
        taskerconfirmtask: taskerconfirmtask,
        profileconfirmtask: profileconfirmtask
    };

    return taskService;

    function taskbaseinfo(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/taskbaseinfo/',
            data: { slug: data }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getaddressdata(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/getaddressdata/',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }
    function getuserdata(data) {
        //  console.log(data);
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/getuserdata/',
            data: { data: data }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function deleteaddress(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/deleteaddress/',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function AddAddress(userid, data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/addaddress',
            data: { userid: userid, data: data }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function taskerreviews(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/taskerreviews',
            data: { slug: data }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function taskprofileinfo(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/taskprofileinfo',
            data: { slug: data }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function checktaskeravailability(location, categoryId) {

        var url = '/site/task/taskerAvailabilitybyWorkingAreaCount?lat=' + location.lat + '&lon=' + location.lng + '&categoryid=' + categoryId;
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: url
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function gettaskuser(filter) {
        var url = '/site/task/gettaskuser';
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: url,
            data: { user: filter.tasker, categoryid: filter.categoryid, hour: filter.hour, day: filter.day, loginUser: filter.loginUser, vehicle: filter.vechile }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getTaskerByGeoFilter(data) {
        var deferred = $q.defer();
        var result = 1;
        if (result == 1) {
            $http({
                method: 'POST',
                url: '/site/task/taskeravailabilitybyWorkingArea',
                data: data
            }).then(function (data) {
                deferred.resolve(data.data);
            }, function (err) {
                deferred.reject(err);
            });
            result = 2;
            return deferred.promise;
        }

    }

    /*
    function getTaskerByGeoFiltermap(filter, page, itemsPerPage) {
        var url = '';
        var categoryid = "";
        var taskid = "";
        var date = "";
        if (angular.isDefined(filter.date)) {
            date = filter.date;
        }
        var time = "";
        if (angular.isDefined(filter.time)) {
            time = filter.time;
        }

        if (angular.isDefined(filter.categoryid)) {
            categoryid = filter.categoryid;
        }
        if (angular.isDefined(filter.task)) {
            taskid = filter.task;
        }
        var vechile = "";
        if (angular.isDefined(filter.vechile)) {
            vechile = filter.vechile;
        }
        var lon = "";
        if (angular.isDefined(filter.lon)) {
            lon = filter.lon;
        }
        var lat = "";
        if (angular.isDefined(filter.lat)) {
            lat = filter.lat;
        }
        var day = "";
        if (angular.isDefined(filter.day)) {
            day = filter.day;
        }
        var hour = "";
        if (angular.isDefined(filter.hour)) {
            hour = filter.hour;
        }
        var minvalue = "";
        if (angular.isDefined(filter.minvalue)) {
            minvalue = filter.minvalue;
        }
        var maxvalue = "";
        if (angular.isDefined(filter.maxvalue)) {
            maxvalue = filter.maxvalue;
        }
        var kmminvalue = "";
        if (angular.isDefined(filter.kmminvalue)) {
            kmminvalue = filter.kmminvalue;
        }
        var kmmaxvalue = "";
        if (angular.isDefined(filter.kmmaxvalue)) {
            kmmaxvalue = filter.kmmaxvalue;
        }

        if (page) {
            var skip = (parseInt(page) - 1) * itemsPerPage;
            url = '/site/task/taskeravailabilitybyWorkingAreaMap?page=' + page + '&skip=' + skip + '&limit=' + itemsPerPage + '&vechile=' + vechile + '&categoryid=' + categoryid + '&day=' + day + '&hour=' + hour + '&time=' + time + '&task=' + taskid + '&date=' + date + '&minvalue=' + minvalue + '&maxvalue=' + maxvalue + '&kmminvalue=' + kmminvalue + '&kmmaxvalue=' + kmmaxvalue;
        } else {
            url = '/site/task/taskeravailabilitybyWorkingAreaMap?page=' + page + '&skip=' + 0 + '&limit=' + itemsPerPage + '&vechile=' + vechile + '&categoryid=' + categoryid + '&day=' + day + '&hour=' + hour + '&time=' + time + '&task=' + taskid + '&date=' + date + '&minvalue=' + minvalue + '&maxvalue=' + maxvalue + '&kmminvalue=' + kmminvalue + '&kmmaxvalue=' + kmmaxvalue;
        }
        var deferred = $q.defer();
        var result = 1;
        if (result == 1) {
            $http({
                method: 'GET',
                url: url
            }).success(function (data) {
                deferred.resolve(data);
            }).error(function (err) {
                deferred.reject(err);
            });
            result = 2;
            return deferred.promise;
        }

    }
    */
    /*

    function createOrder(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/create-order',
            data: { taskPayment: data }
        }).success(function (data) {
            deferred.resolve(data);
        }).error(function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };
    */

    function saveuser(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/saveuser',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    function addtask(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/addnewtask',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };

    function getTaskDetailsbyid(id) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/gettaskdetailsbyid',
            data: { id: id }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function confirmtask(data, time) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/confirmtask',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }
    function taskerconfirmtask(data, time) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/taskerconfirmtask',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function addressStatus(add_id, userid) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/addressStatus',
            data: { add_id: add_id, userid: userid }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function searchTasker(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/search-tasker',
            data: { task: data }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }


    function taskerCount(task, itemsPerPage, page) {
        var skip = (parseInt(page) - 1) * itemsPerPage;
        var url = '/site/task/taskerCount?page=' + page + '&skip=' + skip + '&limit=' + itemsPerPage + '&task=' + task;
        var deferred = $q.defer();
        $http({
            method: 'GET',
            url: url
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function taskdetails(task) {
        console.log(task);
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/gettask',
            data: { task: task }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function profileconfirmtask(task) {
        console.log(task);
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/task/profileConfirm',
            data: task
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }




}
