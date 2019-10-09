angular.module('handyforall.sliders').controller('editSliderCtrl', editSliderCtrl);

editSliderCtrl.$inject = ['sliderEditReslove', 'SliderService', 'toastr', '$state', '$stateParams'];

function editSliderCtrl(sliderEditReslove, SliderService, toastr, $state, $stateParams) {
    var edsc = this;
    edsc.editSliderData = sliderEditReslove[0];
    edsc.requiredValue = true;
    if ($stateParams.id) {
        edsc.action = 'edit';
        edsc.breadcrumb = 'SubMenu.EDIT_SLIDER';
        edsc.requiredValue = false;
    } else {
        edsc.action = 'add';
        edsc.requiredValue = true;
        edsc.breadcrumb = 'SubMenu.ADD_SLIDER';
    }


    SliderService.getSliderList().then(function (respo) {

        edsc.sliderListCount = respo[1];       
        if ($stateParams.id) {
            edsc.submit = function submit(isValid) {
                if (isValid) {
                    SliderService.save(edsc.editSliderData).then(function (response) {
                        toastr.success('Slider Added Successfully');
                        $state.go('app.sliders.viewsSlider');
                    }, function (err) {
                        toastr.error('Unable to process your request');
                    });
                } else {
                    toastr.error('form is invalid');
                }
            };
        } else {
             
            if(edsc.sliderListCount<1){
            edsc.submit = function submit(isValid) {
                if (isValid) {
                    SliderService.save(edsc.editSliderData).then(function (response) {
                        toastr.success('Slider Added Successfully');
                        $state.go('app.sliders.viewsSlider');
                    }, function (err) {
                        toastr.error('Unable to process your request');
                    });
                } else {
                    toastr.error('form is invalid');
                }

            };
          }else{
             toastr.error('Unable to process your request You can Add maximum 1 Slider');
             $state.go('app.sliders.viewsSlider');
          }
        }
    });
}
