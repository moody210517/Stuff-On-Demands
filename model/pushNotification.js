module.exports = function (io) {

    var path = require('path');
    var db = require('../model/mongodb.js');
    var apn = require('apn');
    var gcm = require('node-gcm');

    return {
        sendPushnotification: function (regIds, message, action, type, urlval, app, callback) {
            var send_message = {};
            var data = {};
            send_message['message'] = message || '';
            send_message['action'] = action;

            if (urlval instanceof Array) {
                for (var i = 0; i < urlval.length; i++) {
                    send_message['key' + i] = urlval[i];
                    data['key' + i] = urlval[i];
                }
            } else {
                Object.keys(urlval).forEach(function (key, i) {
                    send_message['key' + i] = urlval[key];
                    data['key' + i] = urlval[key];
                });
            }

            var collection = '';
            if (app == 'PROVIDER') {
                collection = 'tasker';
                type = 'tasker';
            } else if (app == 'USER') {
                collection = 'users';
                type = 'user';
            }

            db.GetDocument('settings', { alias: 'mobile' }, {}, {}, function (err, docdata) {
                if (docdata) {
                    if (docdata[0].settings.apns.mode == 1) {
                        docdata[0].settings.apns.mode = true;
                    } else {
                        docdata[0].settings.apns.mode = false;
                    }
                    db.GetDocument(collection, { '_id': regIds }, {}, {}, function (pushErr, pushRespo) {
                        if (!pushErr && pushRespo[0]) {
                            var notification = {};
                            if (type == 'user') {
                                notification.user = regIds;
                            } else if (type == 'tasker') {
                                notification.tasker = regIds;
                            }
                            notification.type = type;
                            notification.message = send_message.message;
                            notification.raw_data = send_message;
                            db.InsertDocument('notifications', notification, function (err, upNotify) {
                                if (!err) {
                                    var username = pushRespo[0]._id;
                                    if (pushRespo[0].device_info) {
                                        if (pushRespo[0].device_info.device_token) {
                                            if (pushRespo[0].device_info.ios_notification_mode == 'apns') {
                                                var options = {};
                                                var topic = '';
                                                if (collection == 'users') {
                                                    options = { cert: docdata[0].settings.apns.user_pem, key: docdata[0].settings.apns.user_pem, production: docdata[0].settings.apns.mode };
                                                    topic = docdata[0].settings.apns.user_bundle_id;
                                                } else if (collection == 'tasker') {
                                                    options = { cert: docdata[0].settings.apns.tasker_pem, key: docdata[0].settings.apns.tasker_pem, production: docdata[0].settings.apns.mode };
                                                    topic = docdata[0].settings.apns.tasker_bundle_id;
                                                }

                                                var apnProvider = new apn.Provider(options);
                                                var deviceToken = pushRespo[0].device_info.device_token;
                                                var note = new apn.Notification();
                                                note.expiry = Math.floor(Date.now() / 1000) + 3600;
                                                note.sound = 'ping.aiff';
                                                note.alert = send_message.message;
                                                note.payload = send_message;
                                                note.topic = topic;
                                                note.threadId = docdata._id;
                                                apnProvider.send(note, deviceToken).then((result) => { });
                                            } else {
                                                io.of('/notify').in(regIds).emit('notification', { username: username, message: send_message });
                                            }
                                        }

                                        if (pushRespo[0].device_info.gcm) {
                                            // if (pushRespo[0].device_info.android_notification_mode == 'gcm') {
                                                var gcmid = {};
                                                if (collection == 'users') {
                                                    gcmid = docdata[0].settings.gcm.user;
                                                } else if (collection == 'tasker') {
                                                    gcmid = docdata[0].settings.gcm.tasker;
                                                }
                                                data.title = send_message.message;
                                                data.action = send_message.action;
                                                data.unique_id = upNotify._id;
                                                var message = new gcm.Message({ priority: 'high', data: { data: data } });
                                                var sender = new gcm.Sender(gcmid);
                                                var regTokens = [pushRespo[0].device_info.gcm];
                                                
                                                sender.send(message, { registrationTokens: regTokens }, function (err, response) {
                                                 });
                                            // } 
                                            // else {
                                                send_message.unique_id = upNotify._id;
                                                io.of('/notify').in(regIds).emit('notification', { username: username, message: send_message });
                                            // }
                                        }
                                        // send_message.unique_id = upNotify._id;
                                        io.of('/notify').in(regIds).emit('web notification', { username: username, message: send_message });
                                    }
                                    callback("err", "httpResponse", send_message);
                                }
                            });
                        }
                    });
                }
            });
        } ,


        sendUniquenotification: function (regIds, message, action, type, urlval, app, callback) {

            var send_message = {};
            var data = {};
            var uniqueid = Math.floor(100000 + Math.random() * 900000);
            send_message['message'] = message || '';
            send_message['action'] = action;
            send_message['unique_id'] = uniqueid;

            if (urlval instanceof Array) {
                for (var i = 0; i < urlval.length; i++) {
                    send_message['key' + i] = urlval[i];
                    data['key' + i] = urlval[i];
                }
            } else {
                Object.keys(urlval).forEach(function (key, i) {
                    send_message['key' + i] = urlval[key];
                    data['key' + i] = urlval[key];
                });
            }

            var collection = '';
            if (app == 'PROVIDER') {
                collection = 'tasker';
                type = 'tasker';
            } else if (app == 'USER') {
                collection = 'users';
                type = 'user';
            }

            db.GetDocument('settings', { alias: 'mobile' }, {}, {}, function (err, docdata) {
                if (docdata) {
                    if (docdata[0].settings.apns.mode == 1) {
                        docdata[0].settings.apns.mode = true;
                    } else {
                        docdata[0].settings.apns.mode = false;
                    }
                    db.GetDocument(collection, { '_id': regIds }, {}, {}, function (pushErr, pushRespo) {
                        if (!pushErr && pushRespo[0]) {
                            var notification = {};
                            if (type == 'user') {
                                notification.user = regIds;
                            } else if (type == 'tasker') {
                                notification.tasker = regIds;
                            }
                            notification.type = type;
                            notification.message = send_message.message;
                            notification.raw_data = send_message;
                                    var username = pushRespo[0]._id;
                                    if (pushRespo[0].device_info) {
                                        if (pushRespo[0].device_info.device_token) {
                                            if (pushRespo[0].device_info.ios_notification_mode == 'apns') {
                                                var options = {};
                                                var topic = '';
                                                if (collection == 'users') {
                                                    options = { cert: docdata[0].settings.apns.user_pem, key: docdata[0].settings.apns.user_pem, production: docdata[0].settings.apns.mode };
                                                    topic = docdata[0].settings.apns.user_bundle_id;
                                                } else if (collection == 'tasker') {
                                                    options = { cert: docdata[0].settings.apns.tasker_pem, key: docdata[0].settings.apns.tasker_pem, production: docdata[0].settings.apns.mode };
                                                    topic = docdata[0].settings.apns.tasker_bundle_id;
                                                }

                                                var apnProvider = new apn.Provider(options);
                                                var deviceToken = pushRespo[0].device_info.device_token;
                                                var note = new apn.Notification();
                                                note.expiry = Math.floor(Date.now() / 1000) + 3600;
                                                note.sound = 'ping.aiff';
                                                note.alert = send_message.message;
                                                note.payload = send_message;
                                                note.topic = topic;
                                                note.threadId = docdata._id;
                                                apnProvider.send(note, deviceToken).then((result) => { });
                                            } else {
                                                io.of('/notify').in(regIds).emit('notification', { username: username, message: send_message });
                                            }
                                        }

                                        if (pushRespo[0].device_info.gcm) {
                                            // if (pushRespo[0].device_info.android_notification_mode == 'gcm') {
                                                var gcmid = {};
                                                if (collection == 'users') {
                                                    gcmid = docdata[0].settings.gcm.user;
                                                } else if (collection == 'tasker') {
                                                    gcmid = docdata[0].settings.gcm.tasker;
                                                }
                                                data.title = send_message.message;
                                                data.action = send_message.action;
                                                data.unique_id = uniqueid;
                                                var message = new gcm.Message({ priority: 'high', data: { data: data } });
                                                var sender = new gcm.Sender(gcmid);
                                                var regTokens = [pushRespo[0].device_info.gcm];
                                                
                                                sender.send(message, { registrationTokens: regTokens }, function (err, response) {
                                                 });
                                            // } 
                                            // else {
                                                io.of('/notify').in(regIds).emit('notification', { username: username, message: send_message });
                                            // }
                                        }
                                        send_message.unique_id = uniqueid;
                                        io.of('/notify').in(regIds).emit('web notification', { username: username, message: send_message });
                                    }
                                    callback("err", "httpResponse", send_message);
                        }
                    });
                }
            });
        }
    };
};
