angular.module('handyforall.coupons').controller('couponsListCtrl', couponsListCtrl);
couponsListCtrl.$inject = ['CouponService', 'CouponServiceResolve', 'CurrencyResolve', '$scope'];

function couponsListCtrl(CouponService, CouponServiceResolve, CurrencyResolve, $scope) {
    var tlc = this;
    tlc.permission = $scope.privileges.filter(function (menu) {
        return (menu.alias === "coupons");
    }).map(function (menu) {
        return menu.status;
    })[0];
    var layout = [
        {
            name: 'Name',
            variable: 'name',
            template: '{{content.name}}',
            sort: 1
        },
        {
            name: 'Amount / Percentage',
            template:
            '<span  ng-if="content.discount_type == \'Flat\'">{{options.currency}}</span>' +
            '{{content.amount_percentage}}' +
            '<span  ng-if="content.discount_type == \'Percentage\'">%</span>' +
            '</span>'

        },
        {
            name: ' Discount Type',
            template: '{{content.discount_type}}'
        },
        {
            name: 'Coupon Code',
            template: '{{content.code}}'
        },
        {
            name: 'Status ',
            template:
            '<span  ng-switch="content.status">' +
            '<span  ng-switch-when="1">Publish</span>' +
            '<span  ng-switch-when="2">UnPublish</span>' +
            '<span  ng-switch-when="3">Pending</span>' +
            '</span>'
        },
        {
            name: 'Actions',
            template: '<button class="btn btn-info btn-rounded btn-ef btn-ef-5 btn-ef-5b" ng-if="options.permission.edit != false" ui-sref=app.coupons.action({action:"edit",id:content._id})><i class="fa fa-edit"></i> <span>Edit</span></button>' +
            '<button class="btn btn-danger btn-rounded btn-ef btn-ef-5 btn-ef-5b" ng-if="options.permission.delete != false" ng-click="CCC.openDeleteModal(small, content, options)" ><i class="fa fa-trash"></i> <span>Delete</span></button>'
        }
    ];

    tlc.table = {};
    tlc.table.layout = layout;
    tlc.table.data = CouponServiceResolve[0];
    tlc.table.count = CouponServiceResolve[1] || 0;
    tlc.table.delete = {
        currency: CurrencyResolve.symbol,
        permission: tlc.permission,
        service: '/coupons/deletecoupon',
        getData: function (currentPage, itemsPerPage, sort, status, search) {
            var skip = (parseInt(currentPage) - 1) * itemsPerPage;
            CouponService.list(itemsPerPage, skip, sort, status, search).then(function (respo) {
                tlc.table.data = respo[0];
                tlc.table.count = respo[1];

            });
        }
    };

}
