angular.module('handyforall.category').controller('categoryCtrl', categoryCtrl);

categoryCtrl.$inject = ['$scope', '$rootScope', '$location', '$stateParams', 'CategoryserviceResolve', 'CategoryService', '$state', '$translate', 'ngMeta', '$cookieStore'];
function categoryCtrl($scope, $rootScope, $location, $stateParams, CategoryserviceResolve, CategoryService, $state, $translate, ngMeta, $cookieStore) {
	var cac = this;
	cac.data = CategoryserviceResolve;
	cac.itemsPerPage = 6;
	cac.currentPage = 1;
	cac.totalItems = 0;
	var ca = $cookieStore.get('text');
	if (ca) {
		$cookieStore.remove('text');
	}
	cac.categoryDatails = cac.data.response.ActiveCategory.parentcategory;
	cac.subcategory = cac.data.response.ActiveCategory.subcategory;
	cac.totalItems = cac.data.response.ActiveCategory.totalsubcategory;

	if (cac.categoryDatails.name) {
		ngMeta.setTitle(cac.categoryDatails.seo.title);
		ngMeta.setTag('description', cac.categoryDatails.seo.description);
		ngMeta.setTag('keyword', cac.categoryDatails.seo.keyword);
	}

	cac.getSubcategoryResponse = true;

	cac.getSubcategory = function () {
		cac.subcategory = [];
		if (angular.isDefined(cac.categoryDatails._id)) {
			cac.getSubcategoryResponse = false;
			CategoryService.getcategory(cac.categoryDatails.slug, cac.currentPage, cac.itemsPerPage).then(function (data) {
				if (data.response.ActiveCategory.subcategory.length > 0) {
					cac.subcategory = data.response.ActiveCategory.subcategory;
					cac.totalItems = data.response.ActiveCategory.totalsubcategory;
				}
			}, function (error) {
			});
		}
	};
}
