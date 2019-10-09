module.exports = function () {

    var db = require('../../model/mongodb.js');
    var async = require('async');
    var mailcontent = require('../../model/mailcontent.js');

    var controller = {};

    controller.save = function (req, res) {
        var data = {};
        data.name = req.body.username;
        data.email = req.body.email;
        data.mobile = req.body.mobile;
        data.subject = req.body.subject;
        data.message = req.body.message;
        if (req.body._id) {
            db.UpdateDocument('contact', { _id: { $in: req.body._id } }, data, function (err, result) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(result);
                }
            });
        } else {
            data.status = req.body.status;
            db.InsertDocument('contact', data, function (err, result) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(result);
                }
            });
        }
        async.waterfall([
            function (callback) {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    if (err || !settings) { data.response = 'Configure your website settings'; res.send(data); }
                    else { callback(err, settings.settings); }
                });
            },
            function (settings, callback) {
                db.GetDocument('emailtemplate', { name: { $in: ['contactusmessagetosender', 'Contactusmessagetoadmin'] }, 'status': { $eq: 1 } }, {}, {}, function (err, template) {
                    if (err || !template) { data.response = 'Unable to get email template'; res.send(data); }
                    else { callback(err, settings, template); }
                });
            }
        ], function (err, settings, template) {
            /*var mailData = {};
            mailData.template = 'Contactusmessagetoadmin';
            mailData.to = settings.email_address;
            mailData.html = [];
            mailData.html.push({ name: 'username', value: data.name });
            mailData.html.push({ name: 'message', value: data.message });
            mailData.html.push({ name: 'subject', value: data.subject });
            mailData.html.push({ name: 'contactemail', value: data.email });
            mailData.html.push({ name: 'senderemail', value: template[1].sender_email });
            mailData.html.push({ name: 'mobile', value: data.mobile });
            mailData.html.push({ name: 'site_title', value: settings.site_title });
            mailData.html.push({ name: 'logo', value: settings.logo });
            mailData.html.push({ name: 'site_url', value: settings.site_url });
            mailData.html.push({ name: 'privacy', value: settings.site_url + 'pages/privacypolicy' });
            mailData.html.push({ name: 'terms', value: settings.site_url + '/pages/termsandconditions' });
            mailcontent.sendmail(mailData, function (err, response) {
            });
            var mailData1 = {};
            mailData1.template = 'contactusmessagetosender';
            mailData1.to = data.email;
            mailData1.html = [];
            mailData1.html.push({ name: 'username', value: data.name });
            mailData1.html.push({ name: 'message', value: data.message });
            mailData1.html.push({ name: 'subject', value: data.subject });
            mailData1.html.push({ name: 'contactemail', value: data.email });
            mailData1.html.push({ name: 'senderemail', value: template[1].sender_email });
            mailData1.html.push({ name: 'mobile', value: data.mobile });
            mailData1.html.push({ name: 'site_title', value: settings.site_title });
            mailData1.html.push({ name: 'logo', value: settings.logo });
            mailData1.html.push({ name: 'site_url', value: settings.site_url });
            mailData1.html.push({ name: 'privacy', value: settings.site_url + 'pages/privacypolicy' });
            mailData1.html.push({ name: 'terms', value: settings.site_url + '/pages/termsandconditions' });
            mailcontent.sendmail(mailData1, function (err, response) {
            });*/
        })

    }

    return controller;
}
