angular.module('handyforall.categories').controller('editsubCategoryCtrl', editsubCategoryCtrl);

editsubCategoryCtrl.$inject = ['categoryEditReslove', 'CategoryService', 'toastr', '$state', '$stateParams', '$location', 'Slug'];

function editsubCategoryCtrl(categoryEditReslove, CategoryService, toastr, $state, $stateParams, $location, Slug) {
    var escatc = this;

    escatc.mainPagesList = categoryEditReslove[0];
    escatc.editCategoryData = {};
    escatc.editCategoryData.status = 1;
    escatc.editCategoryData.ratetype = 1;

    if (categoryEditReslove[1]) {
        escatc.editCategoryData = categoryEditReslove[1];
    }


    CategoryService.getSetting().then(function (response) {
        escatc.editsettingData = response[0].settings.site_url;
    })

    if ($stateParams.id) {
        escatc.action = 'edit';
        escatc.breadcrumb = 'SubMenu.EDIT_SUBCATEGORY';
    } else {
        escatc.action = 'add';
        escatc.breadcrumb = 'SubMenu.ADD_SUBCATEGORY';
    }
    escatc.disbledValue = false;
    escatc.submit = function submit(isValid, data) {
        if (isValid) {
            escatc.disbledValue = true;
            data.slug = Slug.slugify(data.slug);
            CategoryService.savesubcategory(data).then(function (response) {
                toastr.success('Category Added Successfully');
                $state.go('app.categories.subcategorylist', { page: $stateParams.page, items: $stateParams.items });
            }, function (err) {
                toastr.error('Unable to process your request');
            });
        } else {
            toastr.error('form is invalid');
        }

    };

}
