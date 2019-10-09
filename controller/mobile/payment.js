module.exports = function(io, i18n) {

    var moment = require("moment");
    var db = require('../../model/mongodb.js');
    var push = require('../../model/pushNotification.js')(io);
    var multer = require('multer');
    var async = require("async");
    var mail = require('../../model/mail.js');
    var mongoose = require("mongoose");
    var fs = require('fs');
    var CONFIG = require('../../config/config');
    var stripe = require('stripe')('');
    var url = require('url');
    var twilio = require('../../model/twilio.js');
    var library = require('../../model/library.js');
    var mailcontent = require('../../model/mailcontent.js');
    var taskLibrary = require('../../model/task.js')(io);
    var pdf = require('html-pdf');
  
  
    var controller = {};
    controller.byCash = function(req, res) {
      var data = {};
      data.status = '0';
      var errors = [];
      req.checkBody('job_id', res.__('Job ID is Required')).notEmpty();
      req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
      errors = req.validationErrors();
      if (errors) {
        res.send({
          "status": "0",
          "errors": errors[0].msg
        });
        return;
      }
      var user_id = req.body.user_id;
      var job_id = req.body.job_id;
      db.GetDocument('users', {
        '_id': user_id
      }, {}, {}, function(usersErr, usersRespo) {
        if (usersErr || !usersRespo) {
          data.response = res.__('Invalid ' + CONFIG.USER);
          res.send(data);
        } else {
          db.GetDocument('task', {
            'booking_id': job_id,
            'user': user_id,
            "status": 6
          }, {}, {}, function(bookErr, bookRespo) {
            if (bookErr || bookRespo.length == 0) {
              data.response = res.__('Payment is already completed');
              res.send(data);
            } else {
              db.GetDocument('tasker', {
                '_id': bookRespo[0].tasker
              }, {}, {}, function(proErr, proRespo) {
                if (proErr || proRespo.length == 0) {
                  data.response = res.__('Invalid ' + CONFIG.TASKER);
                  res.send(data);
                } else {
                  db.GetOneDocument('currencies', {
                    'default': 1
                  }, {}, {}, function(err, currencies) {
                    if (err || !currencies) {
                      res.send({
                        "status": 0,
                        "message": res.__('Error')
                      });
                    } else {
                      db.GetOneDocument('settings', {
                        'alias': 'sms'
                      }, {}, {}, function(err, settings) {
                        if (err || !settings) {
                          data.response = res.__('Configure your website settings');
                          res.send(data);
                        } else {
                          /*if (bookRespo[0].invoice.amount.grand_total) {
                            if (bookRespo[0].invoice.amount.balance_amount) {
                              amount_to_receive = (bookRespo[0].invoice.amount.balance_amount).toFixed(2);
                            } else {
                              amount_to_receive = (bookRespo[0].invoice.amount.grand_total).toFixed(2);
                            }
                          }*/

                          var amount_to_receive = '';

                          if (bookRespo[0].invoice.amount.total) {
                            if(bookRespo[0].invoice.amount.extra_amount > 0 && !bookRespo[0].invoice.amount.discount) {
                              amount_to_receive = bookRespo[0].invoice.amount.total + bookRespo[0].invoice.amount.service_tax + bookRespo[0].invoice.amount.extra_amount;
                            } else if(bookRespo[0].invoice.amount.discount > 0 && !bookRespo[0].invoice.amount.extra_amount) {
                              amount_to_receive = bookRespo[0].invoice.amount.total + bookRespo[0].invoice.amount.service_tax - bookRespo[0].invoice.amount.discount;
                            } else if(bookRespo[0].invoice.amount.extra_amount > 0 && bookRespo[0].invoice.amount.discount > 0) {
                              amount_to_receive = bookRespo[0].invoice.amount.total + bookRespo[0].invoice.amount.service_tax + bookRespo[0].invoice.amount.extra_amount - bookRespo[0].invoice.amount.discount;
                            } else {
                              amount_to_receive = bookRespo[0].invoice.amount.total + bookRespo[0].invoice.amount.service_tax;
                            }
                          }

                          var transaction = {
                            'user': user_id,
                            'tasker': bookRespo[0].tasker,
                            'task': bookRespo[0]._id,
                            'type': 'pay by cash',
                            'amount': amount_to_receive,
                            'task_date': bookRespo[0].createdAt,
                            'status': 1
                          };
                          db.InsertDocument('transaction', transaction, function(err, transaction) {
                            if (err || transaction.nModified == 0) {
                              data.response = res.__('Error in data, Please check your data');
                              res.send(data);
                            } else {
                              var transactions = [transaction._id];
                              var paymenttype = "";
                              if (bookRespo[0].payment_type == "wallet-other") {
                                paymenttype = "wallet-cash"
                              } else {
                                paymenttype = "cash"
                              }
                              db.UpdateDocument('task', {
                                'booking_id': job_id,
                                'user': user_id
                              }, {
                                $push: {
                                  transactions
                                },
                                'invoice.status': 1,
                                'status': 7,
                                'payment_type': paymenttype,
                                'invoice.amount.balance_amount': 0,
                                'history.job_closed_time': new Date()
                              }, {}, function(err, upda) {
                                var provider_id = bookRespo[0].tasker;
                                var Usermessage = 'Your payment was successful.';
                                var Taskermessage = usersRespo[0].username + ' has paid the job amount.';
                                var amount_to_receive = 0.00;
                                var currency = currencies.code;
                                var options = {
                                  'job_id': req.body.job_id,
                                  'provider_id': provider_id,
                                  'amount': amount_to_receive,
                                  'currency': currency
                                };
                                push.sendPushnotification(bookRespo[0].user, Usermessage, 'payment_paid', 'ANDROID', options, 'USER', function(err, Response, body) {});
                                push.sendPushnotification(bookRespo[0].tasker, Taskermessage, 'payment_paid', 'ANDROID', options, 'PROVIDER', function(err, Response, body) {});
                                db.GetDocument('emailtemplate', {
                                  name: {
                                    $in: ['PaymentDetailstoAdmin', 'PaymentDetailstoTasker', 'PaymentDetailstoUser']
                                  },
                                  'status': {
                                    $ne: 0
                                  }
                                }, {}, {}, function(err, template) {
                                  if (err) {
                                    res.send(data);
                                  } else {
  
                                    db.GetOneDocument('settings', {
                                      'alias': 'general'
                                    }, {}, {}, function(err, gensettings) {
                                      if (err || !gensettings) {
                                        data.response = res.__('Configure your website settings');
                                        res.send(data);
                                      } else {
                                        options.populate = 'tasker user categories';
                                        db.GetOneDocument('task', {
                                          'booking_id': job_id
                                        }, {}, options, function(err, task) {
                                          if (err) {
                                            data.response = res.__('Invalid Task');
                                            res.send(data);
                                          } else {
                                            var MaterialFee, CouponCode, DateTime, BookingDate;
                                            if (task.invoice.amount.extra_amount) {
                                              MaterialFee = (task.invoice.amount.extra_amount).toFixed(2);
                                            } else {
                                              MaterialFee = '0.00';
                                            }
                                            if (task.invoice.amount.coupon) {
                                              CouponCode = task.invoice.amount.coupon;
                                            } else {
                                              CouponCode = 'Not assigned';
                                            }
  
                                            /*var userfirstname = task.user.username;
                                            DateTime = moment(task.history.job_started_time).format('DD/MM/YYYY - HH:mm');
                                            BookingDate = moment(task.history.booking_date).format('DD/MM/YYYY');
  
                                            var html = template[0].email_content;
                                            html = html.replace(/{{mode}}/g, 'cash');
                                            html = html.replace(/{{materialfee}}/g, currencies.symbol + ' ' + MaterialFee);
                                            html = html.replace(/{{coupon}}/g, CouponCode);
                                            html = html.replace(/{{datetime}}/g, DateTime);
                                            html = html.replace(/{{bookingdata}}/g, BookingDate);
                                            html = html.replace(/{{site_url}}/g, gensettings.settings.site_url);
                                            html = html.replace(/{{logo}}/g, gensettings.settings.site_url + gensettings.settings.logo);
                                            html = html.replace(/{{site_title}}/g, gensettings.settings.site_title);
                                            html = html.replace(/{{t_username}}/g, task.tasker.username);
                                            html = html.replace(/{{taskeraddress}}/g, task.tasker.availability_address);
                                            html = html.replace(/{{bookingid}}/g, task.booking_id);
                                            html = html.replace(/{{u_username}}/g, userfirstname);
                                            html = html.replace(/{{useraddress}}/g, task.service_address || ' ');
                                            html = html.replace(/{{categoryname}}/g, task.booking_information.work_type);
                                            html = html.replace(/{{hourlyrates}}/g, currencies.symbol + ' ' + (task.hourly_rate).toFixed(2));
                                            html = html.replace(/{{hourlyrate}}/g, currencies.symbol + ' ' + (task.invoice.amount.minimum_cost).toFixed(2));
                                            html = html.replace(/{{totalhour}}/g, task.invoice.worked_hours_human);
                                            html = html.replace(/{{totalamount}}/g, currencies.symbol + ' ' + (task.invoice.amount.grand_total).toFixed(2));
                                            html = html.replace(/{{total}}/g, currencies.symbol + ' ' + (task.invoice.amount.total).toFixed(2));
                                            html = html.replace(/{{amount}}/g, currencies.symbol + ' ' + (task.invoice.amount.grand_total - task.invoice.amount.admin_commission).toFixed(2));
                                            html = html.replace(/{{actualamount}}/g, currencies.symbol + ' ' + ((task.invoice.amount.grand_total - task.invoice.amount.admin_commission) - MaterialFee).toFixed(2));
                                            html = html.replace(/{{adminamount}}/g, currencies.symbol + ' ' + (task.invoice.amount.admin_commission).toFixed(2));
                                            html = html.replace(/{{privacy}}/g, gensettings.settings.site_url + 'pages/privacypolicy');
                                            html = html.replace(/{{terms}}/g, gensettings.settings.site_url + 'pages/termsandconditions');
                                            html = html.replace(/{{Servicetax}}/g, currencies.symbol + ' ' + task.invoice.amount.service_tax.toFixed(2));
                                            var options = {
                                              format: 'Letter'
                                            };
                                            var pdfname = new Date().getTime();
                                            pdf.create(html, options).toFile('./uploads/invoice/' + pdfname + '.pdf', function(err, document) {
                                              if (err) {
                                                res.send(err);
                                              } else {
                                                var mailOptions = {
                                                  from: template[0].sender_email,
                                                  to: gensettings.settings.email_address,
                                                  subject: template[0].email_subject,
                                                  text: "Please Download the attachment to see Your Payment",
                                                  html: '<b>Please Download the attachment to see Your Payment</b>',
                                                  attachments: [{
                                                    filename: 'Admin Payment.pdf',
                                                    path: './uploads/invoice/' + pdfname + '.pdf',
                                                    contentType: 'application/pdf'
                                                  }],
                                                };
                                              }
                                              mail.send(mailOptions, function(err, response) {});
                                            });*/
  
                                            /*var html2 = template[1].email_content;
                                            html2 = html2.replace(/{{mode}}/g, 'cash');
                                            html2 = html2.replace(/{{materialfee}}/g, currencies.symbol + ' ' + MaterialFee);
                                            html2 = html2.replace(/{{coupon}}/g, CouponCode);
                                            html2 = html2.replace(/{{datetime}}/g, DateTime);
                                            html2 = html2.replace(/{{bookingdata}}/g, BookingDate);
                                            html2 = html2.replace(/{{site_url}}/g, gensettings.settings.site_url);
                                            html2 = html2.replace(/{{site_title}}/g, gensettings.settings.site_title);
                                            html2 = html2.replace(/{{logo}}/g, gensettings.settings.site_url + gensettings.settings.logo);
                                            html2 = html2.replace(/{{t_username}}/g, task.tasker.username);
                                            html2 = html2.replace(/{{taskeraddress}}/g, task.tasker.availability_address);
                                            html2 = html2.replace(/{{bookingid}}/g, task.booking_id);
                                            html2 = html2.replace(/{{u_username}}/g, userfirstname);
                                            html2 = html2.replace(/{{useraddress}}/g, task.service_address || ' ');
                                            html2 = html2.replace(/{{categoryname}}/g, task.booking_information.work_type);
                                            html2 = html2.replace(/{{hourlyrates}}/g, currencies.symbol + ' ' + (task.hourly_rate).toFixed(2));
                                            html2 = html2.replace(/{{hourlyrate}}/g, currencies.symbol + ' ' + (task.invoice.amount.minimum_cost).toFixed(2));
                                            html2 = html2.replace(/{{totalhour}}/g, task.invoice.worked_hours_human);
                                            html2 = html2.replace(/{{totalamount}}/g, currencies.symbol + ' ' + (task.invoice.amount.grand_total - task.invoice.amount.service_tax).toFixed(2));
                                            html2 = html2.replace(/{{total}}/g, currencies.symbol + ' ' + (task.invoice.amount.total).toFixed(2));
                                            html2 = html2.replace(/{{amount}}/g, currencies.symbol + ' ' + (task.invoice.amount.grand_total - task.invoice.amount.admin_commission).toFixed(2));
                                            html2 = html2.replace(/{{actualamount}}/g, currencies.symbol + ' ' + ((task.invoice.amount.grand_total - task.invoice.amount.admin_commission) - task.invoice.amount.service_tax).toFixed(2));
                                            html2 = html2.replace(/{{admincommission}}/g, currencies.symbol + ' ' + task.invoice.amount.admin_commission.toFixed(2));
                                            html2 = html2.replace(/{{privacy}}/g, gensettings.settings.site_url + 'pages/privacypolicy');
                                            html2 = html2.replace(/{{terms}}/g, gensettings.settings.site_url + 'pages/termsandconditions');
                                            html2 = html2.replace(/{{Servicetax}}/g, currencies.symbol + ' ' + task.invoice.amount.service_tax.toFixed(2));
                                            var options = {
                                              format: 'Letter'
                                            };
                                            var pdfname1 = new Date().getTime();
                                            pdf.create(html2, options).toFile('./uploads/invoice/' + pdfname1 + '.pdf', function(err, document) {
  
                                              if (err) {
                                                res.send(err);
                                              } else {
  
                                                var mailOptions1 = {
                                                  from: template[1].sender_email,
                                                  to: task.tasker.email,
                                                  subject: template[1].email_subject,
                                                  text: "Please Download the attachment to see Your Payment",
                                                  html: '<b>Please Download the attachment to see Your Payment</b>',
                                                  attachments: [{
                                                    filename: 'Payment.pdf',
                                                    path: './uploads/invoice/' + pdfname1 + '.pdf',
                                                    contentType: 'application/pdf'
                                                  }],
                                                };
                                              }
  
                                              mail.send(mailOptions1, function(err, response) {});
                                            });*/
  
                                            /*var html3 = template[2].email_content;
                                            html3 = html3.replace(/{{mode}}/g, 'cash');
                                            html3 = html3.replace(/{{materialfee}}/g, currencies.symbol + ' ' + MaterialFee);
                                            html3 = html3.replace(/{{coupon}}/g, CouponCode);
                                            html3 = html3.replace(/{{datetime}}/g, DateTime);
                                            html3 = html3.replace(/{{bookingdata}}/g, BookingDate);
                                            html3 = html3.replace(/{{site_url}}/g, gensettings.settings.site_url);
                                            html3 = html3.replace(/{{site_title}}/g, gensettings.settings.site_title);
                                            html3 = html3.replace(/{{logo}}/g, gensettings.settings.site_url + gensettings.settings.logo);
                                            html3 = html3.replace(/{{t_username}}/g, task.tasker.username);
                                            html3 = html3.replace(/{{taskeraddress}}/g, task.tasker.availability_address);
                                            html3 = html3.replace(/{{bookingid}}/g, task.booking_id);
                                            html3 = html3.replace(/{{u_username}}/g, userfirstname);
                                            html3 = html3.replace(/{{useraddress}}/g, task.service_address || ' ');
                                            html3 = html3.replace(/{{categoryname}}/g, task.booking_information.work_type);
                                            html3 = html3.replace(/{{hourlyrates}}/g, currencies.symbol + ' ' + (task.hourly_rate).toFixed(2));
                                            html3 = html3.replace(/{{hourlyrate}}/g, currencies.symbol + ' ' + (task.invoice.amount.minimum_cost).toFixed(2));
                                            html3 = html3.replace(/{{totalhour}}/g, task.invoice.worked_hours_human);
                                            html3 = html3.replace(/{{totalamount}}/g, currencies.symbol + ' ' + task.invoice.amount.grand_total.toFixed(2));
                                            html3 = html3.replace(/{{total}}/g, currencies.symbol + ' ' + (task.invoice.amount.total).toFixed(2));
                                            html3 = html3.replace(/{{amount}}/g, currencies.symbol + ' ' + (task.invoice.amount.grand_total - task.invoice.amount.admin_commission).toFixed(2));
                                            html3 = html3.replace(/{{actualamount}}/g, currencies.symbol + ' ' + (task.invoice.amount.total - task.invoice.amount.grand_total).toFixed(2));
                                            html3 = html3.replace(/{{admincommission}}/g, currencies.symbol + ' ' + task.invoice.amount.admin_commission.toFixed(2));
                                            html3 = html3.replace(/{{privacy}}/g, gensettings.settings.site_url + 'pages/privacypolicy');
                                            html3 = html3.replace(/{{terms}}/g, gensettings.settings.site_url + 'pages/termsandconditions');
                                            html3 = html3.replace(/{{Servicetax}}/g, currencies.symbol + ' ' + task.invoice.amount.service_tax.toFixed(2));
                                            var options = {
                                              format: 'Letter'
                                            };
                                            var pdfname2 = new Date().getTime();
                                            pdf.create(html3, options).toFile('./uploads/invoice/' + pdfname2 + '.pdf', function(err, document) {
  
                                              if (err) {
                                                res.send(err);
                                              } else {
  
                                                var mailOptions2 = {
                                                  from: template[2].sender_email,
                                                  to: task.user.email,
                                                  subject: template[2].email_subject,
                                                  text: "Please Download the attachment to see Your Payment",
                                                  html: '<b>Please Download the attachment to see Your Payment</b>',
                                                  attachments: [{
                                                    filename: 'Payment.pdf',
                                                    path: './uploads/invoice/' + pdfname2 + '.pdf',
                                                    contentType: 'application/pdf'
                                                  }],
                                                };
                                              }
  
                                              mail.send(mailOptions2, function(err, response) {});
                                            });*/
                                          }
  
                                        });
                                      }
                                    });
                                  }
                                });
  
                                data.status = '1';
                                data.response = res.__('Pay your bill by cash');
                                res.send(data);
                              });
                            }
                          });
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  
    controller.byZero = function(req, res) {
      var errors = [];
      req.checkBody('job_id', res.__('Job ID is Required')).notEmpty();
      req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
      errors = req.validationErrors();
      if (errors) {
        res.send({
          "status": "0",
          "errors": errors[0].msg
        });
        return;
      }
      var data = {};
      data.user_id = req.body.user_id;
      data.job_id = req.body.job_id;
      db.GetOneDocument('users', {
        '_id': req.body.user_id,
        'status': 1
      }, {}, {}, function(err, user) {
        if (err || !user) {
          res.send({
            'status': '0',
            'response': res.__('Invalid ' + CONFIG.USER)
          });
        } else {
          db.GetOneDocument('task', {
            'booking_id': req.body.job_id,
            'user': req.body.user_id
          }, {}, {}, function(bookErr, bookRespo) {
            if (bookErr || !bookRespo) {
              res.send({
                'status': '0',
                'response': res.__('INVALID ERROR')
              });
            } else {
              if (bookRespo.status == 6) {
                db.UpdateDocument('task', {
                  'booking_id': req.body.job_id,
                  'user': req.body.user_id
                }, {
                  'status': 7,
                  'invoice.status': 1
                }, {}, function(err, response) {
                  if (err || response.nModified == 0) {
                    res.send({
                      'status': '0',
                      'response': res.__('INVALID ERROR')
                    });
                  } else {
                    var message = CONFIG.NOTIFICATION.YOUR_BILLING_AMOUNT_PAID_SUCCESSFULLY;
                    var options = {
                      'job_id': data.job_id,
                      'user_id': data.user_id
                    };
                    push.sendPushnotification(bookRespo.user, message, 'payment_paid', 'ANDROID', options, 'USER', function(err, response, body) {});
  
                    var message = CONFIG.NOTIFICATION.YOUR_BILLING_AMOUNT_PAID_SUCCESSFULLY;
                    var options = {
                      'job_id': data.job_id,
                      'user_id': data.user_id
                    };
                    push.sendPushnotification(bookRespo.tasker, message, 'payment_paid', 'ANDROID', options, 'PROVIDER', function(err, response, body) {});
                    res.send({
                      'status': '1',
                      'response': res.__('Payment Completed')
                    });
                  }
                });
  
              } else {
                res.send({
                  'status': '0',
                  'response': res.__('Sorry you can not make payment at this time')
                });
              }
            }
          });
        }
      });
    }
  
    controller.stripePaymentProcess = function(req, res) {
  
      var data = {};
      data.status = '0';
      var errors = [];
      req.checkBody('task_id', res.__('Job ID is Required')).notEmpty();
      req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
      req.checkBody('card_number', res.__('Card_number is Required')).notEmpty();
      req.checkBody('exp_month', res.__('Exp_month  is Required')).notEmpty();
      req.checkBody('exp_year', res.__('Exp_year is Required')).notEmpty();
      req.checkBody('cvc_number', res.__('Card_cvv no is Required')).notEmpty();
      req.checkBody('transaction_id', res.__('Transaction_id no is Required')).notEmpty();
      errors = req.validationErrors();
      if (errors) {
        res.send({
          "status": "0",
          "errors": errors[0].msg
        });
        return;
      }
      req.sanitizeBody('task_id').trim();
      req.sanitizeBody('user_id').trim();
      req.sanitizeBody('card_number').trim();
      req.sanitizeBody('exp_month').trim();
      req.sanitizeBody('exp_year').trim();
      req.sanitizeBody('cvc_number').trim();
      req.sanitizeBody('transaction_id').trim();
  
      var request = {};
      request.task = req.body.task_id.replace(/^"(.*)"$/, '$1');
      request.user = req.body.user_id.replace(/^"(.*)"$/, '$1');
      request.transaction_id = req.body.transaction_id.replace(/^"(.*)"$/, '$1');
  
      var card = {};
      card.number = req.body.card_number;
      card.exp_month = req.body.exp_month;
      card.exp_year = req.body.exp_year;
      card.cvc = req.body.cvc_number;
  
      db.GetOneDocument('paymentgateway', {
        status: {
          $ne: 0
        },
        alias: 'stripe'
      }, {}, {}, function(err, paymentgateway) {
        if (err) {
          res.status(400).send({
            'message': 'Invalid payment method, Please contact the website administrator'
          });
        } else {
          stripe.setApiKey(paymentgateway.settings.sandbox_secret_key);
  
          async.waterfall([
            function(callback) {
              db.GetOneDocument('task', {
                '_id': request.task,
                'status': 6
              }, {}, {}, function(err, task) {
                if (err || !task) {
                  data.response = res.__('Payment is already completed');
                  res.send(data);
                } else {
                  callback(err, task);
                }
              });
            },
            function(task, callback) {
              db.GetOneDocument('tasker', {
                '_id': task.tasker
              }, {}, {}, function(err, tasker) {
                if (err || !tasker) {
                  data.response = res.__('Invalid ' + CONFIG.TASKER);
                  res.send(data);
                } else {
                  callback(err, task, tasker);
                }
              });
            },
            function(task, tasker, callback) {
              db.GetOneDocument('users', {
                '_id': request.user
              }, {}, {}, function(err, user) {
                if (err || !user) {
                  data.response = res.__('Invalid ' + CONFIG.USER);
                  res.send(data);
                } else {
                  callback(err, task, tasker, user);
                }
              });
            },
            function(task, tasker, user, callback) {
              db.UpdateDocument('transaction', {
                '_id': request.transaction_id
              }, {
                'type': 'card'
              }, {}, function(err, transaction) {
                if (err || !user) {
                  data.response = res.__('Invalid ' + CONFIG.USER);
                  res.send(data);
                } else {
                  callback(err, task, tasker, user, transaction);
                }
              });
            },
            function(task, tasker, user, transaction, callback) {
              stripe.tokens.create({
                card: card
              }, function(err, token) {
                if (err || !token) {
                  res.redirect("http://" + req.headers.host + '/mobile/mobile/failed');
                } else {
                  callback(err, token, task, transaction, tasker);
                }
              });
            },
            function(token, task, tasker, transaction, callback) {
              var amount_to_receive = 0;
              if (task.invoice.amount.grand_total) {
                if (task.invoice.amount.balance_amount) {
                  amount_to_receive = parseFloat(task.invoice.amount.balance_amount).toFixed(2);
                } else {
                  amount_to_receive = parseFloat(task.invoice.amount.grand_total).toFixed(2);
                }
              }
              var test = parseInt(amount_to_receive * 100);
              stripe.charges.create({
                amount: test,
                currency: "usd",
                source: token.id,
                description: "Payment From User",
              }, function(err, charges) {
                if (err || !charges) {
                  data.response = res.__('Error in stripe charge creation');
                  res.send(data);
                } else {
                  callback(err, task, tasker, token, charges);
                }
              });
            }
          ], function(err, task, tasker, token, charges) {
            if (err) {
              if (err) {
                data.response = res.__('Error in saving your data');
                res.send(data);
              }
            } else {
              taskLibrary.taskPayment({
                'transaction': request.transaction_id,
                'gateway_response': charges,
                'task': task
              }, function(err, response) {
                if (err || !response) {
                  res.redirect("http://" + req.headers.host + '/mobile/payment/pay-failed');
                } else {
                  res.redirect("http://" + req.headers.host + '/mobile/payment/pay-completed/bycard');
                }
              });
            }
          });
        }
      });
    }
  
    controller.byWallet = function(req, res) {
      var errors = [];
      req.checkBody('job_id', res.__('Job ID is Required')).notEmpty();
      req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
      errors = req.validationErrors();
      if (errors) {
        res.send({
          "status": "0",
          "errors": errors[0].msg
        });
        return;
      }
      var data = {};
      data.status = '0';
      var request = {};
      request.user_id = req.body.user_id;
      request.job_id = req.body.job_id;
      db.GetOneDocument('users', {
        '_id': request.user_id
      }, {}, {}, function(err, users) {
        if (err || users.length == 0) {
          data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
          res.send(data);
        } else {
          db.GetOneDocument('currencies', {
            'default': 1
          }, {}, {}, function(err, currencies) {
            if (err || !currencies) {
              res.send({
                "status": 0,
                "message": res.__('Error')
              });
            } else {
              db.GetOneDocument('task', {
                'booking_id': request.job_id,
                'user': request.user_id,
                "status": 6
              }, {}, {}, function(err, Bookings) {
                if (err || !Bookings) {
                  data.response = 'Job Invalid';
                  res.send(data);
                } else {
                  db.GetOneDocument('walletReacharge', {
                    "user_id": request.user_id
                  }, {}, {}, function(err, wallet) {
                    if (err || !wallet) {
                      data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
                      res.send(data);
                    } else {
					  var job_charge = '';
					  if (Bookings.invoice.amount.total) {
						  if(Bookings.invoice.amount.extra_amount > 0 && !Bookings.invoice.amount.discount) {
							job_charge = Bookings.invoice.amount.total + Bookings.invoice.amount.service_tax + Bookings.invoice.amount.extra_amount;
						  } else if(Bookings.invoice.amount.discount > 0 && !Bookings.invoice.amount.extra_amount) {
							job_charge = Bookings.invoice.amount.total + Bookings.invoice.amount.service_tax - Bookings.invoice.amount.discount;
						  } else if(Bookings.invoice.amount.extra_amount > 0 && Bookings.invoice.amount.discount > 0) {
							job_charge = Bookings.invoice.amount.total + Bookings.invoice.amount.service_tax + Bookings.invoice.amount.extra_amount - Bookings.invoice.amount.discount;
						  } else {
							job_charge = Bookings.invoice.amount.total + Bookings.invoice.amount.service_tax;
						  }
					  }
                      if (wallet.total == 0) {
                        res.send({
                          'status': '0',
                          'response': res.__('Sorry insufficient amount please recharge your wallet amount'),
                          'Amount neeeds': job_charge
                        });
                      } else if (wallet.total < job_charge) {
                        var provider_id = Bookings.tasker;
                        var wallet_amount = 0.00;
						
                        /*if(Bookings.invoice.amount.grand_total) {
                          if()
                        }
                        var job_charge = Bookings.invoice.amount.balance_amount;*/
                        if (wallet.total) {
                          wallet_amount = parseFloat(wallet.total);
                        }
                        /*if (Bookings.invoice.amount.grand_total) {
                          job_charge = parseFloat(Bookings.invoice.amount.balance_amount);
                        }*/
                        var balanceamount = {};
                        balanceamount = job_charge - wallet_amount;
   
                        var walletArr = {
                          'type': 'DEBIT',
                          'debit_type': 'payment',
                          'ref_id': req.body.job_id,
                          'trans_amount': parseFloat(wallet.total),
                          'avail_amount': 0,
                          'due_amount': balanceamount,
                          'trans_date': new Date(),
                          'trans_id': mongoose.Types.ObjectId()
                        };
                        db.UpdateDocument('walletReacharge', {
                          'user_id': req.body.user_id
                        }, {
                          $push: {
                            transactions: walletArr
                          },
                          $set: {
                            "total": 0
                          }
                        }, {
                          multi: true
                        }, function(walletUErr, walletURespo) {
  
                          if (walletUErr || walletURespo.nModified == 0) {
                            data.response = res.__('Error in data, Please check your data');
                            res.send(data);
                          } else {
                            db.UpdateDocument('task', {
                              "booking_id": request.job_id
                            }, {
                              "invoice.amount.balance_amount": balanceamount,
                              "payment_type": "wallet-other"
                            }, function(err, docdata) {
  
  
                              if (err || docdata.nModified == 0) {
                                data.response = res.__('Error data, Please check your data');
                                res.send(data);
                              } else {
                                var transaction = {
                                  'user': request.user_id,
                                  'tasker': Bookings.tasker,
                                  'task': Bookings._id,
                                  'type': 'wallet-other',
                                  'amount': balanceamount,
                                  //'amount':  Bookings.invoice.amount.grand_total,
                                  'task_date': Bookings.createdAt,
                                  'status': 1
                                };
								
                                db.InsertDocument('transaction', transaction, function(err, transaction) {
                                  if (err || transaction.nModified == 0) {
                                    data.response = res.__('Error in data, Please check your data');
                                    res.send(data);
                                  } else {
                                    var message = CONFIG.NOTIFICATION.PAYMENT_COMPLETED;
                                    var options = {
                                      'job_id': request.job_id,
                                      'provider_id': provider_id
                                    };
  
                                    // push.sendPushnotification(Bookings.user, message, 'payment_paid', 'ANDROID', options, 'USER', function (err, Response, body) { });
                                    // push.sendPushnotification(provider_id, message, 'payment_paid', 'ANDROID', options, 'PROVIDER', function (err, Response, body) { });
                                    res.send({
                                      'status': '2',
                                      'response': res.__('Transaction partially completed due to insufficient balance in your wallet account,Complete the transaction by recharging the wallet account or by using credit card.!!'),
                                      'due_amount': ((balanceamount) * currencies.value).toFixed(2),
                                      'used_amount': (wallet_amount * currencies.value).toFixed(2),
                                      'available_wallet_amount': '0'
                                    });
                                    //start mail
                                    var options = {};
                                    options.populate = 'tasker user category';
                                    db.GetOneDocument('task', {
                                      'booking_id': req.body.job_id
                                    }, {}, options, function(err, maildocdata) {
                                      if (err) {
                                        res.send(err);
                                      } else {
                                        db.GetOneDocument('settings', {
                                          'alias': 'general'
                                        }, {}, {}, function(err, settings) {
                                          if (err) {
                                            res.send(err);
                                          } else {
                                            // PARTIALLY PAID mail Content
                                            var notifications = {
                                              'job_id': maildocdata.booking_id,
                                              'user_id': maildocdata.tasker._id
                                            };
                                            var message = CONFIG.NOTIFICATION.BILLING_AMOUNT_PARTIALLY_PAID;
                                            push.sendPushnotification(maildocdata.tasker._id, message, 'partially_paid', 'ANDROID', notifications, 'PROVIDER', function(err, response, body) {});
                                            // push.sendPushnotification(maildocdata.user._id, message, 'payment_paid', 'ANDROID', notifications, 'USER', function (err, response, body) { });
                                            // res.send(maildocdata);
                                            db.GetOneDocument('currencies', {
                                              'default': 1
                                            }, {}, {}, function(err, currencies) {
                                              if (err) {
                                                res.send(err);
                                              } else {
                                                var MaterialFee, CouponCode, DateTime, BookingDate;
                                                if (maildocdata.invoice.amount.extra_amount) {
                                                  MaterialFee = (maildocdata.invoice.amount.extra_amount).toFixed(2);
                                                } else {
                                                  MaterialFee = '0.00';
                                                }
                                                if (maildocdata.invoice.amount.coupon) {
                                                  CouponCode = maildocdata.invoice.amount.coupon;
                                                } else {
                                                  CouponCode = 'Not assigned';
                                                }
                                                DateTime = moment(maildocdata.history.job_started_time).format('DD/MM/YYYY - HH:mm');
                                                BookingDate = moment(maildocdata.history.booking_date).format('DD/MM/YYYY');
                                                db.GetDocument('emailtemplate', {
                                                  name: {
                                                    $in: ['PartialPaymentToAdmin', 'PartialPaymentToTasker', 'PartialPaymentToUser']
                                                  },
                                                  'status': {
                                                    $ne: 0
                                                  }
                                                }, {}, {}, function(err, template) {
                                                  if (err) {
                                                    res.send(err)
                                                  } else {
                                                    /*var html = template[0].email_content;
                                                    html = html.replace(/{{mode}}/g, maildocdata.payment_type + "(Partially Paid )");
                                                    html = html.replace(/{{materialfee}}/g, currencies.symbol + MaterialFee);
                                                    html = html.replace(/{{coupon}}/g, currencies.symbol + ' ' + CouponCode);
                                                    html = html.replace(/{{datetime}}/g, DateTime);
                                                    html = html.replace(/{{bookingdata}}/g, BookingDate);
                                                    html = html.replace(/{{site_url}}/g, settings.settings.site_url);
                                                    html = html.replace(/{{site_title}}/g, settings.settings.site_title);
                                                    html = html.replace(/{{Site_title}}/g, settings.settings.site_title);
                                                    html = html.replace(/{{logo}}/g, settings.settings.site_url + settings.settings.logo);
                                                    html = html.replace(/{{t_username}}/g, maildocdata.tasker.username);
                                                    html = html.replace(/{{taskeraddress}}/g, maildocdata.tasker.availability_address);
                                                    html = html.replace(/{{bookingid}}/g, maildocdata.booking_id);
                                                    html = html.replace(/{{u_username}}/g, maildocdata.user.username);
                                                    html = html.replace(/{{useraddress}}/g, maildocdata.service_address || ' ');
                                                    html = html.replace(/{{categoryname}}/g, maildocdata.booking_information.work_type);
                                                    html = html.replace(/{{hourlyrates}}/g, currencies.symbol + ' ' + (maildocdata.hourly_rate).toFixed(2));
                                                    html = html.replace(/{{hourlyrate}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.minimum_cost).toFixed(2));
                                                    html = html.replace(/{{totalhour}}/g, maildocdata.invoice.worked_hours_human);
                                                    html = html.replace(/{{totalamount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.grand_total).toFixed(2));
                                                    html = html.replace(/{{total}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.total).toFixed(2));
                                                    html = html.replace(/{{actualamount}}/g, currencies.symbol + ' ' + ((maildocdata.invoice.amount.grand_total - maildocdata.invoice.amount.admin_commission) - MaterialFee).toFixed(2));
                                                    html = html.replace(/{{adminamount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.admin_commission).toFixed(2));
                                                    html = html.replace(/{{amountpaid}}/g, currencies.symbol + ' ' + (wallet.total).toFixed(2));
                                                    html = html.replace(/{{balamount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.balance_amount).toFixed(2));
                                                    html = html.replace(/{{privacy}}/g, settings.settings.site_url + 'pages/privacypolicy');
                                                    html = html.replace(/{{terms}}/g, settings.settings.site_url + 'pages/termsandconditions');
                                                    html = html.replace(/{{Servicetax}}/g, currencies.symbol + ' ' + maildocdata.invoice.amount.service_tax.toFixed(2));
  
                                                    var options = {
                                                      format: 'Letter'
                                                    };
                                                    var pdfname = new Date().getTime();
                                                    pdf.create(html, options).toFile('./uploads/invoice/' + pdfname + '.pdf', function(err, document) {
  
                                                      if (err) {
                                                        res.send(err);
                                                      } else {
  
                                                        var mailOptions = {
                                                          from: template[0].sender_email,
                                                          to: settings.settings.email_address,
                                                          subject: template[0].email_subject,
                                                          text: "Please Download the attachment to see Your Payment Details",
                                                          html: '<b>Please Download the attachment to see Your Payment Details</b>',
                                                          attachments: [{
                                                            filename: 'Admin Payment.pdf',
                                                            path: './uploads/invoice/' + pdfname + '.pdf',
                                                            contentType: 'application/pdf'
                                                          }],
                                                        };
  
                                                      }
                                                      mail.send(mailOptions, function(err, response) {});
                                                    });
                                                    var html2 = template[1].email_content;
                                                    html2 = html2.replace(/{{mode}}/g, maildocdata.payment_type + "(Partially Paid )");
                                                    html2 = html2.replace(/{{materialfee}}/g, currencies.symbol + MaterialFee);
                                                    html2 = html2.replace(/{{coupon}}/g, currencies.symbol + ' ' + CouponCode);
                                                    html2 = html2.replace(/{{datetime}}/g, DateTime);
                                                    html2 = html2.replace(/{{bookingdata}}/g, BookingDate);
                                                    html2 = html2.replace(/{{site_url}}/g, settings.settings.site_url);
                                                    html2 = html2.replace(/{{site_title}}/g, settings.settings.site_title);
                                                    html2 = html2.replace(/{{Site_title}}/g, settings.settings.site_title);
                                                    html2 = html2.replace(/{{logo}}/g, settings.settings.site_url + settings.settings.logo);
                                                    html2 = html2.replace(/{{t_username}}/g, maildocdata.tasker.username);
                                                    html2 = html2.replace(/{{taskeraddress}}/g, maildocdata.tasker.availability_address);
                                                    html2 = html2.replace(/{{bookingid}}/g, maildocdata.booking_id);
                                                    html2 = html2.replace(/{{u_username}}/g, maildocdata.user.username);
                                                    html2 = html2.replace(/{{useraddress}}/g, maildocdata.service_address || ' ');
                                                    html2 = html2.replace(/{{categoryname}}/g, maildocdata.booking_information.work_type);
                                                    html2 = html2.replace(/{{hourlyrates}}/g, currencies.symbol + ' ' + (maildocdata.hourly_rate).toFixed(2));
                                                    html2 = html2.replace(/{{hourlyrate}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.minimum_cost).toFixed(2));
                                                    html2 = html2.replace(/{{totalhour}}/g, maildocdata.invoice.worked_hours_human);
                                                    html2 = html2.replace(/{{totalamount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.grand_total).toFixed(2));
                                                    html2 = html2.replace(/{{total}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.total).toFixed(2));
                                                    html2 = html2.replace(/{{actualamount}}/g, currencies.symbol + ' ' + ((maildocdata.invoice.amount.grand_total - maildocdata.invoice.amount.admin_commission) - MaterialFee).toFixed(2));
                                                    html2 = html2.replace(/{{amountpaid}}/g, currencies.symbol + ' ' + (wallet.total).toFixed(2));
                                                    html2 = html2.replace(/{{balamount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.balance_amount).toFixed(2));
                                                    html2 = html2.replace(/{{privacy}}/g, settings.settings.site_url + 'pages/privacypolicy');
                                                    html2 = html2.replace(/{{terms}}/g, settings.settings.site_url + 'pages/termsandconditions');
                                                    html2 = html2.replace(/{{Servicetax}}/g, currencies.symbol + ' ' + maildocdata.invoice.amount.service_tax.toFixed(2));
                                                    html2 = html2.replace(/{{admincommission}}/g, currencies.symbol + ' ' + maildocdata.invoice.amount.admin_commission.toFixed(2));
                                                    html2 = html2.replace(/{{email}}/g, req.body.email);
  
                                                    var options = {
                                                      format: 'Letter'
                                                    };
                                                    var pdfname1 = new Date().getTime();
                                                    pdf.create(html2, options).toFile('./uploads/invoice/' + pdfname1 + '.pdf', function(err, document) {
  
                                                      if (err) {
                                                        res.send(err);
                                                      } else {
  
                                                        var mailOptions1 = {
                                                          from: template[1].sender_email,
                                                          to: maildocdata.tasker.email,
                                                          subject: template[1].email_subject,
                                                          text: "Please Download the attachment to see Your Payment Details",
                                                          html: '<b>Please Download the attachment to see Your Payment Details</b>',
                                                          attachments: [{
                                                            filename: CONFIG.TASKER + ' Payment.pdf',
                                                            path: './uploads/invoice/' + pdfname1 + '.pdf',
                                                            contentType: 'application/pdf'
                                                          }],
                                                        };
                                                      }
  
                                                      mail.send(mailOptions1, function(err, response) {});
                                                    });
  
  
  
                                                    var html3 = template[2].email_content;
                                                    html3 = html3.replace(/{{mode}}/g, maildocdata.payment_type + "(Partially Paid )");
                                                    html3 = html3.replace(/{{materialfee}}/g, currencies.symbol + MaterialFee);
                                                    html3 = html3.replace(/{{coupon}}/g, currencies.symbol + ' ' + CouponCode);
                                                    html3 = html3.replace(/{{datetime}}/g, DateTime);
                                                    html3 = html3.replace(/{{bookingdata}}/g, BookingDate);
                                                    html3 = html3.replace(/{{site_url}}/g, settings.settings.site_url);
                                                    html3 = html3.replace(/{{site_title}}/g, settings.settings.site_title);
                                                    html3 = html3.replace(/{{Site_title}}/g, settings.settings.site_title);
                                                    html3 = html3.replace(/{{logo}}/g, settings.settings.site_url + settings.settings.logo);
                                                    html3 = html3.replace(/{{t_username}}/g, maildocdata.tasker.username);
                                                    html3 = html3.replace(/{{taskeraddress}}/g, maildocdata.tasker.availability_address);
                                                    html3 = html3.replace(/{{bookingid}}/g, maildocdata.booking_id);
                                                    html3 = html3.replace(/{{u_username}}/g, maildocdata.user.username);
                                                    html3 = html3.replace(/{{useraddress}}/g, maildocdata.service_address || ' ');
                                                    html3 = html3.replace(/{{categoryname}}/g, maildocdata.booking_information.work_type);
                                                    html3 = html3.replace(/{{hourlyrates}}/g, currencies.symbol + ' ' + (maildocdata.hourly_rate).toFixed(2));
                                                    html3 = html3.replace(/{{hourlyrate}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.minimum_cost).toFixed(2));
                                                    html3 = html3.replace(/{{totalhour}}/g, maildocdata.invoice.worked_hours_human);
                                                    html3 = html3.replace(/{{totalamount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.grand_total).toFixed(2));
                                                    html3 = html3.replace(/{{total}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.total).toFixed(2));
                                                    html3 = html3.replace(/{{actualamount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.total - maildocdata.invoice.amount.grand_total).toFixed(2));
                                                    html3 = html3.replace(/{{amountpaid}}/g, currencies.symbol + ' ' + (wallet.total).toFixed(2));
                                                    html3 = html3.replace(/{{balamount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.balance_amount).toFixed(2));
                                                    html3 = html3.replace(/{{privacy}}/g, settings.settings.site_url + 'pages/privacypolicy');
                                                    html3 = html3.replace(/{{terms}}/g, settings.settings.site_url + 'pages/termsandconditions');
                                                    html3 = html3.replace(/{{Servicetax}}/g, currencies.symbol + ' ' + maildocdata.invoice.amount.service_tax.toFixed(2));
                                                    html3 = html3.replace(/{{admincommission}}/g, currencies.symbol + ' ' + maildocdata.invoice.amount.admin_commission.toFixed(2));
                                                    html3 = html3.replace(/{{email}}/g, req.body.email);
  
                                                    var options = {
                                                      format: 'Letter'
                                                    };
                                                    var pdfname2 = new Date().getTime();
                                                    pdf.create(html3, options).toFile('./uploads/invoice/' + pdfname2 + '.pdf', function(err, document) {
  
                                                      if (err) {
                                                        res.send(err);
                                                      } else {
  
                                                        var mailOptions2 = {
                                                          from: template[2].sender_email,
                                                          to: maildocdata.user.email,
                                                          subject: template[2].email_subject,
                                                          text: "Please Download the attachment to see Your Payment Details",
                                                          html: '<b>Please Download the attachment to see Your Payment Details</b>',
                                                          attachments: [{
                                                            filename: CONFIG.USER + ' Payment.pdf',
                                                            path: './uploads/invoice/' + pdfname2 + '.pdf',
                                                            contentType: 'application/pdf'
                                                          }],
                                                        };
                                                      }
  
                                                      mail.send(mailOptions2, function(err, response) {});
                                                    });*/
                                                  }
                                                });
                                              }
                                            });
                                          }
                                        });
                                      }
                                    }); //end mail
                                  }
                                });
                              }
                            });
                          }
                        });
                      } else {
  
                        var paymenttype = {};
                        if (Bookings.payment_type == 'wallet-other') {
                          paymenttype = 'wallet-wallet';
                        } else {
                          paymenttype = 'wallet';
                        }
  
                        var provider_id = Bookings.tasker;

                        var job_charge = '';

                        if (Bookings.invoice.amount.total) {
                          if(Bookings.invoice.amount.extra_amount > 0 && !Bookings.invoice.amount.discount) {
                            job_charge = Bookings.invoice.amount.total + Bookings.invoice.amount.service_tax + Bookings.invoice.amount.extra_amount;
                          } else if(Bookings.invoice.amount.discount > 0 && !Bookings.invoice.amount.extra_amount) {
                            job_charge = Bookings.invoice.amount.total + Bookings.invoice.amount.service_tax - Bookings.invoice.amount.discount;
                          } else if(Bookings.invoice.amount.extra_amount > 0 && Bookings.invoice.amount.discount > 0) {
                            job_charge = Bookings.invoice.amount.total + Bookings.invoice.amount.service_tax + Bookings.invoice.amount.extra_amount - Bookings.invoice.amount.discount;
                          } else {
                            job_charge = Bookings.invoice.amount.total + Bookings.invoice.amount.service_tax;
                          }
                        }

                        var walletArr = {
                          'type': 'DEBIT',
                          'debit_type': 'payment',
                          'ref_id': req.body.job_id,
                          'trans_amount': parseFloat(job_charge),
                          'avail_amount': wallet.total - job_charge,
                          'trans_date': new Date(),
                        };
                        var totalwallet = wallet_amount - job_charge;
                        db.UpdateDocument('walletReacharge', {
                          'user_id': request.user_id
                        }, {
                          $push: {
                            transactions: walletArr
                          },
                          $set: {
                            "total": parseFloat(wallet.total - job_charge)
                          }
                        }, {
                          multi: true
                        }, function(walletUErr, walletURespo) {
                          if (walletUErr || walletURespo.nModified == 0) {
  
                            data.response = res.__('Error in data, Please check your data');
                            res.send(data);
                          } else {
                            var transaction = {
                              'user': request.user_id,
                              'tasker': Bookings.tasker,
                              'task': Bookings._id,
                              'type': paymenttype,
                              'amount': job_charge,
                              'task_date': Bookings.createdAt,
                              'status': 1
                            };
                            db.InsertDocument('transaction', transaction, function(err, transaction) {
                              if (err || transaction.nModified == 0) {
                                data.response = res.__('Error in data, Please check your data');
                                res.send(data);
                              } else {
                                var transactions = [transaction._id];
                                db.UpdateDocument('task', {
                                  "booking_id": req.body.job_id
                                }, {
                                  $push: {
                                    transactions
                                  },
                                  'invoice.status': '1',
                                  'status': '7',
                                  'payment_type': paymenttype,
                                  'history.job_closed_time': new Date()
                                }, function(err, docdata) {
                                  if (err || docdata.nModified == 0) {
                                    data.response = res.__('Error in data, Please check your data');
                                    res.send(data);
                                  } else {
                                    var message = CONFIG.NOTIFICATION.PAYMENT_COMPLETED;
                                    var options = {
                                      'job_id': request.job_id,
                                      'provider_id': provider_id
                                    };
                                    push.sendPushnotification(Bookings.user, message, 'payment_paid', 'ANDROID', options, 'USER', function(err, Response, body) {});
                                    push.sendPushnotification(provider_id, message, 'payment_paid', 'ANDROID', options, 'PROVIDER', function(err, Response, body) {});
                                    res.send({
                                      'status': '1',
                                      'message': res.__('Payment Completed Successfully'),
                                      'response': res.__('Wallet amount used successfully'),
                                      'used_amount': (job_charge * currencies.value).toFixed(2),
                                      'available_wallet_amount': ((wallet.total - job_charge) * currencies.value).toFixed(2)
                                    });
                                    //mail start
                                    var options = {};
                                    options.populate = 'tasker user category';
                                    db.GetOneDocument('task', {
                                      'booking_id': req.body.job_id
                                    }, {}, options, function(err, maildocdata) {
                                      if (err) {
                                        res.send(err);
                                      } else {
                                        db.GetOneDocument('settings', {
                                          'alias': 'general'
                                        }, {}, {}, function(err, settings) {
                                          if (err) {
                                            res.send(err);
                                          } else {
  
  
                                            db.GetOneDocument('currencies', {
                                              'default': 1
                                            }, {}, {}, function(err, currencies) {
                                              if (err) {
                                                res.send(err);
                                              } else {
                                                var MaterialFee, CouponCode, DateTime, BookingDate;
                                                if (maildocdata.invoice.amount.extra_amount) {
                                                  MaterialFee = (maildocdata.invoice.amount.extra_amount).toFixed(2);
                                                } else {
                                                  MaterialFee = '0.00';
                                                }
                                                if (maildocdata.invoice.amount.coupon) {
                                                  CouponCode = maildocdata.invoice.amount.coupon;
                                                } else {
                                                  CouponCode = 'Not assigned';
                                                }
                                                DateTime = moment(maildocdata.history.job_started_time).format('DD/MM/YYYY - HH:mm');
                                                BookingDate = moment(maildocdata.history.booking_date).format('DD/MM/YYYY');
                                                db.GetDocument('emailtemplate', {
                                                  name: {
                                                    $in: ['PaymentDetailstoAdmin', 'PaymentDetailstoTasker', 'PaymentDetailstoUser']
                                                  },
                                                  'status': {
                                                    $ne: 0
                                                  }
                                                }, {}, {}, function(err, template) {
                                                  if (err) {
                                                    res.send(data);
                                                  } else {
  
                                                    /*var userfirstname = '';
                                                    userfirstname = maildocdata.user.username;
  
                                                    var html = template[0].email_content;
                                                    html = html.replace(/{{mode}}/g, maildocdata.payment_type);
                                                    html = html.replace(/{{materialfee}}/g, currencies.symbol + ' ' + MaterialFee);
                                                    html = html.replace(/{{coupon}}/g, CouponCode);
                                                    html = html.replace(/{{datetime}}/g, DateTime);
                                                    html = html.replace(/{{bookingdata}}/g, BookingDate);
                                                    html = html.replace(/{{site_url}}/g, settings.settings.site_url);
                                                    html = html.replace(/{{site_title}}/g, settings.settings.site_title);
                                                    html = html.replace(/{{logo}}/g, settings.settings.site_url + settings.settings.logo);
                                                    html = html.replace(/{{t_username}}/g, maildocdata.tasker.username);
                                                    html = html.replace(/{{taskeraddress}}/g, maildocdata.tasker.availabililty_address);
                                                    //html = html.replace(/{{taskeraddress1}}/g, maildocdata.tasker.address.city);
                                                    //html = html.replace(/{{taskeraddress2}}/g, maildocdata.tasker.address.state);
                                                    html = html.replace(/{{bookingid}}/g, maildocdata.booking_id);
                                                    html = html.replace(/{{u_username}}/g, userfirstname);
                                                    html = html.replace(/{{useraddress}}/g, maildocdata.service_address || ' ');
                                                    //html = html.replace(/{{useraddress1}}/g, maildocdata.user.address.city || ' ');
                                                    //html = html.replace(/{{useraddress2}}/g, maildocdata.user.address.state || ' ');
                                                    html = html.replace(/{{categoryname}}/g, maildocdata.booking_information.work_type);
                                                    html = html.replace(/{{hourlyrates}}/g, currencies.symbol + ' ' + (maildocdata.hourly_rate).toFixed(2));
                                                    html = html.replace(/{{totalhour}}/g, currencies.symbol + ' ' + maildocdata.invoice.worked_hours_human);
                                                    html = html.replace(/{{totalamount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.grand_total).toFixed(2));
                                                    html = html.replace(/{{total}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.total).toFixed(2));
                                                    html = html.replace(/{{amount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.grand_total - maildocdata.invoice.amount.admin_commission).toFixed(2));
                                                    html = html.replace(/{{actualamount}}/g, currencies.symbol + ' ' + ((maildocdata.invoice.amount.grand_total - maildocdata.invoice.amount.admin_commission) - MaterialFee).toFixed(2));
                                                    html = html.replace(/{{adminamount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.admin_commission).toFixed(2));
                                                    html = html.replace(/{{privacy}}/g, settings.settings.site_url + 'pages/privacypolicy');
                                                    html = html.replace(/{{terms}}/g, settings.settings.site_url + 'pages/termsandconditions');
                                                    html = html.replace(/{{Servicetax}}/g, currencies.symbol + ' ' + maildocdata.invoice.amount.service_tax.toFixed(2));
                                                    var options = {
                                                      format: 'Letter'
                                                    };
                                                    var pdfname = new Date().getTime();
                                                    pdf.create(html, options).toFile('./uploads/invoice/' + pdfname + '.pdf', function(err, document) {
  
                                                      if (err) {
                                                        res.send(err);
                                                      } else {
  
                                                        var mailOptions = {
                                                          from: template[0].sender_email,
                                                          to: settings.settings.email_address,
                                                          subject: template[0].email_subject,
                                                          text: "Please Download the attachment to see Your Payment",
                                                          html: '<b>Please Download the attachment to see Your Payment</b>',
                                                          attachments: [{
                                                            filename: 'Admin Partial Payment.pdf',
                                                            path: './uploads/invoice/' + pdfname + '.pdf',
                                                            contentType: 'application/pdf'
                                                          }],
                                                        };
                                                      }
  
                                                      mail.send(mailOptions, function(err, response) {});
                                                    });
  
                                                    var html2 = template[1].email_content;
                                                    html2 = html2.replace(/{{mode}}/g, maildocdata.payment_type);
                                                    html2 = html2.replace(/{{materialfee}}/g, currencies.symbol + ' ' + MaterialFee);
                                                    html2 = html2.replace(/{{coupon}}/g, CouponCode);
                                                    html2 = html2.replace(/{{datetime}}/g, DateTime);
                                                    html2 = html2.replace(/{{bookingdata}}/g, BookingDate);
                                                    html2 = html2.replace(/{{site_url}}/g, settings.settings.site_url);
                                                    html2 = html2.replace(/{{site_title}}/g, settings.settings.site_title);
                                                    html2 = html2.replace(/{{logo}}/g, settings.settings.site_url + settings.settings.logo);
                                                    html2 = html2.replace(/{{t_username}}/g, maildocdata.tasker.username);
                                                    html2 = html2.replace(/{{taskeraddress}}/g, maildocdata.tasker.availability_address);
                                                    //html2 = html2.replace(/{{taskeraddress1}}/g, maildocdata.tasker.address.city);
                                                    //html2 = html2.replace(/{{taskeraddress2}}/g, maildocdata.tasker.address.state);
                                                    html2 = html2.replace(/{{bookingid}}/g, maildocdata.booking_id);
                                                    html2 = html2.replace(/{{u_username}}/g, userfirstname);
                                                    html2 = html2.replace(/{{useraddress}}/g, maildocdata.service_address || ' ');
                                                    //html2 = html2.replace(/{{useraddress1}}/g, maildocdata.user.address.city || ' ');
                                                    //html2 = html2.replace(/{{useraddress2}}/g, maildocdata.user.address.state || ' ');
                                                    html2 = html2.replace(/{{categoryname}}/g, maildocdata.booking_information.work_type);
                                                    html2 = html2.replace(/{{hourlyrates}}/g, currencies.symbol + ' ' + (maildocdata.hourly_rate).toFixed(2));
                                                    html2 = html2.replace(/{{totalhour}}/g, currencies.symbol + ' ' + maildocdata.invoice.worked_hours_human);
                                                    html2 = html2.replace(/{{totalamount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.grand_total - maildocdata.invoice.amount.service_tax).toFixed(2));
                                                    html2 = html2.replace(/{{total}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.total).toFixed(2));
                                                    html2 = html2.replace(/{{amount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.grand_total - maildocdata.invoice.amount.admin_commission).toFixed(2));
                                                    html2 = html2.replace(/{{actualamount}}/g, currencies.symbol + ' ' + ((maildocdata.invoice.amount.grand_total - maildocdata.invoice.amount.admin_commission) - maildocdata.invoice.amount.service_tax).toFixed(2));
                                                    html2 = html2.replace(/{{admincommission}}/g, currencies.symbol + ' ' + maildocdata.invoice.amount.admin_commission.toFixed(2));
                                                    html2 = html2.replace(/{{privacy}}/g, settings.settings.site_url + 'pages/privacypolicy');
                                                    html2 = html2.replace(/{{terms}}/g, settings.settings.site_url + 'pages/termsandconditions');
                                                    html2 = html2.replace(/{{Servicetax}}/g, currencies.symbol + ' ' + maildocdata.invoice.amount.service_tax.toFixed(2));
                                                    var options = {
                                                      format: 'Letter'
                                                    };
                                                    var pdfname1 = new Date().getTime();
                                                    pdf.create(html2, options).toFile('./uploads/invoice/' + pdfname1 + '.pdf', function(err, document) {
  
                                                      if (err) {
                                                        res.send(err);
                                                      } else {
  
                                                        var mailOptions1 = {
                                                          from: template[1].sender_email,
                                                          to: maildocdata.tasker.email,
                                                          subject: template[1].email_subject,
                                                          text: "Please Download the attachment to see Your Payment",
                                                          html: '<b>Please Download the attachment to see Your Payment</b>',
                                                          attachments: [{
                                                            filename: CONFIG.TASKER + ' Partial Payment.pdf',
                                                            path: './uploads/invoice/' + pdfname1 + '.pdf',
                                                            contentType: 'application/pdf'
                                                          }],
                                                        };
                                                      }
  
                                                      mail.send(mailOptions1, function(err, response) {});
                                                    });
  
                                                    var html3 = template[2].email_content;
                                                    html3 = html3.replace(/{{mode}}/g, maildocdata.payment_type);
                                                    html3 = html3.replace(/{{materialfee}}/g, currencies.symbol + ' ' + MaterialFee);
                                                    html3 = html3.replace(/{{coupon}}/g, CouponCode);
                                                    html3 = html3.replace(/{{datetime}}/g, DateTime);
                                                    html3 = html3.replace(/{{bookingdata}}/g, BookingDate);
                                                    html3 = html3.replace(/{{site_url}}/g, settings.settings.site_url);
                                                    html3 = html3.replace(/{{site_title}}/g, settings.settings.site_title);
                                                    html3 = html3.replace(/{{logo}}/g, settings.settings.site_url + settings.settings.logo);
                                                    html3 = html3.replace(/{{t_username}}/g, maildocdata.tasker.username);
                                                    //html3 = html3.replace(/{{taskeraddress}}/g, maildocdata.tasker.availability_address);
                                                    //html3 = html3.replace(/{{taskeraddress1}}/g, maildocdata.tasker.address.city);
                                                    html3 = html3.replace(/{{taskeraddress2}}/g, maildocdata.tasker.address.state);
                                                    html3 = html3.replace(/{{bookingid}}/g, maildocdata.booking_id);
                                                    html3 = html3.replace(/{{u_username}}/g, userfirstname);
                                                    html3 = html3.replace(/{{useraddress}}/g, maildocdata.service_address || ' ');
                                                    //html3 = html3.replace(/{{useraddress1}}/g, maildocdata.user.address.city || ' ');
                                                    //html3 = html3.replace(/{{useraddress2}}/g, maildocdata.user.address.state || ' ');
                                                    html3 = html3.replace(/{{categoryname}}/g, maildocdata.booking_information.work_type);
                                                    html3 = html3.replace(/{{hourlyrates}}/g, currencies.symbol + ' ' + (maildocdata.hourly_rate).toFixed(2));
                                                    html3 = html3.replace(/{{hourlyrate}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.minimum_cost).toFixed(2));
                                                    html3 = html3.replace(/{{totalhour}}/g, maildocdata.invoice.worked_hours_human);
                                                    html3 = html3.replace(/{{totalamount}}/g, currencies.symbol + ' ' + maildocdata.invoice.amount.grand_total.toFixed(2));
                                                    html3 = html3.replace(/{{total}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.total).toFixed(2));
                                                    html3 = html3.replace(/{{amount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.grand_total - maildocdata.invoice.amount.admin_commission).toFixed(2));
                                                    html3 = html3.replace(/{{actualamount}}/g, currencies.symbol + ' ' + (maildocdata.invoice.amount.total - maildocdata.invoice.amount.grand_total).toFixed(2));
                                                    html3 = html3.replace(/{{admincommission}}/g, currencies.symbol + ' ' + maildocdata.invoice.amount.admin_commission.toFixed(2));
                                                    html3 = html3.replace(/{{privacy}}/g, settings.settings.site_url + 'pages/privacypolicy');
                                                    html3 = html3.replace(/{{terms}}/g, settings.settings.site_url + 'pages/termsandconditions');
                                                    html3 = html3.replace(/{{Servicetax}}/g, currencies.symbol + ' ' + maildocdata.invoice.amount.service_tax.toFixed(2));
                                                    var options = {
                                                      format: 'Letter'
                                                    };
                                                    var pdfname2 = new Date().getTime();
                                                    pdf.create(html3, options).toFile('./uploads/invoice/' + pdfname2 + '.pdf', function(err, document) {
  
                                                      if (err) {
                                                        res.send(err);
                                                      } else {
  
                                                        var mailOptions2 = {
                                                          from: template[2].sender_email,
                                                          to: maildocdata.user.email,
                                                          subject: template[2].email_subject,
                                                          text: "Please Download the attachment to see Your Payment",
                                                          html: '<b>Please Download the attachment to see Your Payment</b>',
                                                          attachments: [{
                                                            filename: CONFIG.USER + ' Payment.pdf',
                                                            path: './uploads/invoice/' + pdfname2 + '.pdf',
                                                            contentType: 'application/pdf'
                                                          }],
                                                        };
                                                      }
  
                                                      mail.send(mailOptions2, function(err, response) {});
                                                    });*/
                                                  }
                                                });
                                              }
                                            });
                                          }
                                        });
                                      }
                                    }); // mail end
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  
    controller.byGateway = function(req, res) {
      var errors = [];
      req.checkBody('job_id', res.__('Job ID is Required')).notEmpty();
      req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
      req.checkBody('gateway', res.__('Gateway ID is Required')).notEmpty();
      errors = req.validationErrors();
      if (errors) {
        res.send({
          "status": "0",
          "errors": errors[0].msg
        });
        return;
      }
      var data = {};
      data.user_id = req.body.user_id;
      data.job_id = req.body.job_id;
      data.payment = req.body.gateway;
  
      req.sanitizeBody('job_id').trim();
      req.sanitizeBody('user_id').trim();
      req.sanitizeBody('gateway').trim();
  
      var request = {};
      request.job_id = req.body.job_id;
      request.user_id = req.body.user_id;
      request.gateway = req.body.gateway;
  
      var extension = {};
      extension.populate = 'tasker';
      db.GetOneDocument('task', {
        'booking_id': request.job_id,
        'user': request.user_id,
        'status': 6
      }, {}, extension, function(err, task) {
        if (err || !task) {
          res.send({
            'status': '0',
            'response': res.__('INVALID DATA')
          });
        } else {
          if (task.tasker) {
            db.GetDocument('paymentgateway', {
              'alias': req.body.gateway,
              'status': 1
            }, {}, {}, function(paymentErr, paymentRespo) {
              if (paymentErr || !paymentRespo) {
                res.send({
                  'status': '0',
                  'response': res.__('INVALID  DATA')
                });
              } else { 
                var amount_to_receive = '';
                if (task.invoice.amount.total) {
                  if(task.invoice.amount.extra_amount > 0 && !task.invoice.amount.discount) {
                    amount_to_receive = task.invoice.amount.total + task.invoice.amount.service_tax + task.invoice.amount.extra_amount;
                  } else if(task.invoice.amount.discount > 0 && !task.invoice.amount.extra_amount) {
                    amount_to_receive = task.invoice.amount.total + task.invoice.amount.service_tax - task.invoice.amount.discount;
                  } else if(task.invoice.amount.extra_amount > 0 && task.invoice.amount.discount > 0) {
                    amount_to_receive = task.invoice.amount.total + task.invoice.amount.service_tax + task.invoice.amount.extra_amount - task.invoice.amount.discount;
                  } else {
                    amount_to_receive = task.invoice.amount.total + task.invoice.amount.service_tax;
                  }
                }
				console.log("balance amount", task.invoice.amount.balance_amount);
				if(task.invoice.amount.balance_amount > 0) {
					amount_to_receive = task.invoice.amount.balance_amount;
				}
				
                var transaction = {};
                transaction.user = request.user_id;
                transaction.tasker = task.tasker._id;
                transaction.task = task._id;
                transaction.type = request.gateway;
                transaction.amount = amount_to_receive;
                transaction.task_date = task.createdAt;
                transaction.status = 2;
				console.log("amount after partial payment", transaction.amount);
                db.InsertDocument('transaction', transaction, function(err, transaction) {
                  if (err || transaction.nModified == 0) {
                    data.response = res.__('Error in saving your data');
                    res.send(data);
                  } else {
                    res.send({
                      'status': '1',
                      'job_id': request.job_id,
                      'mobile_id': transaction._id,

                    });
                  }
                });
              }
            });
          } else {
            res.send({
              'status': '0',
              'response': res.__('INVALID DATA')
            });
          }
        }
      });
    }
  
  
  
    controller.applyCoupon = function(req, res) {
  
      var status = '0';
      var response = '';
      var errors = [];
  
      req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
      req.checkBody('code', res.__('Coupon code is Required')).notEmpty();
      req.checkBody('pickup_date', res.__('Pick Up Date is Required')).notEmpty();
      errors = req.validationErrors();
      if (errors) {
        res.send({
          "status": "0",
          "response": errors[0].msg
        });
        return;
      }
  
  
      var data = {};
      data.user_id = req.body.user_id;
      data.code = req.body.code;
      data.reach_date = req.body.pickup_date;
  
      db.GetOneDocument('users', {
        _id: req.body.user_id
      }, {}, {}, function(err, userRespo) {
        if (userRespo) {
          db.GetOneDocument('coupon', {
            code: req.body.code
          }, {}, {}, function(promoErr, promoRespo) {
            if (err || !promoRespo) {
              res.send({
                "status": "0",
                "response": res.__("Invalid Coupon")
              });
            } else {
              var valid_from = promoRespo.valid_from;
              var valid_to = promoRespo.expiry_date;
              var date_time = new Date(req.body.pickup_date);
  
              if ((Date.parse(valid_from) <= Date.parse(date_time)) && (Date.parse(valid_to) >= Date.parse(date_time))) {
                //if (promoRespo.total_coupons > promoRespo.per_user) {
                /*
                var coupon_usage = [];
                var coupon_count = 0;
                if (promoRespo.usage) {
                    coupon_usage = promoRespo[0].usage;
                    for (var i = 0; i < promoRespo[0].usage.length; i++) {
                        if (promoRespo[0].usage[i].user_id && promoRespo[0].usage[i].user_id == req.body.user_id) {
                            coupon_count++;
                        }
                    }
                }
                if (coupon_count <= promoRespo[0].user_usage) {
                */
                res.send({
                  "status": "1",
                  "response": [{
                    "message": res.__("Coupon code applied."),
                    "code": req.body.code
                  }]
                });
                /*
                }
                } else {
                    res.send({ "status": "0", "response": "Coupon Expired" });
                }
                */
              } else {
                res.send({
                  "status": "0",
                  "response": res.__("Coupon Expired")
                });
              }
            }
          });
        } else {
          res.send({
            "status": "0",
            "response": res.__("Invalid " + CONFIG.USER)
          });
        }
      });
    };
  
  
    return controller;
  
  }