angular.module('handyforall.pages').controller('categoryPageCtrl', categoryPageCtrl);
categoryPageCtrl.$inject = ['PageService','PageCategoryEditResolve' ,'toastr','$stateParams','PageCategoryResolve','$state'];
function categoryPageCtrl(PageService,PageCategoryEditResolve,toastr , $stateParams,PageCategoryResolve,$state) {

  var cpc = this;

  if($stateParams.name)
  {
    cpc.breadcrumb = 'Edit Category'
   cpc.categoryPage = PageCategoryEditResolve.settings[0];
   cpc.categoryPagename = PageCategoryEditResolve.settings[0].name;
   if(cpc.categoryPagename)
   {
     cpc.categoryPagename = true;
   }
   else{
     cpc.categoryPagename = false;
   }
 }else{
   cpc.breadcrumb = 'Add Category'

 }

  PageService.getPageSetting().then(function (respo) {
    cpc.categoryPagecount = respo.settings.length;
        if($stateParams.name)
        {
          cpc.submitcategoryPage = function submitcategoryPage(isValid,data) {
            // console.log("isValid---------------",isValid);
            if(isValid)
            {
               PageService.submitsubcategoryPage(data).then(function (response) {
               toastr.success('categoryPage Added Successfully');
               $state.go('app.pages.categoryPageList');
            })
            }
            else
            {
               toastr.error('form is invalid');
            }

         }
       }
       else
       {
         if(cpc.categoryPagecount >= 2)
           {
              toastr.error('Maximum Count for categoryPage is 2, More categoryPage Cannot be Added');
               $state.go('app.pages.categoryPageList');

           }
           else
           {
               cpc.submitcategoryPage = function submitcategoryPage(isValid,data) {
                if(isValid)
                {
                   PageService.submitsubcategoryPage(data).then(function (response) {
                    toastr.success('categoryPage Added Successfully');
                    $state.go('app.pages.categoryPageList');
                })
                }
                else
                {
                  toastr.error('form is invalid');
                }

            }
           }
       }
  })

 }
