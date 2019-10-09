angular.module('handyforall.dashboard').controller('DashboardCtrl', DashboardCtrl);

DashboardCtrl.$inject = ['dashboardServiceResolve', 'toastr', 'DashboardService', '$scope', '$modal', '$state', '$stateParams', '$filter', '$rootScope', 'earningsServiceResolve'];

function DashboardCtrl(dashboardServiceResolve, toastr, DashboardService, $scope, $modal, $state, $stateParams, $filter, $rootScope, earningsServiceResolve) {

    var dlc = this;
    // dlc.tasks = getRecentTasksResolve[0];
    // dlc.taskers = getRecentTaskersResolve[0];
    var statistics = dashboardServiceResolve;

    dlc.statistics = {}
    dlc.statistics.usertotal = statistics.user.Total[0] ? statistics.user.Total[0].count : 0;
    dlc.statistics.TodayRegisterUser = statistics.user.Today[0] ? statistics.user.Today[0].count : 0;
    dlc.statistics.TodayLogin = statistics.user.Today[0] ? statistics.user.TodayLogin[0].count : 0;

    dlc.statistics.taskertotal = statistics.tasker.Total[0] ? statistics.tasker.Total[0].count : 0;
    dlc.statistics.TodayRegisterTasker = statistics.tasker.Today[0] ? statistics.tasker.Today[0].count : 0;
    dlc.statistics.ActiveTasker = statistics.tasker.ActiveTasker[0] ? statistics.tasker.ActiveTasker[0].count : 0;

    dlc.statistics.TotalTask = statistics.task.Total[0] ? statistics.task.Total[0].count : 0;
    dlc.statistics.TodayTask = statistics.task.Today[0] ? statistics.task.Today[0].count : 0;
    dlc.statistics.OnGoing = statistics.task.OnGoing[0] ? statistics.task.OnGoing[0].count : 0;;
    dlc.statistics.Completed = statistics.task.Completed[0] ? statistics.task.Completed[0].count : 0;;
    dlc.statistics.Cancel = statistics.task.Cancel[0] ? statistics.task.Cancel[0].count : 0;

    dlc.statistics.MainCategory = statistics.category.MainCategory[0] ? statistics.category.MainCategory[0].count : 0;
    dlc.statistics.SubCategory = statistics.category.SubCategory[0] ? statistics.category.SubCategory[0].count : 0;

    dlc.statistics.Coupon = statistics.coupon ? statistics.coupon : 0;
    dlc.statistics.Subscriber = statistics.subscriber ? statistics.subscriber : 0;

    dlc.statistics.TotalJobCount = statistics.earnings.Total[0] ? statistics.earnings.Total[0].count : 0;
    dlc.statistics.TotalEarnings = statistics.earnings.Total[0] ? statistics.earnings.Total[0].amount : 0;
    dlc.statistics.TotalAdminEarnings = statistics.earnings.Total[0] ? statistics.earnings.Total[0].adminEarnings : 0;
    dlc.statistics.TotalServiceFee = statistics.earnings.Total[0] ? statistics.earnings.Total[0].service_tax : 0;

    dlc.statistics.TodayJobCount = statistics.earnings.Today[0] ? statistics.earnings.Today[0].count : 0;
    dlc.statistics.TodayEarnings = statistics.earnings.Today[0] ? statistics.earnings.Today[0].amount : 0;
    dlc.statistics.TodayAdminEarnings = statistics.earnings.Today[0] ? statistics.earnings.Today[0].adminEarnings : 0;

    $scope.taskDetails = statistics.gettaskdetails;
    $scope.RecentUsers = statistics.getuserdetails[0] ? statistics.getuserdetails[0].documentData : [];
    $scope.taskersDetails = statistics.taskersDetails[0] ? statistics.taskersDetails[0].documentData : [];
    $scope.verifiedtaskersDetails = statistics.verifiedtaskersDetails[0] ? statistics.verifiedtaskersDetails[0].documentData : [];
       
    $scope.toptasker = statistics.toptasker ? statistics.toptasker : [];
    $scope.topreviewedtasker = statistics.topreviewedtasker ? statistics.topreviewedtasker : [];
    $scope.topcategories = statistics.topcategories ? statistics.topcategories : [];

    

    dlc.permission = $scope.privileges.filter(function (menu) {
        return (menu.alias === "users");
    }).map(function (menu) {
        return menu.status;
    })[0];

    dlc.taskerpermission = $scope.privileges.filter(function (menu) {
        return (menu.alias === "tasker");
    }).map(function (menu) {
        return menu.status;

    })[0];

    dlc.taskpermission = $scope.privileges.filter(function (menu) {
        return (menu.alias === "tasks");
    }).map(function (menu) {
        return menu.status;
    })[0];

    /*  var layout = [
         {
             name: 'Booking ID',
             variable: 'booking_id',
             template: '{{content.booking_id}}',
             sort: 1
         },
         {
             name: 'Task Date',
             variable: 'task_date',
             template: '{{content.task_date}}',
             sort: 1
         },
         {
             name: 'Username',
             variable: 'username',
             template: '{{content.user[0].username}}',
             sort: 1
         },
         {
             name: 'Status ',
             template: '<span ng-switch="content.status">' +
                 '<span  ng-switch-when="0">Delete</span>' +
                 '<span  ng-switch-when="1">Onprogress</span>' +
                 '<span  ng-switch-when="3">Accepted</span>' +
                 '<span  ng-switch-when="4">StartOff</span>' +
                 '<span  ng-switch-when="5">Arrived</span>' +
                 '<span  ng-switch-when="6">Completed</span>' +
                 '<span  ng-switch-when="7">Completed</span>' +
                 '<span  ng-switch-when="8">Cancelled</span>' +
                 '<span  ng-switch-when="9">Dispute</span>' +
                 '<span  ng-switch-when="10">Search</span>' +
                 '</span>'
 
         },
     ];
 
     dlc.table = {};
     dlc.table.layout = layout;
     dlc.table.data = getRecentTasksResolve[0];
     dlc.table.count = getRecentTasksResolve[1] || 0;
     dlc.table.delete = {
         service: '/slider/deletebanner', getData: function (currentPage, itemsPerPage, sort, status, search) {
             var skip = (parseInt(currentPage) - 1) * itemsPerPage;
             DashboardService.getRecentTasks(itemsPerPage, skip, sort, status, search).then(function (respo) {
                 dlc.table.data = respo[0];
                 dlc.table.count = respo[1];
             });
         }
     }; */

    $scope.refMonth = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    $scope.monthArrayObj = [[1, 'JAN'], [2, 'FEB'], [3, 'MAR'], [4, 'APR'], [5, 'MAY'], [6, 'JUN'], [7, 'JUL'], [8, 'AUG'], [9, 'SEP'], [10, 'OCT'], [11, 'NOV'], [12, 'DEC']];

    $scope.currentMonth = new Date().getMonth() + 1;
    $scope.newMonthArray = [];
    for (var i = 0, k = $scope.currentMonth; i < $scope.monthArrayObj.length; i++ , k++) {
        if (k >= $scope.refMonth.length) {
            $scope.monthArrayObj[i][1] = $scope.refMonth[i - ($scope.refMonth.length - $scope.currentMonth)];
        } else {
            $scope.monthArrayObj[i][1] = $scope.refMonth[k];
        }
    }

    $scope.convertedData = {
        orderCount: [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0]],
        orderAmount: [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0]],
        monthArray: []
    };

    /*
        DashboardService.getRecentUsers().then(function (data) {
            $scope.RecentUsers = data;
        });

        DashboardService.getTaskDetails().then(function (data) {
            $scope.taskDetails = data;
        });

        DashboardService.getTaskerDetails().then(function (data) {
            $scope.taskersDetails = data;
        });

        DashboardService.getverifiedTaskerDetails().then(function (data) {
            $scope.verifiedtaskersDetails = data;
        });

        DashboardService.getAllearnings().then(function (data) {
            $scope.earnings = (data.data[0]).toFixed(2);
            $scope.earningsadmin = (data.data[1]).toFixed(2);
        });

        DashboardService.getdefaultcurrency().then(function (data) {
            $scope.getdefaultcurrency = data;
        });
*/

    dlc.updateuser = function () {
        DashboardService.getRecentUsers().then(function (data) {
            $scope.RecentUsers = data;
        });
    }

    dlc.approvtaskerss = function () {
        DashboardService.getTaskerDetails().then(function (data) {
            $scope.taskersDetails = data;
        });
    }
    dlc.deleteuser = function (id) {
        var modalInstance = $modal.open({
            animation: true,
            templateUrl: 'app/admin/modules/dashboard/views/deleteuser.modal.tab.html',
            controller: 'DeleteUserModalInstanceCtrl',
            controllerAs: 'DCMIC',
            resolve: {
                user: function () {
                    return id;
                }
            }
        });
        modalInstance.result.then(function (id) {
            DashboardService.deleteUser(id).then(function (response) {
                if (response.code == 11000) {
                    toastr.error('Error');
                }
                else {
                    dlc.updateuser();
                    toastr.success('success', 'Deleted Successfully');

                }

            });
        });
    }
    dlc.approvtasker = function (id, status) {
        DashboardService.approvTasker(id, status).then(function (response) {
            if (response.code == 11000) {
                toastr.error('Error');
            }
            else {
                if (response.data.status == 1) {
                    dlc.approvtaskerss();
                    toastr.success('success', 'Approved Successfully');
                }
                else if (response.data.status == 2) {
                    dlc.approvtaskerss();
                    toastr.success('success', 'UnPublish Successfully');
                }

            }
        });
    }
    dlc.edit = function (taskerid) {
        $state.go('app.taskers.edit', ({ id: taskerid }));
    }
    dlc.edituser = function (userid) {
        $state.go('app.users.add', ({ id: userid }));
    }
    dlc.viewtask = function (taskid) {
        $state.go('app.tasks.add', ({ id: taskid }));
    }
    // chart end

    $scope.earningsDetails = earningsServiceResolve;

    /* 
        $scope.dataset = [{
            data: $scope.adminlist,
            label: 'Admin Earnings',
            points: {
                show: true, // points
                radius: 6
            },
            splines: {
                show: true,
                lineWidth: 3,
                tension: 0.001,
                fill: 0
            }
        }, {
            data: $scope.taskslist,
            label: 'Total task Amount',
            points: {
                show: true,
                radius: 6
            },
            splines: {
                show: true,
                tension: 0.001,
                lineWidth: 3,
                fill: 0
            }
        },
        {
            visible: $rootScope.earningsVisiblevalue
        }]; 
    
        $scope.options = {
            colors: ['#004687', '#BCCF02'],
            series: {
                shadowSize: 0
            },
            xaxis: {
                font: {
                    color: '#ccc'
                },
                position: 'bottom',
                ticks: $scope.xaxis_list
            },
            yaxis: {
                font: {
                    color: '#ccc'
                },
                tickFormatter: function (v, axis) {
                    if (v % 10 == 0) {
                        return $scope.getdefaultcurrency.symbol + v;
                    } else {
                        return "";
                    }
                },
            },
            grid: {
                hoverable: true,
                clickable: true,
                borderWidth: 0,
                color: '#ccc'
            },
            tooltip: true,
            tooltipOpts: {
                content: '%s.: %y.4',
                defaultTheme: false,
                shifts: {
                    x: 0,
                    y: 20
                }
            }
        };*/


    $scope.adminlist = [];
    $scope.taskslist = [];
    $scope.xaxis_list = [];
    $scope.taskerlist = [];

    var i = 12;
    var costLine = $scope.earningsDetails.response.earnings.filter(function (admin) {

        $scope.adminlist.push([i, admin.admin_earnings]);
        $scope.taskslist.push([i, admin.amount]);
        $scope.taskerlist.push([i, admin.tasker_earnings]);
        $scope.xaxis_list.push([i, admin.month]);
        i--;
        return admin;
    })

    $scope.CombinedChartCtrl = [{
        data: $scope.taskerlist,
        label: 'Tasker Earnings',
        points: {
            show: true,
            radius: 3
        },
        splines: {
            show: true,
            tension: 0.45,
            lineWidth: 4,
            fill: 0
        }
    }, {
        data: $scope.adminlist,
        label: 'Admin Earninigs',
        points: {
            show: true,
            radius: 3
        },
        splines: {
            show: true,
            tension: 0.45,
            lineWidth: 4,
            fill: 0
        },
        color: '#4484c9'
    }, {
        data: $scope.taskslist,
        label: 'Site Earnings',
        bars: {
            show: true,
            barWidth: 0.4,
            lineWidth: 0,
            fillColor: { colors: [{ opacity: 0.6 }, { opacity: 0.8 }] }
        }
    }];

    $scope.CombinedChartoptions = {
        colors: ['#16a085', '#FF0066'],
        series: {
            shadowSize: 0
        },
        xaxis: {
            font: {
                color: '#616f77'
            },
            position: 'bottom',
            ticks: $scope.xaxis_list
        },
        yaxis: {
            font: {
                color: '#616f77'
            },
            tickFormatter: function (v, axis) {
                if (v % 10 == 0) {
                    return $rootScope.symbol + v;
                } else {
                    return "";
                }
            },
        },
        grid: {
            hoverable: true,
            clickable: true,
            borderWidth: 0,
            color: '#ccc'
        },
        tooltip: true,
        tooltipOpts: {
            content: '%s: %y.4',
            defaultTheme: false,
            shifts: {
                x: 0,
                y: 20
            }
        }
    };

    $scope.PieChartCtrl = [ 
        { label: 'Admin Earnings', data: dlc.statistics.TotalAdminEarnings || 100 },
        { label: 'Site Earnings', data: dlc.statistics.TotalEarnings || 0},
        { label: 'Service Tax', data: dlc.statistics.TotalServiceFee || 0},

    ];

    $scope.PieChartoptions = {
        series: {
            pie: {
                show: true,
                innerRadius: 0,
                stroke: {
                    width: 0
                },
                label: {
                    show: true,
                    threshold: 0.05
                }
            }
        },
        colors: ['#428bca', '#5cb85c', '#f0ad4e', '#d9534f', '#5bc0de', '#616f77'],
      /*   grid: {
            hoverable: true,
            clickable: true,
            borderWidth: 0,
            color: '#ccc'
        }, */
        grid: {
            hoverable: true
        },
        tooltip: true,
        tooltipOpts: {
            cssClass: "flotTip",
            content: "%p.0%, %s",
            shifts: {
                x: 20,
                y: 0
            },
            defaultTheme: false
        }
    };

    // chart end


}

angular.module('handyforall.taskers').controller('DeleteUserModalInstanceCtrl', function ($modalInstance, user) {
    var dcmic = this;
    dcmic.userid = user;
    dcmic.ok = function () {
        $modalInstance.close(dcmic.userid);
    };
    dcmic.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
})