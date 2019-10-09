module.exports = function (io) {

    var db = require('../model/mongodb.js');
    var async = require('async');
    var CONFIG = require('../config/config');
    var push = require('../model/pushNotification.js')(io);
    var mail = require('../model/mail.js');
    var mailcontent = require('../model/mailcontent.js');
    var moment = require("moment");
    var timezone = require('moment-timezone');

    function updateAvailability(data, callback) {
        db.UpdateDocument('tasker', { _id: data.tasker }, { availability: data.availability }, function (error, tasker) {

            var notifications = { 'provider_id': data.tasker, 'status': data.availability };
            var message = "Availability Updated";

            push.sendUniquenotification(data.tasker, message, 'availability_status', 'ANDROID', notifications, 'PROVIDER', function (err, response, body) { });

            // io.of('/notify').in(data.tasker).emit('availability status', { status: data.availability });
            callback(error, tasker);
        });
    }

    function taskerRegister(dat, callback) {
        var data = {}; 
        db.InsertDocument('tasker', dat, function (err, result) {
            if (err) {
                data.response = 'Unable save your data';
                callback(data);
            } else {
                async.waterfall([
                    function (callback) {
                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                            if (err || !settings) { data.response = 'Configure your website settings'; callback(data); }
                            else { callback(err, settings.settings); }
                        });
                    }
                ], function (err, settings) {

                    var mailData = {};
                    mailData.template = 'Taskersignupmessagetotasker';
                    mailData.to = result.email;
                    mailData.html = [];
                    mailData.html.push({ name: 'taskername', value: result.username });
                    mailData.html.push({ name: 'email', value: result.email });

                    mailcontent.sendmail(mailData, function (err, response) { });

                    callback(err, result);

                });
            }
        });
    }

    return {
        updateAvailability: updateAvailability,
        taskerRegister: taskerRegister
    };
};
