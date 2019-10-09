angular.module('handyforall.messages').controller('messagesCtrl', messagesCtrl);

messagesCtrl.$inject = ['MessageserviceResolve', 'MessageService', 'CurrentuserResolve', '$uibModal', 'toastr', '$translate', 'swal'];

function messagesCtrl(MessageserviceResolve, MessageService, CurrentuserResolve, $uibModal, toastr, $translate, swal) {
    var msg = this;
    msg.messages = MessageserviceResolve.messages;
    msg.msgtotalItem = MessageserviceResolve.count.length;
    msg.currentPage = 1;
    msg.msgitemsPerPage = 2;
    msg.sno = 1;

    msg.messages1 = msg.messages.filter(function(value) {
        if (value.task) {
            return value;
        }
    }).map(function(value) {
        return value;
    });

    msg.currentusertype = CurrentuserResolve.user_type;
    msg.currentuserid = CurrentuserResolve.user_id;

    msg.deletemessage = function(taskid, userid, taskerid, currentpage) {
        var ids = {};
        ids.taskid = taskid;
        ids.userid = userid;
        ids.taskerid = taskerid;

        swal({
            title: 'Delete Conversation',
            text: 'Are you sure you want to delete this conversation?',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Delete!'
        }).then(function(response) {
            if (response) {
                MessageService.deleteConversation(ids, msg.currentusertype).then(function(response) {
                    $translate('MESSAGE DELETED SUCCESSFULLY').then(function(headline) { toastr.success(headline); }, function(translationId) { toastr.success(headline); });
                    MessageService.getMessage(msg.currentuserid, msg.currentusertype, 0, 3).then(function(response) {
                        msg.messages = response.messages;
                        msg.messages1 = msg.messages.filter(function(value) {
                            if (value.task) {
                                return value;
                            }
                        }).map(function(value) {
                            return value;
                        });
                        msg.getMessage(currentpage);
                    }, function() {

                    });
                });
            }
        }).catch(function(err) {
            // console.error('err - ',err);
        });
    };


    msg.msgitemsPerPage = 3;
    msg.getMessage = function getMessage(page) {       
        if(page != 1){
            msg.sno = (page * 3) - 2;
        }else{
            msg.sno = page;
        }
        MessageService.getMessage(msg.currentuserid, msg.currentusertype, page, msg.msgitemsPerPage).then(function(response) {
            if (response) {
                msg.messages = response.messages;
                msg.msgtotalItem = response.count.length;
                msg.messages1 = msg.messages.filter(function(value) {
                    if (value.task) {
                        return value;
                    }
                }).map(function(value) {
                    return value;
                });
            }
        });
    }



}

angular.module('handyforall.messages').controller('deletemessageCtrl', function($uibModalInstance, idinfo) {
    var dacm = this;
    idinfo.from = idinfo.from;
    idinfo.to = idinfo.to;

    dacm.ok = function() {
        $uibModalInstance.close(idinfo);
    };

    dacm.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };

});