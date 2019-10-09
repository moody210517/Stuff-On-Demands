angular.module('handyforall.accounts')
    .controller('AccountReviewCtrl', AccountReviewCtrl)
    .controller('ReviewModelCtrl', ReviewModelCtrl);

AccountReviewCtrl.$inject = ['$scope', '$rootScope', '$state', 'MainService', 'routes', '$uibModal', 'toastr'];
ReviewModelCtrl.$inject = ['$scope', '$rootScope', '$state', 'MainService', 'routes', 'toastr', '$uibModalInstance', 'data', 'role'];

function AccountReviewCtrl($scope, $rootScope, $state, MainService, routes, $uibModal, toastr) {
    var arc = this;
    if (angular.isDefined($rootScope.accountProfile)) {
        arc.user = $rootScope.accountProfile || {}
    };

    // arc.reviewListCurrentPage = 1;
    arc.reviewListitemsPerPage = 2;
    arc.reviewListtotalItem = 0;
    arc.taskeractive = 1;

    function getUserReviewDetails(page) {
        arc.pagination_status = "review by you"
        arc.taskeractive = 0;
        arc.index = 1;
        arc.reviewListCurrentPage = page == undefined ? 1 : page;
        if(arc.reviewListCurrentPage != 1){
            arc.sno = (arc.reviewListCurrentPage * 2) - 1;
        }else{
            arc.sno = arc.reviewListCurrentPage;
        }
        var userId = $rootScope.userId;
        var role = arc.user.role;
        var data = {
            "id": userId,
            "role": role,
            "skip": arc.reviewListCurrentPage,
            "limit": arc.reviewListitemsPerPage
        }
        MainService.getData(routes.userReview, data).then(function(response) {
            arc.reviewListtotalItem = response.count;
            arc.getReview = response.result;
            arc.finalResult = [];
            angular.forEach(arc.getReview, function(value, key) {
                if (value.task) {
                    arc.finalResult.push(value);
                }
            });
        }).catch(function(err) {
            console.error('err = ', err);
        });
    };

    function getTaskerReviewDetails(page) {        
        arc.pagination_status = "review to you"
        arc.taskeractive = 1;
        arc.index = 0;
        var role = arc.user.role;
        arc.reviewListCurrentPage = page == undefined ? 1 : page;
        if(arc.reviewListCurrentPage != 1){
            arc.sno = (arc.reviewListCurrentPage * 2) - 1;
        }else{
            arc.sno = arc.reviewListCurrentPage;
        }        
        var userId = $rootScope.userId;
        var data = {
            "id": userId,
            "role": role,
            "skip": arc.reviewListCurrentPage,
            "limit": arc.reviewListitemsPerPage
        }       
        MainService.getData(routes.taskerReview, data).then(function(response) {
            // console.log('response = ',response);            
            arc.reviewListtotalItem = response.count;
            arc.getReview = response.result;
            arc.finalResult = [];
            angular.forEach(arc.getReview, function(value, key) {
                if (value.task) {
                    arc.finalResult.push(value);
                }              
            });
        }).catch(function(err) {
            console.error('err = ', err);
        });
    };

    function reviewsModal(data, role) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'app/site/modules/accounts/views/reviewdetails.view.modal.tab.html',
            controller: 'ReviewModelCtrl',
            controllerAs: 'RMC',
            resolve: {
                data: function() {
                    return data;
                },
                role: function() {
                    return role || arc.user.role;
                }
            }
        });
        modalInstance.result.then(function(data) {});
    };

    angular.extend(arc, {
        getUserReviewDetails: getUserReviewDetails,
        getTaskerReviewDetails: getTaskerReviewDetails,
        reviewsModal: reviewsModal
    });
};

function ReviewModelCtrl($scope, $rootScope, $state, MainService, routes, toastr, $uibModalInstance, data, role) {
    var rmc = this;
    rmc.reviewData = data;
    rmc.role = role;

    function ok() {
        $uibModalInstance.close(rmc);
    };

    function cancel() {
        $uibModalInstance.dismiss('cancel');
    };
    angular.extend(rmc, {
        ok: ok,
        cancel: cancel
    });
}
