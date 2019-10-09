angular.module('handyforall.images').controller('editImagesCtrl', editImagesCtrl);

editImagesCtrl.$inject = ['imagesEditReslove', 'ImagesService', 'toastr', '$state'];

function editImagesCtrl(imagesEditReslove, ImagesService, toastr, $state) {
    var edic = this;
    edic.editImagesData = imagesEditReslove[0];
    edic.id = $state.params.id;

    if (edic.id) {
        edic.role = 'Edit';
    }
    else {
        edic.role = 'New';
    }

    edic.submit = function submit(isValid) {
        if (isValid) {
            ImagesService.save(edic.editImagesData).then(function (response) {
                toastr.success('Appearance Settings Update Successfully');
                $state.go('app.images.imagelist');
            }, function (err) {
                toastr.error('Unable to process your request');
            });
        } else {
            toastr.error('form is invalid');
        }
    };



}
