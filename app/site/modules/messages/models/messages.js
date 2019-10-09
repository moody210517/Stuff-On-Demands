var app = angular.module('handyforall.messages');
app.factory('MessageService', MessageService);
function MessageService($http, $q) {
    var MessageService = {
        saveChat: saveChat,
        getMessage: getMessage,
        deletemessage: deletemessage,
        chatHistory: chatHistory,
        deleteConversation: deleteConversation
    };
    return MessageService;

    function deletemessage(categoryinfo) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/chat/deletemessage',
            data: categoryinfo
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }
    function saveChat(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/chat/save',
            data: data,
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function getMessage(currentuserid, currentusertype, page, itemsPerPage) {
        var deferred = $q.defer();
        var skip = 0;
        if (page > 1) {
            skip = (parseInt(page) - 1) * itemsPerPage;
        }
        $http({
            method: 'POST',
            url: '/site/chat/getmessage',
            data: { 'userId': currentuserid, 'currentusertype': currentusertype, skip: skip, limit: itemsPerPage }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function chatHistory(data) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/chat/chathistory',
            data: data
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    function deleteConversation(chatinfo, usertype) {
        var deferred = $q.defer();
        $http({
            method: 'POST',
            url: '/site/chat/deleteConversation',
            data: { 'chatinfo': chatinfo, 'usertype': usertype }
        }).then(function (data) {
            deferred.resolve(data.data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }
}
