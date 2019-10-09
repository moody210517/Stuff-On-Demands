module.exports = function (io) {


    var db = require('../model/mongodb.js');
    var async = require('async');
    var CONFIG = require('../config/config');
    var push = require('../model/pushNotification.js')(io);
    var mailcontent = require('../model/mailcontent.js');
    var moment = require("moment");
    var timezone = require('moment-timezone');
    var pdf = require('html-pdf');
    var mail = require('../model/mail.js');

    function taskPayment(data, callback) {
        var transactionup = {};
        var docdata = {};
        var history = {};

        var options = {};
        options.populate = 'tasker user task';
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settingsdata) {
            if (err || !settingsdata) {
                callback(err, null);
            } else {
                db.GetOneDocument('transaction', { _id: data.transaction }, {}, options, function (err, transaction) {
                    if (err || !transaction) {
                        callback(err, null);
                    } else {

                        db.GetOneDocument('task', { _id: transaction.task._id }, {}, {}, function (err, taskdata) {
                            if (err) {
                                callback(err, null);
                            }
                            else {
                                var paymenttype;
                                if (taskdata) {
                                    if (taskdata.payment_type == "wallet-other") {
                                        paymenttype = "wallet-" + transaction.type;
                                    }
                                    else {
                                        paymenttype = transaction.type;
                                    }
                                }


                                var task = transaction.task;
                                var user = transaction.user;
                                var tasker = transaction.tasker;

                                var dataToUpdate = {};
                                dataToUpdate.status = 7;
                                dataToUpdate.invoice = task.invoice;
                                dataToUpdate.invoice.status = 1;
                                dataToUpdate.payee_status = 0;
                                dataToUpdate.invoice.amount.balance_amount = parseFloat(task.invoice.amount.balance_amount) - parseFloat(task.invoice.amount.balance_amount);
                                dataToUpdate.payment_type = paymenttype;
                                dataToUpdate.history = task.history;
                                var formatedDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
                                var time = timezone.tz(formatedDate, settingsdata.settings.time_zone);
                                dataToUpdate.history.job_closed_time = time;
                                //dataToUpdate.history.job_closed_time = new Date();
                                var transactionsData = [{
                                    'gateway_response': data.gateway_response
                                }];
                                async.parallel({
                                    transaction: function (callback) {
                                        db.UpdateDocument('transaction', { '_id': transaction._id }, { 'transactions': transactionsData }, {}, function (err, transaction) {
                                            callback(err, transaction);
                                        });
                                    },
                                    task: function (callback) {
                                        db.UpdateDocument('task', { _id: task._id }, dataToUpdate, function (err, task) {
                                            callback(err, task);
                                        });
                                    },
                                    settings: function (callback) {
                                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                            callback(err, settings.settings);
                                        });
                                    },
                                    currencies: function (callback) {
                                        db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
                                            callback(err, currencies);
                                        });
                                    },


                                }, function (err, result) {
                                    if (err || !result.settings || !result.currencies || result.transaction.nModified == 0 || result.task.nModified == 0) {

                                        callback(err, null);
                                    } else {
                                        db.GetDocument('emailtemplate', { name: { $in: ['PaymentDetailstoUser', 'PaymentDetailstoTasker'] }, 'status': { $ne: 0 } }, {}, {}, function (err, template) {
                                            if (err) {
                                                callback(err, null);
                                            }
                                            else {
                                                task.payment_type = dataToUpdate.payment_type;
                                                var settings = result.settings;
                                                var currencies = result.currencies;

                                                var MaterialFee, CouponCode, BookingDate, BookedDateTime, StartDateTime, CompleteDateTime, PaymentMode;

                                                if (task.invoice.amount.extra_amount) {
                                                    MaterialFee = (task.invoice.amount.extra_amount).toFixed(2);
                                                } else {
                                                    MaterialFee = '0.00';
                                                }
                                                if (task.invoice.amount.coupon) {
                                                    CouponCode = currencies.symbol + (task.invoice.amount.coupon).toFixed(2);
                                                } else {
                                                    CouponCode = 'Not assigned';
                                                }

                                                BookingDate = moment(task.history.booking_date).format('DD/MM/YYYY');

                                                CurrentDate = moment(new Date()).format('DD/MM/YYYY');
                                                BookedDateTime = moment(task.history.job_booking_time).format('DD/MM/YYYY');
                                                StartDateTime = moment(task.history.job_started_time).format('DD/MM/YYYY');
                                                CompleteDateTime = moment(task.history.job_completed_time).format('DD/MM/YYYY');
                                                
                                                if(template[0].name == 'PaymentDetailstoUser') {
                                                    var html1 = template[0].email_content;
                                                } else {
                                                    var html1 = template[1].email_content;
                                                }

                                                if(task.payment_type == 'stripe') {
                                                    PaymentMode = 'Card';
                                                } 

                                                if(task.invoice.amount.coupon) {
                                                    html1 = html1.replace(/{{showcoupon}}/g, 'true');
                                                } else {
                                                    html1 = html1.replace(/{{showcoupon}}/g, 'none');
                                                }

                                                if(task.invoice.amount.extra_amount) {
                                                    html1 = html1.replace(/{{showmatfee}}/g, 'true');
                                                } else {
                                                    html1 = html1.replace(/{{showmatfee}}/g, 'none');
                                                }

                                                if(task.task_description) {
                                                    html1 = html1.replace(/{{showdesc}}/g, 'true');
                                                } else {
                                                    html1 = html1.replace(/{{showdesc}}/g, 'none');
                                                }

                                                if(task.invoice.amount.coupon && task.invoice.amount.extra_amount) {
                                                    html1 = html1.replace(/{{totalamount}}/g, currencies.symbol + ' ' + (task.invoice.amount.total + task.invoice.amount.extra_amount + task.invoice.amount.service_tax - task.invoice.amount.coupon).toFixed(2));
                                                } else if(task.invoice.amount.coupon && !task.invoice.amount.extra_amount) {
                                                    html1 = html1.replace(/{{totalamount}}/g, currencies.symbol + ' ' + (task.invoice.amount.total + task.invoice.amount.service_tax - task.invoice.amount.coupon).toFixed(2));
                                                } else if(!task.invoice.amount.coupon && task.invoice.amount.extra_amount) {
                                                    html1 = html1.replace(/{{totalamount}}/g, currencies.symbol + ' ' + (task.invoice.amount.total + task.invoice.amount.extra_amount + task.invoice.amount.service_tax).toFixed(2));
                                                } else {
                                                    html1 = html1.replace(/{{totalamount}}/g, currencies.symbol + ' ' + (task.invoice.amount.total + task.invoice.amount.service_tax).toFixed(2));
                                                }

                                                html1 = html1.replace(/{{privacy}}/g, settings.site_url + 'page/privacypolicy');
                                                html1 = html1.replace(/{{terms}}/g, settings.site_url + 'page/termsandconditions');
                                                html1 = html1.replace(/{{contactus}}/g, settings.site_url + 'contact_us');
                                                html1 = html1.replace(/{{logo}}/g, settings.site_url + 'uploads/images/others/logo.png');
                                                html1 = html1.replace(/{{backgroundlogo}}/g, settings.site_url + 'uploads/images/others/backgroundlogo.png');
                                                html1 = html1.replace(/{{facebook}}/g, settings.site_url + 'uploads/images/others/facebook.png');
                                                html1 = html1.replace(/{{twitter}}/g, settings.site_url + 'uploads/images/others/twitter.png');
                                                html1 = html1.replace(/{{linkedin}}/g, settings.site_url + 'uploads/images/others/linkedin.png');
                                    
                                                html1 = html1.replace(/{{appstore}}/g, settings.site_url + 'uploads/images/others/appstore.png');
                                                html1 = html1.replace(/{{playstore}}/g, settings.site_url + 'uploads/images/others/playstore.png');

                                                html1 = html1.replace(/{{facebook_url}}/g, 'https://www.facebook.com');
                                                html1 = html1.replace(/{{twitter_url}}/g, 'https://twitter.com');
                                                html1 = html1.replace(/{{linkedin_url}}/g, 'https://in.linkedin.com');


                                                html1 = html1.replace(/{{appstore_user}}/g, 'https://apps.apple.com/in/app/handy-for-all/id1157981852');
                                                html1 = html1.replace(/{{appstore_tasker}}/g, 'https://apps.apple.com/us/app/handy-for-all-experts/id1157981860');
                                                html1 = html1.replace(/{{playstore_user}}/g, 'https://play.google.com/store/apps/details?id=com.maidac&hl=en');
                                                html1 = html1.replace(/{{playstore_tasker}}/g, 'https://play.google.com/store/apps/details?id=com.maidacpartner');

                                                html1 = html1.replace(/{{site_title}}/g, settings.site_title);
                                                html1 = html1.replace(/{{site_url}}/g, settings.site_url);
                                                html1 = html1.replace(/{{referral}}/g, currencies.symbol +' '+ settings.referral.amount.referral);
                                                html1 = html1.replace(/{{referrer}}/g, currencies.symbol +' '+ settings.referral.amount.referrer);
                                                html1 = html1.replace(/{{email_title}}/g, settings.site_title);
                                                html1 = html1.replace(/{{email_address}}/g, settings.email_address);
                                                

                                                html1 = html1.replace(/{{t_username}}/g, tasker.username);
                                                html1 = html1.replace(/{{bookingid}}/g, task.booking_id);
                                                html1 = html1.replace(/{{u_username}}/g, user.username);
                                                html1 = html1.replace(/{{address}}/g, task.service_address || ' ');
                                                html1 = html1.replace(/{{u_email}}/g, user.email);
                                                html1 = html1.replace(/{{code}}/g, user.phone.code);
                                                html1 = html1.replace(/{{number}}/g, user.phone.number);
                                                html1 = html1.replace(/{{currentdate}}/g, CurrentDate);
                                                html1 = html1.replace(/{{bookeddatetime}}/g, BookedDateTime);
                                                html1 = html1.replace(/{{startdatetime}}/g, StartDateTime);
                                                html1 = html1.replace(/{{completedatetime}}/g, CompleteDateTime);
                                                html1 = html1.replace(/{{description}}/g, task.task_description);
                                                

                                                html1 = html1.replace(/{{categoryname}}/g, task.booking_information.work_type);
                                                html1 = html1.replace(/{{hourlyrates}}/g, currencies.symbol + ' ' + (task.hourly_rate).toFixed(2));
                                                html1 = html1.replace(/{{hourlyrate}}/g, currencies.symbol + ' ' + (task.invoice.amount.minimum_cost).toFixed(2));
                                                html1 = html1.replace(/{{totalhour}}/g, task.invoice.worked_hours_human);
                                                
                                                html1 = html1.replace(/{{total}}/g, currencies.symbol + ' ' + (task.invoice.amount.total).toFixed(2));
                                                html1 = html1.replace(/{{amount}}/g, currencies.symbol + ' ' + (task.invoice.amount.grand_total - task.invoice.amount.admin_commission).toFixed(2));
                                                html1 = html1.replace(/{{couponamount}}/g, CouponCode);
                                                html1 = html1.replace(/{{extraamount}}/g, currencies.symbol + ' ' + MaterialFee);
                                                html1 = html1.replace(/{{actualamount}}/g, currencies.symbol + ' ' + (task.invoice.amount.total - task.invoice.amount.grand_total).toFixed(2));
            
                                                html1 = html1.replace(/{{Servicetax}}/g, currencies.symbol + task.invoice.amount.service_tax.toFixed(2));
                                                html1 = html1.replace(/{{mode}}/g, PaymentMode);

                                                var options = {
                                                   height: "396mm", // allowed units: mm, cm, in, px
                                                   width: "280mm",
                                                   paginationOffset: 1,
                                                   border: {
                                                       "top": "0.5cm", // default is 0, units: mm, cm, in, px
                                                       "bottom": "0.5cm",
                                                   }
                                               };
                                                var pdfname1 = new Date().getTime();

                                                var attachment_name = task.booking_id.substr(4, 9);

                                                pdf.create(html1, options).toFile('./uploads/invoice/' + pdfname1 + '.pdf', function (err, document) {
                                                    if (err) {
                                                        callback(err, null);
                                                    } else {

                                                        var mailOptions1 = {
                                                            to: user.email,
                                                            subject: template[0].email_subject,
                                                            text: "Please Download the attachment to see your Invoice details",
                                                            html: '<b>Please Download the attachment to see your Invoice details</b>',
                                                            attachments: [{
                                                                filename: 'Reciept - '+ attachment_name +'.pdf',
                                                                path: './uploads/invoice/' + pdfname1 + '.pdf',
                                                                contentType: 'application/pdf'
                                                            }],
                                                        };
                                                    }

                                                    mail.send(mailOptions1, function (err, response) {
                                                    });
                                                });

                                                if(template[0].name == 'PaymentDetailstoTasker') {
                                                    var html2 = template[0].email_content;
                                                } else {
                                                    var html2 = template[1].email_content;
                                                }

                                                if(task.invoice.amount.extra_amount) {
                                                    html2 = html2.replace(/{{showmatfee}}/g, 'true');
                                                } else {
                                                    html2 = html2.replace(/{{showmatfee}}/g, 'none');
                                                }

                                                if(task.task_description) {
                                                    html2 = html2.replace(/{{showdesc}}/g, 'true');
                                                } else {
                                                    html2 = html2.replace(/{{showdesc}}/g, 'none');
                                                }

                                                if(task.payment_type == 'stripe') {
                                                    PaymentMode = 'Card';
                                                }

                                                html2 = html2.replace(/{{privacy}}/g, settings.site_url + 'page/privacypolicy');
                                                html2 = html2.replace(/{{terms}}/g, settings.site_url + 'page/termsandconditions');
                                                html2 = html2.replace(/{{contactus}}/g, settings.site_url + 'contact_us');
                                                html2 = html2.replace(/{{logo}}/g, settings.site_url + 'uploads/images/others/logo.png');
                                                html2 = html2.replace(/{{backgroundlogo}}/g, settings.site_url + 'uploads/images/others/backgroundlogo.png');
                                                html2 = html2.replace(/{{facebook}}/g, settings.site_url + 'uploads/images/others/facebook.png');
                                                html2 = html2.replace(/{{twitter}}/g, settings.site_url + 'uploads/images/others/twitter.png');
                                                html2 = html2.replace(/{{linkedin}}/g, settings.site_url + 'uploads/images/others/linkedin.png');
                                    
                                                html2 = html2.replace(/{{appstore}}/g, settings.site_url + 'uploads/images/others/appstore.png');
                                                html2 = html2.replace(/{{playstore}}/g, settings.site_url + 'uploads/images/others/playstore.png');

                                                html2 = html2.replace(/{{facebook_url}}/g, 'https://www.facebook.com');
                                                html2 = html2.replace(/{{twitter_url}}/g, 'https://twitter.com');
                                                html2 = html2.replace(/{{linkedin_url}}/g, 'https://in.linkedin.com');


                                                html2 = html2.replace(/{{appstore_user}}/g, 'https://apps.apple.com/in/app/handy-for-all/id1157981852');
                                                html2 = html2.replace(/{{appstore_tasker}}/g, 'https://apps.apple.com/us/app/handy-for-all-experts/id1157981860');
                                                html2 = html2.replace(/{{playstore_user}}/g, 'https://play.google.com/store/apps/details?id=com.maidac&hl=en');
                                                html2 = html2.replace(/{{playstore_tasker}}/g, 'https://play.google.com/store/apps/details?id=com.maidacpartner');

                                                html2 = html2.replace(/{{site_title}}/g, settings.site_title);
                                                html2 = html2.replace(/{{site_url}}/g, settings.site_url);
                                                html2 = html2.replace(/{{referral}}/g, currencies.symbol +' '+ settings.referral.amount.referral);
                                                html2 = html2.replace(/{{referrer}}/g, currencies.symbol +' '+ settings.referral.amount.referrer);
                                                html2 = html2.replace(/{{email_title}}/g, settings.site_title);
                                                html2 = html2.replace(/{{email_address}}/g, settings.email_address);
                            
                                                html2 = html2.replace(/{{couponamount}}/g, CouponCode);
                                                html2 = html2.replace(/{{t_username}}/g, tasker.username);
                                                html2 = html2.replace(/{{taskeraddress}}/g, tasker.availability_address);
                                                html2 = html2.replace(/{{bookingid}}/g, task.booking_id);
                                                html2 = html2.replace(/{{u_username}}/g, user.username);
                                            
                                                html2 = html2.replace(/{{email}}/g, tasker.email);
                                                html2 = html2.replace(/{{code}}/g, tasker.phone.code);
                                                html2 = html2.replace(/{{number}}/g, tasker.phone.number);
                                                html2 = html2.replace(/{{currentdate}}/g, CurrentDate);
                                                html2 = html2.replace(/{{bookeddatetime}}/g, BookedDateTime);
                                                html2 = html2.replace(/{{startdatetime}}/g, StartDateTime);
                                                html2 = html2.replace(/{{completedatetime}}/g, CompleteDateTime);
                                                html2 = html2.replace(/{{description}}/g, task.task_description);

                                                html2 = html2.replace(/{{categoryname}}/g, task.booking_information.work_type);
                                                html2 = html2.replace(/{{hourlyrates}}/g, currencies.symbol + ' ' + (task.hourly_rate).toFixed(2));
                                                html2 = html2.replace(/{{hourlyrate}}/g, currencies.symbol + ' ' + (task.invoice.amount.minimum_cost).toFixed(2));
                                                html2 = html2.replace(/{{totalhour}}/g, task.invoice.worked_hours_human);
                                                html2 = html2.replace(/{{totalamount}}/g, currencies.symbol + ' ' + task.invoice.amount.grand_total.toFixed(2));
                                                html2 = html2.replace(/{{total}}/g, currencies.symbol + ' ' + (task.invoice.amount.total).toFixed(2));
                                                html2 = html2.replace(/{{amount}}/g, currencies.symbol + ' ' + (task.invoice.amount.grand_total - task.invoice.amount.admin_commission).toFixed(2));
                                                html2 = html2.replace(/{{actualamount}}/g, currencies.symbol + ' ' + (task.invoice.amount.total - task.invoice.amount.grand_total).toFixed(2));
                                                html2 = html2.replace(/{{admincommission}}/g, currencies.symbol + task.invoice.amount.admin_commission.toFixed(2));
                                                html2 = html2.replace(/{{extraamount}}/g, currencies.symbol + ' ' + MaterialFee);
                                                html2 = html2.replace(/{{tasker_earning}}/g, currencies.symbol + (task.invoice.amount.tasker_earning).toFixed(2));

                                                var options = {
                                                   height: "396mm", // allowed units: mm, cm, in, px
                                                   width: "280mm",
                                                   paginationOffset: 1,
                                                   border: {
                                                       "top": "0.5cm", // default is 0, units: mm, cm, in, px
                                                       "bottom": "0.5cm",
                                                   }
                                               };
                                                var pdfname2 = new Date().getTime();

                                                var attachment_name = task.booking_id.substr(4, 9);

                                                pdf.create(html2, options).toFile('./uploads/invoice/' + pdfname2 + '.pdf', function (err, document) {
                                                    if (err) {
                                                        callback(err, null);
                                                    } else {

                                                        var mailOptions2 = {
                                                            to: tasker.email,
                                                            subject: template[1].email_subject,
                                                            text: "Please Download the attachment to see your Invoice details",
                                                            html: '<b>Please Download the attachment to see your Invoice details</b>',
                                                            attachments: [{
                                                                filename: 'Reciept - '+ attachment_name +'.pdf',
                                                                path: './uploads/invoice/' + pdfname2 + '.pdf',
                                                                contentType: 'application/pdf'
                                                            }],
                                                        };
                                                    }

                                                    mail.send(mailOptions2, function (err, response) {
                                                    });
                                                });

                                                var notifications = { 'job_id': task.booking_id, 'user_id': tasker._id };
                                                var message = CONFIG.NOTIFICATION.PAYMENT_COMPLETED;
                                                push.sendPushnotification(tasker._id, message, 'payment_paid', 'ANDROID', notifications, 'PROVIDER', function (err, response, body) { });
                                                push.sendPushnotification(user._id, message, 'payment_paid', 'ANDROID', notifications, 'USER', function (err, response, body) { });

                                                callback(err, { 'status': 1, 'response': 'Success' });
                                            }
                                        });

                                    }
                                }
                                );
                            }
                        });
                    }
                });
            }
        });
    }


    function completeTask(data, callback) {
        console.log("data.request", data.request);
        var options = {};
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settingdata) {
            if (err || !settingdata) {
                callback(err);
            } else {
                options.populate = 'user tasker category';
                db.GetOneDocument('task', { _id: data.task }, {}, options, function (err, task) {
                    if (err) {
                        callback(err, null);
                    } else {
                        if (data.request) {
                            var pricevalue = 0;
                            var miscellaneous = [];
                            for (var i = 0; i < data.request.length; i++) {
                                pricevalue = parseFloat(data.request[i].price) + parseFloat(pricevalue);
                                miscellaneous.push({ 'name': data.request[i].name, 'price': data.request[i].price });
                            }
                        }

                        var startTime = moment(task.history.job_started_time);
                        console.log('startTime',startTime);

                        var formatedDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
                        var endTime = timezone.tz(new Date(), settingdata.settings.time_zone);
                        console.log('endTime',endTime);

                        console.log('timezone.tz(formatedDate, settingdata.settings.time_zone);', timezone.tz(new Date(), settingdata.settings.time_zone));

                        var momentDiff = endTime.diff(startTime, 'minutes');
                        console.log('momentDiff',momentDiff);

                        var duration = moment.duration(momentDiff, 'minutes');
                        var duration_hours = Math.floor(duration.asHours());
                        var duration_minutes = Math.floor(duration.asMinutes()) - duration_hours * 60 || 1;
                        var momentCal = (duration.asHours()).toFixed(2);
                        if (duration_hours) {
                            var momentHuman = duration_hours + " hrs " + duration_minutes + " mins";
                        } else {
                            if (duration_minutes == 1) {
                                var momentHuman = duration_minutes + " min";
                            } else {
                                var momentHuman = duration_minutes + " mins";
                            }
                        }
                        var provider_commision = 0;
                        var invoice = {};
                        if(duration_minutes.length == 2) {
                            invoice.worked_hours = duration_hours + '.' + duration_minutes;
                        } else {
                            invoice.worked_hours = duration_hours + '.0' + duration_minutes;
                        }
                        invoice.worked_hours_human = momentHuman;
                        invoice.amount = {};
                        invoice.amount.minimum_cost = parseFloat(task.category.commision);

                        for (var i = 0; i < task.tasker.taskerskills.length; i++) {
                            if (task.tasker.taskerskills[i].childid.toString() == task.category._id.toString()) {
                                provider_commision = (task.tasker.taskerskills[i].hour_rate).toFixed(2);
                            }
                        }

                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settingdata) {
                            if (err || !settingdata) {
                                callback(err);
                            } else {
                                /*  invoice.amount.task_cost = parseFloat(provider_commision).toFixed(2);
                                 invoice.amount.worked_hours_cost = parseFloat(invoice.amount.minimum_cost + (invoice.amount.task_cost * (Math.ceil(invoice.worked_hours) - 1))).toFixed(2);
                                 invoice.amount.total = parseFloat(invoice.amount.worked_hours_cost).toFixed(2);
                                 invoice.amount.service_tax = (parseFloat((settingdata.settings.service_tax) / 100) * invoice.amount.total).toFixed(2);
                                  */
                                /*  if (invoice.worked_hours > 1) {
                                      invoice.amount.total = parseFloat(invoice.amount.minimum_cost) + parseFloat(invoice.amount.worked_hours_cost);
                                  } else {
                                      invoice.amount.total = parseFloat(invoice.amount.minimum_cost);
                                  }*/

                                //  New changes on 1-8-2018  start


                                if (task.category.ratetype) {
                                    if (task.category.ratetype == "Flat") {
                                        invoice.amount.minimum_cost = provider_commision;
                                        invoice.amount.task_cost = parseFloat(provider_commision).toFixed(2);
                                        invoice.amount.worked_hours_cost = parseFloat(provider_commision).toFixed(2);
                                        invoice.amount.total = parseFloat(invoice.amount.worked_hours_cost).toFixed(2);
                                    }
                                    else if (task.category.ratetype == "Hourly") {
                                        invoice.amount.task_cost = parseFloat(provider_commision).toFixed(2);
                                        invoice.amount.worked_hours_cost = parseFloat(invoice.amount.minimum_cost + (invoice.amount.task_cost * (Math.ceil(invoice.worked_hours) - 1))).toFixed(2);
                                        invoice.amount.total = parseFloat(invoice.amount.worked_hours_cost).toFixed(2);
                                    }
                                } 

                                invoice.amount.service_tax = (parseFloat((settingdata.settings.service_tax) / 100) * invoice.amount.total).toFixed(2);


                                if (settingdata.settings.categorycommission) {
                                    if (settingdata.settings.categorycommission.status == 1) {
                                        invoice.amount.admin_commission = parseFloat((task.category.admincommision / 100) * invoice.amount.total).toFixed(2);
                                    } else {
                                        invoice.amount.admin_commission = parseFloat((settingdata.settings.admin_commission / 100) * invoice.amount.total).toFixed(2);
                                    }
                                }
                                else {
                                    invoice.amount.admin_commission = parseFloat((settingdata.settings.admin_commission / 100) * invoice.amount.total).toFixed(2);
                                }

                                var addno = parseFloat(invoice.amount.total) + parseFloat(invoice.amount.service_tax);
                                var fulltotal = addno.toFixed(2);
                                if (data.request) {
                                    var roundedprice = parseFloat(pricevalue);
                                    var dummy = parseFloat(invoice.amount.total) + parseFloat(roundedprice);
                                    var addno = (parseFloat((settingdata.settings.service_tax) / 100) * dummy).toFixed(2);
                                    var fulltotal = addno;
                                    invoice.amount.grand_total = parseFloat(dummy) + parseFloat(addno);
                                    invoice.amount.balance_amount = parseFloat(dummy) + parseFloat(addno);
                                    invoice.amount.extra_amount = parseFloat(roundedprice);
                                    invoice.amount.service_tax = addno;
                                    invoice.miscellaneous = miscellaneous;

                                } else {
                                    invoice.amount.grand_total = fulltotal;
                                    invoice.amount.balance_amount = fulltotal;
                                }

                                if(invoice.amount.extra_amount > 0) {
                                    invoice.amount.tasker_earning = parseFloat(invoice.amount.total) + invoice.amount.extra_amount - parseFloat(invoice.amount.admin_commission);
                                } else {
                                    invoice.amount.tasker_earning = parseFloat(invoice.amount.total) - parseFloat(invoice.amount.admin_commission);
                                }

                                var taskdate = moment(new Date()).format('YYYY-MM-DD');
                                //var time = timezone.tz(formatedDates, settingdata.settings.time_zone);
                                //var time = timezone.tz(new Date(), settingdata.settings.time_zone).utc().format();
                                var time = new Date();
                                async.parallel({
                                    updateresult: function (callback) {
                                        db.UpdateDocument('task', { _id: task._id }, { 'status': 6, 'history.job_completed_time': time, 'invoice': invoice, 'task_date': taskdate }, {}, function (err, updateresult) {
                                            callback(err, updateresult);
                                        });
                                    },
                                    currencies: function (callback) {
                                        db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
                                            callback(err, currencies);
                                        });
                                    },
                                    tasker: function (callback) {
                                            db.UpdateDocument('tasker', { _id: task.tasker._id }, { $unset: { current_task: "" } }, function (err, result) {
                                                if (err) { callback(err, task); }
                                                else { callback(err, task); }
                                            });

                                    },
                                }, function (err, value) {
                                    if (err || !value.currencies || value.updateresult.nModified == 0) {
                                        callback(err, null);
                                    } else {
                                        db.GetOneDocument('task', { _id: data.task }, {}, options, function (err, task) {
                                            if (err) {
                                                callback(err, null);
                                            } else {
                                                var currencies = value.currencies;
                                                db.GetDocument('emailtemplate', { name: { $in: ['Taskcompleteduser', 'Taskcompleted'] }, 'status': { $ne: 0 } }, {}, {}, function (err, template) {
                                                    if (err) {
                                                        callback(err, null);
                                                    } else {
                                                        var mailData = {};
                                                        mailData.template = 'Taskcompleteduser';
                                                        mailData.to = task.user.email;
                                                        mailData.html = [];
                                                        mailData.html.push({ name: 'username', value: task.user.username });
                                                        mailData.html.push({ name: 'taskername', value: task.tasker.username });
                                                        mailData.html.push({ name: 'bookingid', value: task.booking_id });

                                                        mailcontent.sendmail(mailData, function (err, response) {});
                                                        
                                                        var mailData1 = {};
                                                        mailData1.template = 'Taskcompleted';
                                                        mailData1.to = task.tasker.email;
                                                        mailData1.html = [];
                                                        mailData1.html.push({ name: 'username', value: task.user.username });
                                                        mailData1.html.push({ name: 'taskername', value: task.tasker.username });
                                                        mailData1.html.push({ name: 'bookingid', value: task.booking_id });

                                                        mailcontent.sendmail(mailData1, function (err, response) {});
                                                        

                                                        var notifications = { 'job_id': task.booking_id, 'user_id': task.user._id };
                                                        var message = task.tasker.username + ' successfully completed your job.';
                                                        push.sendPushnotification(task.user._id, message, 'job_completed', 'ANDROID', notifications, 'USER', function (err, response, body) { });

                                                        /* Response Manipulation*/
                                                        task.currency = currencies;
                                                        task.settings = settingdata.settings;
                                                        /* /Response Manipulation*/

                                                        callback(err, task);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                }
                                );
                            }
                        });
                    }
                });
            }
        });
    }

    function taskExpired(data, callback) {
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                callback(err, settings);
            } else {
                var dateTimeNow = timezone.tz(moment().subtract(1, "days"), settings.settings.time_zone).toISOString();
                db.UpdateDocument('task', { 'status': 1, 'booking_information.booking_date': { $lt: new Date(dateTimeNow) } }, { 'status': 11 }, { multi: true }, function (err, docdata) {
                    callback(err, docdata);
                });
            }
        });
    }

    return {
        taskPayment: taskPayment,
        completeTask: completeTask,
        taskExpired: taskExpired
    };
};
