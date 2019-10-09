angular.module('handyforall.emailTemplate').controller('emailTemplateSaveCtrl', emailTemplateSaveCtrl);

emailTemplateSaveCtrl.$inject = ['emailTemplateEditResolve', 'toastr', 'EmailTemplateService', '$state', '$stateParams'];

function emailTemplateSaveCtrl(emailTemplateEditResolve, toastr, EmailTemplateService, $state, $stateParams) {
  var eetc = this;
  eetc.templateData = emailTemplateEditResolve[0] || {};
  eetc.templateData.dispatch_mail = true;

  if (eetc.templateData) {
    if (!eetc.templateData.dispatch_mail) {
      eetc.templateData.dispatch_mail = false;
    }
  }

  // console.log('<---------------->', eetc.templateData.dispatch_mail)

  if (eetc.templateData) {
    if (eetc.templateData.subscription == 1) {
      eetc.templateData.subscription = true;
    } else {
      eetc.templateData.subscription = false;
    }
  }
  eetc.checked = false;
  if ($stateParams.id) {
    eetc.checked = true;
    eetc.action = 'edit';
    eetc.breadcrumb = 'SubMenu.EMAILTEMPLATE_EDIT';
  } else {
    eetc.action = 'add';
    eetc.breadcrumb = 'SubMenu.EMAILTEMPLATE_ADD';
  }

  eetc.submitTemplateEditData = function submitTemplateEditData(isValid, data) {
    if (isValid) {
      // console.log(data)
      if (!data.dispatch_mail) {
        data.dispatch_mail = false;
      }

      if (data.subscription == true || data.subscription == 1) {
        data.subscription = 1;
      } else {
        data.subscription = 0;
      }

      EmailTemplateService.editTemplate(data).then(function (response) {
        if (eetc.action == 'edit') {
          var action = "edited";
        } else {
          var action = "added";
        }
        toastr.success('Template ' + action + ' successfully');
        $state.go('app.emailtemplate.list', { page: $stateParams.page, items: $stateParams.items });

      }, function (error) {
        toastr.error('Unable to process your request');
      });
    }
  };

}
