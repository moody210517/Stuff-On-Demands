var CONFIG = require('../config/config');
var async = require("async");
var mail = require('../model/mail.js');
var db = require('../model/mongodb.js');

function sendmail(data, callback) {
    async.waterfall([
        function (callback) {
            db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                if (err || !settings) { data.response = 'Configure your website settings'; res.send(data); }
                else { callback(err, settings); }
            });
        },
        function (settings, callback) {
            db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
                if (err || !settings) { data.response = 'Configure your website settings'; res.send(data); }
                else { callback(err, settings, currencies); }
            });
        },
        function (settings, currencies, callback) {

            db.GetDocument('emailtemplate', { name: data.template, 'status': { $ne: 0 } }, {}, {}, function (err, template) {
                if (err || !template) { data.response = 'Unable to get email template'; res.send(data); }
                else { callback(err, settings, currencies, template); }
            });
        }
    ],
        function (err, settings, currencies, template) {
            if (template[0].dispatch_mail) {
                var html = template[0].email_content;
                html = html.replace(/{{privacy}}/g, settings.settings.site_url + 'page/privacypolicy');
                html = html.replace(/{{terms}}/g, settings.settings.site_url + 'page/termsandconditions');
                html = html.replace(/{{contactus}}/g, settings.settings.site_url + 'contact_us');
                html = html.replace(/{{senderemail}}/g, template[0].sender_email);
                html = html.replace(/{{sendername}}/g, template[0].sender_name);
                html = html.replace(/{{logo}}/g, settings.settings.site_url + 'uploads/images/others/logo.png');
                html = html.replace(/{{backgroundlogo}}/g, settings.settings.site_url + 'uploads/images/others/backgroundlogo.png');
                html = html.replace(/{{facebook}}/g, settings.settings.site_url + 'uploads/images/others/facebook.png');
                html = html.replace(/{{twitter}}/g, settings.settings.site_url + 'uploads/images/others/twitter.png');
                html = html.replace(/{{linkedin}}/g, settings.settings.site_url + 'uploads/images/others/linkedin.png');
    
                html = html.replace(/{{appstore}}/g, settings.settings.site_url + 'uploads/images/others/appstore.png');
                html = html.replace(/{{playstore}}/g, settings.settings.site_url + 'uploads/images/others/playstore.png');

                html = html.replace(/{{facebook_url}}/g, 'https://www.facebook.com');
                html = html.replace(/{{twitter_url}}/g, 'https://twitter.com');
                html = html.replace(/{{linkedin_url}}/g, 'https://in.linkedin.com');


                html = html.replace(/{{appstore_user}}/g, 'https://apps.apple.com/in/app/handy-for-all/id1157981852');
                html = html.replace(/{{appstore_tasker}}/g, 'https://apps.apple.com/us/app/handy-for-all-experts/id1157981860');
                html = html.replace(/{{playstore_user}}/g, 'https://play.google.com/store/apps/details?id=com.maidac&hl=en');
                html = html.replace(/{{playstore_tasker}}/g, 'https://play.google.com/store/apps/details?id=com.maidacpartner');

                html = html.replace(/{{site_title}}/g, settings.settings.site_title);
                html = html.replace(/{{site_url}}/g, settings.settings.site_url);
                html = html.replace(/{{referral}}/g, currencies.symbol +' '+ settings.settings.referral.amount.referral);
                html = html.replace(/{{referrer}}/g, currencies.symbol +' '+ settings.settings.referral.amount.referrer);
                html = html.replace(/{{email_title}}/g, settings.settings.site_title);
                html = html.replace(/{{email_address}}/g, settings.settings.email_address);

                for (i = 0; i < data.html.length; i++) {
                    var regExp = new RegExp('{{' + data.html[i].name + '}}', 'g');
                    html = html.replace(regExp, data.html[i].value);
                }

                if (data.to) {
                    var tomail = data.to;
                } else {
                    var tomail = template[0].sender_email;
                }

                var mailOptions = {
                    from: template[0].sender_name + " <" + settings.settings.email_address + ">",
                    to: tomail,
                    cc: settings.settings.email_address,
                    subject: template[0].email_subject,
                    text: template[0].email_subject,
                    html: html
                };

                mail.send(mailOptions, function (err, response) { callback(err, response); });
            } else {
                callback(null, { 'message': 'Email Template Turned Off' });
            }

        });
}

module.exports = {
    "sendmail": sendmail
};
