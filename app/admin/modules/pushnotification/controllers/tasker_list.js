angular.module('handyforall.pushnotification').controller('TaskerListCtrl',TaskerListCtrl);
TaskerListCtrl.$inject = ['TaskernotificationServiceResolve','TaskernotificationService','$window','$modal','$scope','$rootScope'];

function TaskerListCtrl(TaskernotificationServiceResolve,TaskernotificationService,$window, $modal,$scope,$rootScope){

  var tlc = this;
  tlc.permission =$scope.privileges.filter(function (menu) {
      return (menu.alias === "notification");
  }).map(function (menu) {
      return menu.status;
  })[0];
    var layout = [
        {
            name: $rootScope.tasker,
            variable:'email',
            template:'{{content.email}}',
            sort:1
        }
    ];


    var tlc = this;
    tlc.table = {};
    tlc.table.name = 'Tasker';
    // tlc.table.SubscriberMail = SubscriberMail;
    tlc.table.module = 'earnings';
    tlc.table.layout = layout;
    tlc.table.data = TaskernotificationServiceResolve[0];
    tlc.table.count = TaskernotificationServiceResolve[1] || 0;
    tlc.table.delete = {'permission':tlc.permission,service:'/newsletter/subscriber/delete', getData:function (currentPage, itemsPerPage, sort, status, search) {
        var skip = (parseInt(currentPage) - 1) * itemsPerPage;
        TaskernotificationService.getTaskerList(itemsPerPage, skip, sort, status, search).then(function(respo) {
            tlc.table.data = respo[0];
            tlc.table.count = respo[1];
        });
    }};


}
