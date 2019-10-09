"use strict";

module.exports = function (io, res) {
  var bcrypt = require('bcrypt-nodejs');
  var async = require("async");
  var GoogleAPI = require('../../model/googleapis.js');
  var mongoose = require("mongoose");
  var db = require('../../model/mongodb.js');
  var twilio = require('../../model/twilio.js');
  var library = require('../../model/library.js');
  var crypto = require('crypto');
  var fs = require("fs");
  var attachment = require('../../model/attachments.js');
  var middlewares = require('../../model/middlewares.js');
  var Jimp = require("jimp");
  var path = require('path');
  var taskTimeLibrary = require('../../model/tasktime.js')(io, res);
  var taskLibrary = require('../../model/task.js')(io);
  var moment = require("moment");
  var CONFIG = require('../../config/config');
  var push = require('../../model/pushNotification.js')(io);
  var mailcontent = require('../../model/mailcontent.js');
  var timezone = require('moment-timezone');
  var htmlToText = require('html-to-text');
  var jwt = require('jsonwebtoken');
  var deg2rad = require('deg2rad');
  var util = require('util');
  var schedule = require('node-schedule');

  function jwtSign(payload) {
    var token = jwt.sign(payload, CONFIG.SECRET_KEY);
    return token;
  }

  var controller = {};

  controller.fbLogin = function (req, res) {
    var errors = [];
    req.checkBody('email_id', res.__('email_id  is Required')).optional();
    req.checkBody('deviceToken', res.__('deviceToken is Required')).optional();
    req.checkBody('gcm_id', res.__('Invalid Gcm id')).optional();
    req.checkBody('fb_id', res.__('fb_id  is Required')).optional();
    req.checkBody('prof_pic', res.__('prof_pic  is Required')).optional();

    errors = req.validationErrors();

    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }

    var status = '0';
    var message = '';
    var data = {};

    data.email = req.body.email_id;
    data.token = req.body.deviceToken;
    data.gcm = req.body.gcm_id;
    data.fb_id = req.body.fb_id;
    data.prof_pic = req.body.prof_pic;

    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
      if (err) {
        res.send({
          "status": 0,
          "message": res.__('Please check the email and try again')
        });
      } else {
        db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
          if (err || !currencies) {
            res.send({
              "status": 0,
              "message": res.__('Please check the email and try again')
            });
          } else {
            db.GetDocument('users', { email: data.email }, {}, {}, function (err, docs) {
              if (err || !docs[0]) {
                res.send({
                  "status": 0,
                  "message": res.__('Your account is currently unavailable')
                });
              } else {
                if (docs[0].status == 1) {
                  db.UpdateDocument('users', { 'email': data.email }, { 'activity.last_login': new Date(), 'media_id': data.fb_id }, {}, function (err, response) {
                    if (err || response.nModified == 0) {
                      res.send({
                        "status": 0,
                        "message": res.__('Please check the email and try again')
                      });
                    } else {
                      if (data.token) {
                        db.UpdateDocument('users', { 'email': data.email }, { 'device_info.device_type': 'ios', 'device_info.device_token': data.token, 'activity.last_login': new Date() }, {}, function (err, response) {
                          if (err || response.nModified == 0) {
                            res.send({
                              "status": 0,
                              "message": res.__('Please check the email and try again')
                            });
                          } else {
                            var insertdocID = docs[0]._id;
                            var key = '';
                            var push_data = {};
                            push_data["push_notification_key"] = {};
                            var is_alive_other = "No";
                            var existingKey = '';
                            var user_image = '';
                            if (docs[0].avatar) {
                              user_image = settings.settings.site_url + docs[0].avatar;
                            } else {
                              user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }

                            var wallet_amount;
                            db.GetDocument('walletReacharge', { "user_id": docs[0]._id }, {}, {}, function (usererr, walletdata) {
                              var location_id = '';
                              if (docs[0].location_id) {
                                if (docs[0].location_id != '') {
                                  location_id = docs[0].location_id;
                                }
                              }
                              var wallet_amount = 0;
                              if (walletdata[0]) {
                                wallet_amount = walletdata[0].total || 0;
                              }
                              res.send({
                                user_image: user_image,
                                prof_pic: data.prof_pic,
                                soc_key: crypto.createHash('md5').update(docs[0]._id.toString()).digest('hex'),
                                user_id: docs[0]._id,
                                user_name: docs[0].username,
                                email: docs[0].email,
                                user_group: "User",
                                country: docs[0].address.country,
                                status: docs[0].status,
                                message: res.__("You are Logged In successfully"),
                                currency: currencies.code,
                                img_name: docs[0].img_name,
                                img_path: docs[0].img_path,
                                referal_code: docs[0].referral_code || "",
                                is_alive_other: "No",
                                location_name: docs[0].address.city || "",
                                country_code: docs[0].phone.code,
                                phone_number: docs[0].phone.number,
                                location_id: docs[0].location_id || "",
                                wallet_amount: wallet_amount,
                                category: "",
                                provider_notification: docs[0].provider_notification || ""
                              })
                            });

                          }
                        });
                      } else {
                        db.UpdateDocument('users', { 'email': data.email }, { 'device_info.device_type': 'android', 'device_info.gcm': data.gcm, 'activity.last_login': new Date() }, {}, function (err, response) {
                          if (err || response.nModified == 0) {
                            res.send({
                              "status": 0,
                              "message": res.__('Please check the email and try again')
                            });
                          } else {
                            var insertdocID = docs[0]._id;
                            var key = '';
                            var push_data = {};
                            push_data["push_notification_key"] = {};
                            var is_alive_other = "No";
                            var existingKey = '';
                            var user_image = '';
                            if (docs[0].avatar) {
                              user_image = settings.settings.site_url + docs[0].avatar;
                            } else {
                              user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }

                            var wallet_amount;
                            db.GetDocument('walletReacharge', { "user_id": docs[0]._id }, {}, {}, function (usererr, walletdata) {
                              var location_id = '';
                              if (docs[0].location_id) {
                                if (docs[0].location_id != '') {
                                  location_id = docs[0].location_id;
                                }
                              }
                              var wallet_amount = 0;
                              if (walletdata[0]) {
                                wallet_amount = walletdata[0].total || 0;
                              }
                              res.send({
                                user_image: user_image,
                                prof_pic: data.prof_pic,
                                soc_key: crypto.createHash('md5').update(docs[0]._id.toString()).digest('hex'),
                                user_id: docs[0]._id,
                                // user_name: docs[0].username,
                                user_name: docs[0].username,
                                email: docs[0].email,
                                user_group: "User",
                                country: docs[0].address.country,
                                status: docs[0].status,
                                message: res.__("You are Logged In successfully"),
                                currency: currencies.code,
                                img_name: docs[0].img_name,
                                img_path: docs[0].img_path,
                                referal_code: docs[0].referral_code || "",
                                is_alive_other: "No",
                                location_name: docs[0].address.city || "",
                                country_code: docs[0].phone.code,
                                phone_number: docs[0].phone.number,
                                location_id: docs[0].location_id || "",
                                wallet_amount: wallet_amount,
                                category: "",
                                provider_notification: docs[0].provider_notification || ""
                              })
                            });

                          }
                        });
                      }

                    }
                  });
                } else {
                  if (docs[0].status == 0) {
                    res.send({
                      "status": 0,
                      "message": res.__('Your account is currently unavailable')
                    });
                  } else {
                    res.send({
                      "status": 0,
                      "message": res.__('Your account has been inactivated')
                    });
                  }
                }

              }
            });
          }
        });
      }
    });
  };


  controller.fbRegister = function (req, res) {
    var errors = [];
    req.checkBody('user_name', res.__('user_name is Required')).notEmpty();
    req.checkBody('email_id', res.__('email_id  is Required')).notEmpty();
    req.checkBody('first_name', res.__('first_name  is Required')).optional();
    req.checkBody('last_name', res.__('last_name  is Required')).optional();
    req.checkBody('country_code', res.__('country_code is Required')).notEmpty();
    req.checkBody('phone', res.__('phone no  is Required')).notEmpty();
    req.checkBody('fb_id', res.__('fb_id  is Required')).notEmpty();

    req.checkBody('deviceToken', res.__('deviceToken is Required')).optional();
    req.checkBody('gcm_id', res.__('Invalid Gcm id')).optional();
    req.checkBody('prof_pic', res.__('prof_pic  is Required')).optional();

    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }

    var status = '0';
    var message = '';

    var data = {};
    data.user_name = req.body.user_name;
    data.email = req.body.email_id;
    data.first_name = req.body.first_name;
    data.last_name = req.body.last_name;
    data.token = req.body.deviceToken;
    data.gcm = req.body.gcm_id;
    data.fb_id = req.body.fb_id;
    data.prof_pic = req.body.prof_pic;
    data.country_code = req.body.country_code;
    data.phone = req.body.phone;
    db.GetDocument('users', { email: data.email }, {}, {}, function (err, user) {
      if (err || !user) { res.send({ "status": "0", "message": res.__("No " + CONFIG.USER + " Found for this Email") }); } else {
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
          if (err || !settings) {
            res.send({ "status": "0", "message": res.__("Configure your website settings") });
          } else {
            var newdata = { phone: {} };
            newdata.user_type = 'Normal';
            newdata.username = data.user_name;
            newdata.unique_code = library.randomString(8, '#A');
            newdata.role = 'user';
            newdata.email = data.email;
            newdata.media_id = data.fb_id;
            //  newdata.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
            newdata.status = 1;
            newdata.phone.code = data.country_code;
            newdata.phone.number = data.phone;
            newdata.verification_code = [{ "email": library.randomString(6, '#') }];
            db.InsertDocument('users', newdata, function (err, response) {
              if (err) {
                res.send({ "status": "0", "message": res.__("Username or Phone Number Already Registered") });
              } else {
                db.UpdateDocument('users', { '_id': response._id }, { 'name.first_name': data.first_name, 'name.last_name': data.last_name }, {}, function (err, responseuser) {
                  if (err || responseuser.nModified == 0) { res.send({ "status": "0", "message": res.__("No " + CONFIG.USER + " Found for this Email") }); } else {
                    db.GetOneDocument('users', { '_id': response._id }, {}, {}, function (err, usermailrefer) {
                      if (err || !usermailrefer) { res.send({ "status": "0", "message": res.__("No " + CONFIG.USER + " Found for this Email") }); } else {
                        var insertdocID = response._id;
                        var key = '';
                        var mailData = {};
                        mailData.template = 'Sighnupmessage';
                        mailData.to = response.email;
                        mailData.html = [];
                        mailData.html.push({ name: 'referal_code', value: usermailrefer.unique_code || "" });
                        mailData.html.push({ name: 'name', value: response.username || "" });
                        mailData.html.push({ name: 'email', value: response.email || "" });
                        mailcontent.sendmail(mailData, function (err, response) { });


                        var mailData1 = {};
                        mailData1.template = 'usersignupmessagetoadmin';
                        mailData1.to = "";
                        mailData1.html = [];
                        mailData1.html.push({ name: 'name', value: response.username || "" });
                        mailData1.html.push({ name: 'referal_code', value: usermailrefer.unique_code || "" });
                        mailcontent.sendmail(mailData1, function (err, response) { });
                        db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
                          if (err || !currencies) {
                            res.send({
                              "status": 0,
                              "message": res.__('Error in registration')
                            });
                          } else {
                            if (data.token) {
                              db.UpdateDocument('users', { 'email': data.email }, { 'device_info.device_type': 'ios', 'device_info.device_token': data.deviceToken, 'activity.last_login': new Date() }, {}, function (err, responseuser) {
                                if (err || responseuser.nModified == 0) {
                                  res.send({
                                    "status": 0,
                                    "message": res.__('Please check the email and try again')
                                  });
                                } else {
                                  res.send({
                                    "status": '1',
                                    "message": res.__('Successfully registered'),
                                    "prof_pic": data.prof_pic,
                                    "is_alive_other": "Yes",
                                    "user_image": settings.settings.site_url + 'uploads/images/default_avat.png',
                                    "user_id": insertdocID,
                                    "soc_key": bcrypt.hashSync(insertdocID, bcrypt.genSaltSync(8), null),
                                    "user_name": response.username,
                                    "user_group": "User",
                                    "email": response.email,
                                    "country_code": response.phone.code,
                                    "phone_number": response.phone.number,
                                    "referal_code": response.unique_code,
                                    // "referal_code": data.unique_code,
                                    "key": key,
                                    "currency": currencies.code,
                                    "category": "",
                                    // "wallet_amount": (walletReachargeRepo.total).toString() || 0
                                    "wallet_amount": 0
                                  });
                                }
                              });
                            } else if (data.gcm) {
                              db.UpdateDocument('users', { 'email': data.email }, { 'device_info.device_type': 'android', 'device_info.gcm': data.gcm_id, 'activity.last_login': new Date() }, {}, function (err, responseuser) {
                                if (err || responseuser.nModified == 0) {
                                  res.send({
                                    "status": 0,
                                    "message": res.__('Please check the email and try again')
                                  });
                                } else {
                                  res.send({
                                    "status": '1',
                                    "message": res.__('Successfully registered'),
                                    "prof_pic": data.prof_pic,
                                    "is_alive_other": "Yes",
                                    "user_image": settings.settings.site_url + 'uploads/images/default_avat.png',
                                    "user_id": insertdocID,
                                    "soc_key": bcrypt.hashSync(insertdocID, bcrypt.genSaltSync(8), null),
                                    "user_name": response.username,
                                    "user_group": "User",
                                    "email": response.email,
                                    "country_code": response.phone.code,
                                    "phone_number": response.phone.number,
                                    "referal_code": response.unique_code,
                                    // "referal_code": data.unique_code,
                                    "key": key,
                                    "currency": currencies.code,
                                    "category": "",
                                    //"wallet_amount": (walletReachargeRepo.total).toString() || 0
                                    "wallet_amount": 0
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
        });
      }
    });
  };

  controller.fbcheckUser = function (req, res) {
    var errors = [];
    req.checkBody('email_id', res.__('Valid email is required')).isEmail();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }
    if (Object.keys(req.body).length >= 1) {
      db.GetDocument('users', { email: req.body.email_id }, {}, {}, function (err, emaildocs) {
        if (err) {
          res.send(err);
        } else {
          if (emaildocs.length >= 1) {
            if (emaildocs.status != "Active") {
              res.send({
                "status": "0",
                "message": res.__("Email Already Exists!")
              });
            } else {
              res.send({
                "status": "0",
                "message": res.__("Your account is currenty unavailable")
              });
            }
          } else {
            db.GetDocument('users', { "phone.number": req.body.phone, "phone.code": req.body.country_code }, {}, {}, function (err, phonedocs) {
              if (err) {
                res.send({ "status": "0", "message": res.__("mobile number exist") });
              } else {
                db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
                  if (err) {
                    res.send(err);
                  } else {
                    if (phonedocs.length == 0) {
                      var status = true;
                      if (req.body.referal_code != '') {
                        db.GetDocument('users', { 'unique_code': req.body.referal_code, "phone.code": req.body.country_code }, {}, {}, function (err, uniqueCodedocs) {
                          if (uniqueCodedocs.length > 0) {
                            status = true;
                          }
                        });
                      } else {
                        status = true;
                      }
                      if (status) {
                        var key = '';
                        if (req.body.gcm_id != "") {
                          key = req.body.gcm_id;
                        } else if (req.body.deviceToken != "") {
                          key = req.body.deviceToken;
                        }
                        // var secret = otp.generateSecret();
                        var otp_string = library.randomString(6, '#');
                        
                        var otp_status = "development";
                        if (settings.settings.twilio.mode == 'production') {
                          otp_status = "production";
                          var message = util.format(CONFIG.SMS.USER_ACTIVATION, otp_string);
                          twilio.createMessage(req.body.country_code, req.body.phone, message, function (err, response) { });
                        }
                        res.send({
                          message: res.__("Success"),
                          user_name: req.body.user_name,
                          email: req.body.email_id,
                          country_code: req.body.country_code,
                          phone_number: req.body.phone,
                          referal_code: req.body.referal_code,
                          key: key,
                          otp_status: otp_status,
                          otp: otp_string,
                          status: '1'
                        });
                      } else {
                        res.send({ "status": "0", "message": res.__("invaild_referral") });
                      }
                    } else {
                      res.send({ "status": "0", "message": res.__("mobile number exist") });
                    }
                  }
                });
              }
            });
          }
        }
      });
    } else {
      res.send(res.__("Enter Required Fields"));
    }
  };

  controller.appInfo = function (req, res) {
    var data = {};
    data.status = 0;
    db.GetDocument('settings', { 'alias': ['general', 'mobile'] }, {}, {}, function (err, settings) {
      if (err) {
        data.response = res.__('Invalid Error, Please check your data');
        res.send(data);
      } else {
        res.send({
          'status': 1,
          'site_title': settings[0].settings.site_title,
          'site_url': settings[0].settings.site_url,
          'email_address': settings[0].settings.email_address,
          'admin_commission': settings[0].settings.admin_commission,
          'minimum_amount': settings[0].settings.minimum_amount,
          'service_tax': settings[0].settings.service_tax,
		  'date_format': settings[0].settings.date_format,
          'time_zone': settings[0].settings.time_zone,
          'distance_by' : settings[0].settings.distanceby,
          'logo': settings[0].settings.site_url + settings[0].settings.logo,
          'favicon': settings[0].settings.site_url + settings[0].settings.favicon,
          'google_api': CONFIG.GOOGLE_MAP_API_KEY_SERVER,
          'SECRET_KEY': CONFIG.SECRET_KEY,
          'GCM_KEY': CONFIG.GCM_KEY,
          'ios_map_api': {'user': settings[1].settings.apns.mapuserios, 'tasker': settings[1].settings.apns.maptaskerios},
          'android_map_api': {'user': settings[1].settings.gcm.mapuserandroid, 'tasker': settings[1].settings.gcm.maptaskerandroid}
        });
      }
    });
  };
  controller.aboutUs = function (req, res) {
    var data = {};
    data.status = 0;
    db.GetOneDocument('pages', { 'slug': 'aboutus' }, {}, {}, function (err, pages) {
      if (err) {
        data.response = res.__('Invalid Error, Please check your data');
        res.send(data);
      } else {
        var pug = {};
        pug.transaction = pages.description;
        res.render('mobile/about_us', pug);
      }
    });

  };
  controller.termsandconditions = function (req, res) {
    var data = {};
    data.status = 0;
    db.GetOneDocument('pages', { 'slug': 'termsandconditions' }, {}, {}, function (err, pages) {
      if (err) {
        data.response = res.__('Invalid Error, Please check your data');
        res.send(data);
      } else {
        var pug = {};
        pug.transaction = pages.description;
        res.render('mobile/about_us', pug);
      }
    });

  };

  controller.privacypolicy = function (req, res) {
    var data = {};
    data.status = 0;
    db.GetOneDocument('pages', { 'slug': 'privacypolicy' }, {}, {}, function (err, pages) {
      if (err) {
        data.response = res.__('Invalid Error, Please check your data');
        res.send(data);
      } else {
        var pug = {};
        pug.transaction = pages.description;
        res.render('mobile/about_us', pug);
      }
    });

  };

  controller.logout = function (req, res) {
    var data = {};
    data.status = 0;
    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('device_type', res.__('device_type  is Required')).notEmpty();
    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data);
      return;
    }
    req.sanitizeBody('user_id').trim();
    req.sanitizeBody('device_type').trim();
    var request = {};
    request.user_id = req.body.user_id;
    request.device = req.body.device_type;

    db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, user) {
      if (err || !user) {
        data.response = res.__('Invalid ' + CONFIG.USER);
        res.send(data);
      } else {
        if (request.device == 'android') {
          //   db.UpdateDocument('users', { '_id': request.user_id, 'device_info.device_type': request.device }, { 'device_info.gcm': '' }, {}, function (err, response) {
          db.UpdateDocument('users', { '_id': request.user_id }, { 'device_info.gcm': '', 'activity.last_logout': new Date() }, {}, function (err, response) {
            if (err || response.nModified == 0) {
              data.response = res.__('Invalid Credential');
              res.send(data);
            } else {
              data.status = 1;
              data.response = res.__('Logout Done Successfully');
              data.user_name = user.username;
              res.send(data);
            }
          });
        } else if (request.device == 'ios') {
          // db.UpdateDocument('users', { '_id': request.user_id, 'device_info.device_type': request.device }, { 'device_info.device_token': '' }, {}, function (err, response) {
          db.UpdateDocument('users', { '_id': request.user_id }, { 'device_info.device_token': '', 'activity.last_logout': new Date() }, {}, function (err, response) {
            if (err || response.nModified == 0) {
              data.response = res.__('Invalid Credential');
              res.send(data);
            } else {
              data.status = 1;
              data.response = res.__('Logout Done Successfully');
              data.user_name = user.username;
              res.send(data);
            }
          });
        }
      }
    });
  };



  controller.checkUser = function (req, res) {
    console.log("req.body", req.body);
    var errors = [];
    req.checkBody('phone', res.__('Valid phone number is required')).notEmpty();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }
    var request = {};
    request.country_code = req.body.phone.code;
    request.phone_number = req.body.phone.number;

    db.GetDocument('users', { 'phone.code': request.country_code, 'phone.number': request.phone_number }, {}, {}, function (err, user) {
      if (err) {
        res.send(err);
      } else {
        if (user.length > 0) { //existing user
          if(user[0].status != 0) {
            db.GetDocument('settings', { 'alias': ['sms', 'general'] }, {}, {}, function (err, settings) {
              if (err) {
                res.send(err);
              } else {
                  var status = true;                                  
                  var key = '';
                  if (req.body.gcm_id != "") {
                    key = req.body.gcm_id;
                  } else if (req.body.deviceToken != "") {
                    key = req.body.deviceToken;
                  }
                  var otp_string = library.randomString(6, '#');
                  var otp_status = "development";
                  if (settings[1].settings.twilio.mode == 'production') {
                    otp_status = "production";
                    var to = request.country_code + request.phone_number;
                    var message = util.format(CONFIG.SMS.USER_ACTIVATION, otp_string);
                    twilio.createMessage(to, '', message, function (err, response) {});
                  }
                  
                  res.send({
                    user_type: 'existing',
                    phone: {'code':request.country_code, 'number': request.phone_number},
                    key: key,
                    otp_status: otp_status,
                    otp: otp_string,
                    status: 1,
                    referral_status: settings[0].settings.referral.status
                  });
                
              }
            });
          } else {
            res.send({status: 0, 'msg': 'Your account has been deleted'});
          }
        } else { // new user 
            db.GetDocument('settings', { 'alias': ['sms', 'general'] }, {}, {}, function (err, settings) {
              if (err) {
                res.send(err);
              } else {
                var status = true;                                  
                var key = '';
                if (req.body.gcm_id != "") {
                  key = req.body.gcm_id;
                } else if (req.body.deviceToken != "") {
                  key = req.body.deviceToken;
                }
                var otp_string = library.randomString(6, '#');
                var otp_status = "development";
                if (settings[1].settings.twilio.mode == 'production') {
                  otp_status = "production";
                  var to = request.country_code + request.phone_number;
                  var message = util.format(CONFIG.SMS.USER_ACTIVATION, otp_string);
                  twilio.createMessage(to, '', message, function (err, response) {});
                }
                res.send({
                  user_type: 'new',
                  phone: {'code':request.country_code, 'number': request.phone_number},
                  key: key,
                  otp_status: otp_status,
                  otp: otp_string,
                  status: 1,
                  referral_status: settings[0].settings.referral.status
                });
              }
            });
          }
        }
    });
  };


  controller.mailVerification = function (req, res) {
    var data = {};
    var request = {};
    request.code = req.body.data.formData;
    request.user_id = req.body.data.userid;
    db.UpdateDocument('users', { '_id': req.body.data.userid }, { 'emergency_contact.verification.email': 1 }, {}, function (err, response) {
      if (err || response.nModified == 0) {
        data.status = '0';
        data.response = 'Errror!';
        res.status(400).send(data);
      } else {
        data.status = '1';
        res.send(data);
      }
    });
  };

  controller.changeName = function (req, res) {
    var data = {};
    data.status = 0;

    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('firstname', res.__('Firstname  is Required')).notEmpty();
    req.checkBody('lastname', res.__('Lastname  is Required')).notEmpty();
    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data); return;
    }

    req.sanitizeBody('user_id').trim();
    req.sanitizeBody('firstname').trim();
    req.sanitizeBody('lastname').trim();

    var request = {};
    request.user_id = req.body.user_id;
    request.firstname = req.body.firstname;
    request.lastname = req.body.lastname;
    request.username = req.body.firstname + ' ' +req.body.lastname;

    db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, user) {
      if (err || !user) {
        data.response = res.__('Invalid User');
        res.send(data);
      } else {
        user.firstname = request.firstname;
        user.lastname = request.lastname;
        user.username = request.username;
        db.UpdateDocument('users', { '_id': request.user_id }, user, {}, function (err, response) {
          if (err) {
            data.response = res.__('Name Already Exists');
            res.send(data);
          } else {
            data.status = 1;
            data.response = res.__('Name Changed Successfully');
            data.firstname = user.firstname;
            data.lastname = user.lastname;
            res.send(data);
          }
        });
      }
    });
  };

  controller.changeMobile = function (req, res) {
    
    var data = {};
    data.status = 0;
    req.checkBody('user_id', res.__('Invalid ' + CONFIG.USER + ' id')).notEmpty();
    req.checkBody('country_code', res.__('Valid Country code is required')).notEmpty();
    req.checkBody('phone_number', res.__('Valid Phone number is required')).notEmpty();
    req.checkBody('otp').optional();
    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data); return;
    }
    req.sanitizeBody('user_id').trim();
    req.sanitizeBody('country_code').trim();
    req.sanitizeBody('phone_number').trim();
    req.sanitizeBody('otp').trim();
    var request = {};
    request.user_id = req.body.user_id;
    request.country_code = req.body.country_code;
    request.phone_number = req.body.phone_number;
    request.otp = req.body.otp;
    data.country_code = req.body.country_code;
    data.phone_number = req.body.phone_number;
    var phone = {};
    phone.code = req.body.country_code;
    phone.number = req.body.phone_number;
    db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, CheckPhone) {
      if (err) {
        data.response = res.__('Invalid ' + CONFIG.USER + ' , ' + CONFIG.USER + ' Not Found');
        res.send(data);
      }
     

      else {
        db.GetOneDocument('users', { '_id': { '$ne': request.user_id }, 'phone.code': req.body.country_code, 'phone.number': req.body.phone_number }, {}, {}, function (err, CheckotherPhone) {
          if (err || CheckotherPhone) {
            data.response = res.__('Phone Number Already Exists!');
            res.send(data);
          }
          else {
            db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, user) {
              if (err || !user) {
                data.response = res.__('Invalid ' + CONFIG.USER + ' , ' + CONFIG.USER + ' Not Found');
                res.send(data);
              } else {
                db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {

                  if (err) {
                    res.send(err);
                  } else {
                    if (user.otp && user.otp == request.otp) {
                      user.phone = phone;
                      user.otp = '';
                      db.UpdateDocument('users', { '_id': request.user_id }, user, {}, function (err, response) {
                        if (err) {
                          data.response = res.__('Unable to Change your Mobile Number');
                          res.send(data);
                        } else {
                          data.status = 1;
                          data.response = res.__('Updated Successfully');
                          res.send(data);
                        }
                      });
                    } else {
                      var to = request.country_code + request.phone_number;
                      var new_otp = library.randomString(6, '#');
                      //var message = 'Dear ' + user.username + '! your one time password is ' + new_otp;
                      var message = util.format(CONFIG.SMS.UPDATE_MOBILE_NUMBER, user.username, request.reset);
                      if (settings.settings.twilio.mode == "development") {
                        user.otp = new_otp;
                        db.UpdateDocument('users', { '_id': request.user_id }, user, {}, function (err, users) {
                          
                          if (err) {
                            data.response = res.__('Unable to Sent OTP for you');
                            res.send(data);
                          } else {
                            data.status = 1;
                            data.otp = new_otp;
                            data.otp_status = 'development';
                            data.response = res.__('OTP Sent Successfully');
                            res.send(data);
                          }
                        });
                      } else {
                        twilio.createMessage(to, '', message, function (err, response) {
                          
                          if (err) {
                            data.response = res.__('Unable to Sent OTP for you');
                            res.send(data);
                          } else {
                            user.otp = new_otp;
                            db.UpdateDocument('users', { '_id': request.user_id }, user, {}, function (err, users) {
                              
                              if (err) {
                                data.response = res.__('Unable to Sent OTP for you');
                                res.send(data);
                              } else {
                                data.status = 1;
                                data.otp = new_otp;
                                data.otp_status = 'production';
                                data.response = res.__('OTP Sent Successfully');
                                res.send(data);
                              }
                            });
                          }
                        });
                      }
                    }
                  }
                });
              }
            });
          }
        });
      }
    });
  };

  controller.recentuserBooking = function (req, res) {

    var status = '0';
    var response = '';
    var errors = [];
    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('type', res.__('Type is Required')).notEmpty();
    req.checkBody('perPage', res.__('Per Page is Required')).notEmpty();
    req.checkBody('page', res.__('Page is Required')).notEmpty();
    req.checkBody('orderby', res.__('Enter valid order')).optional();
    req.checkBody('sortby', res.__('Enter valid option')).optional();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }
    req.sanitizeBody('user_id').trim();
    req.sanitizeBody('perPage').trim();
    req.sanitizeBody('page').trim();
    req.sanitizeBody('orderby').trim();
    req.sanitizeBody('sortby').trim();
    try {
      var data = {};
      data.user_id = req.body.user_id.trim();
      data.type = req.body.type;
      data.orderby = parseInt(req.body.orderby) || -1;
      data.page = parseInt(req.body.page) || 1;
      data.perPage = parseInt(req.body.perPage);
      data.sortby = req.body.sortby || 'date';

      if (data.perPage <= 0) {
        data.perPage = 20;
      }
      if (data.sortby == 'name') {
        data.sortby = 'service_type'
      } else if (data.sortby == 'date') {
        data.sortby = 'booking_date'
      }
      var sorting = {};
      sorting[data.sortby] = data.orderby;
      if (req.body.user_id != '') {
        db.GetOneDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
          if (userErr || !userRespo) {
            res.send({
              "status": "0",
              "response": res.__("Invalid " + CONFIG.USER + ", Please check your data")
            });
          } else {
            if (data.type == 'today') {
              var currdate = moment(Date.now()).format('MM/DD/YYYY');
              var t1 = currdate + ' 00:00:00';
              var t2 = currdate + ' 23:59:59';
              var query = {
                'user': new mongoose.Types.ObjectId(req.body.user_id), 'status': { "$ne": 10 },
                "booking_information.booking_date": { '$gte': new Date(t1), '$lte': new Date(t2) }
              };
            } else if (data.type == 'upcoming') {
              var query = {
                'user': new mongoose.Types.ObjectId(req.body.user_id), 'status': { "$ne": 10 },
                "booking_information.booking_date": { '$gt': new Date() }
              };
            } else if (data.type == 'recent') {
              var today = new Date();
              var yesterday = new Date(today.setDate(today.getDate() - 1))
              var sdate = moment(yesterday).format('MM/DD/YYYY');
              var yesdat = sdate + ' 00:00:00';
              var query = {
                'user': new mongoose.Types.ObjectId(req.body.user_id), 'status': { "$ne": 10 },
                "booking_information.booking_date": { '$gte': new Date(yesdat), '$lte': new Date() }
              };
            }
            db.GetCount('task', query, function (err, count) {
              if (err || count == 0) {
                res.send({
                  "status": "0",
                  "response": res.__("No New Task Found")
                });
              } else {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                  if (err || !settings) {
                    data.response = res.__('Configure your website settings');
                    res.send(data);
                  }
                  else {
                    db.GetAggregation('task', [
                      { $match: query },
                      { "$lookup": { from: "tasker", localField: "tasker", foreignField: "_id", as: "tasker" } },
                      { "$lookup": { from: "categories", localField: "category", foreignField: "_id", as: "icon_normal" } },
                      { $unwind: { path: "$tasker", preserveNullAndEmptyArrays: true } },
                      { $unwind: { path: "$icon_normal", preserveNullAndEmptyArrays: true } },
                      {
                        "$group": {
                          "_id": "$_id",
                          "job_id": { "$first": "$booking_id" },
                          "tasker_id": { "$first": "$tasker._id" },
                          "tasker_name": { "$first": "$tasker.username" },
                          "status": { "$first": "$status" },
                          "task_id": { "$first": "$_id" },
                          "job_time": { "$first": "$booking_information.est_reach_date" },
                          "job_date": { "$first": "$booking_information.est_reach_date" },
                          "service_type": { "$first": "$booking_information.service_type" },
                          "service_icon": {
                            "$first": {
                              $cond: ["$icon_normal", "$icon_normal.image", { $literal: settings.settings.site_url + CONFIG.CATEGORY_DEFAULT_IMAGE }]
                            }
                          },
                          "booking_date": { "$first": "$booking_information.booking_date" },
                          "job_status": { "$first": "$status" },
                          "country_code": { "$first": "$tasker.phone.code" },
                          "contact_number": { "$first": "$tasker.phone.number" },
                          "doCall": {
                            "$first": {
                              $cond: { if: { $and: [{ $ne: ["$status", 7] }, { $ne: ["$status", 8] }] }, then: { $literal: "Yes" }, else: { $literal: "No" } }
                            }
                          },
                          "isSupport": {
                            "$first": {
                              $cond: { if: "$tasker.phone.number", then: { $literal: "No" }, else: { $literal: "Yes" } }
                            }
                          },
                          "doMsg": {
                            "$first": {
                              $cond: { if: { $and: [{ $ne: ["$status", 7] }, { $ne: ["$status", 8] }] }, then: { $literal: "Yes" }, else: { $literal: "No" } }
                            }
                          },
                          "doCancel": {
                            "$first": {
                              $cond: { if: { $and: [{ $ne: ["$status", 6] }, { $ne: ["$status", 7] }, { $ne: ["$status", 8] }] }, then: { $literal: "Yes" }, else: { $literal: "No" } }
                            }
                          },
                        }
                      },
                      { "$sort": sorting },
                      { "$skip": (data.perPage * (data.page - 1)) },
                      { "$limit": data.perPage }
                    ], function (err, bookings) {

                      if (err || bookings.length == 0) {
                        res.send({
                          "status": "0",
                          "response": res.__("No New Task Found")
                        });
                      } else {
                        for (var i = 0; i < bookings.length; i++) {

                          if (bookings[i].service_icon) {
                            bookings[i].service_icon = settings.settings.site_url + bookings[i].service_icon;
                          }
                          var bookdate = bookings[i].booking_date;
                          bookings[i].booking_date = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.date_format);
                          bookings[i].job_date = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.date_format);
                          bookings[i].job_time = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.time_format);
                          switch (bookings[i].status) {
                            case 1:
                              bookings[i].job_status = 'Request Sent';
                              break;
                            case 2:
                              bookings[i].job_status = 'Accepted';
                              break;
                            case 3:
                              bookings[i].job_status = 'StartOff';
                              break;
                            case 4:
                              bookings[i].job_status = 'Arrived';
                              break;
                            case 5:
                              bookings[i].job_status = 'StartJob';
                              break;
                            case 6:
                              bookings[i].job_status = 'Request Payment';
                              break;
                            case 7:
                              bookings[i].job_status = 'Completed';
                              break;
                            case 8:
                              bookings[i].job_status = 'Cancelled';
                              break;
                            case 9:
                              bookings[i].job_status = 'Dispute';
                              break;
                            default:
                              bookings[i].job_status = 'Onprogress';
                              break;
                          }
                        }
                        res.send({
                          "status": "1",
                          "response": {
                            "total_jobs": count,
                            "current_page": data.page,
                            "perPage": data.perPage,
                            "jobs": bookings
                          }
                        })
                      }
                    })
                  }
                });
              }
            });
          }
        });
      } else {
        res.send({
          "status": "0",
          "response": res.__("Some Parameters are missing")
        });
      }

    } catch (e) {
      res.send({
        "status": "0",
        "message": res.__("error in connection")
      });
    }
  }


  controller.changePassword = function (req, res) {
    var data = {};
    data.status = 0;

    req.checkBody('user_id', res.__('Valid ' + CONFIG.USER + ' ID is Invalid')).notEmpty();
    req.checkBody('password', res.__('Old Password is Invalid')).notEmpty();
    req.checkBody('new_password', res.__('New Password is Invalid')).notEmpty();
    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data); return;
    }

    req.sanitizeBody('user_id').trim();
    req.sanitizeBody('password').trim();
    req.sanitizeBody('new_password').trim();

    var request = {};
    request.user_id = req.body.user_id;
    request.password = req.body.password;
    request.new_password = req.body.new_password;
    db.GetOneDocument('users', { '_id': request.user_id }, { password: 1 }, {}, function (err, docdata) {
      if (err) {
        res.send(err);
      } else {
        bcrypt.compare(request.password, docdata.password, function (err, result) {
          if (result == true) {
            var input = (req.body.new_password).toString();
            var string = input;
            var firstcheck = new RegExp("^(?=.*[a-z])(?=.*[A-Z])");
            if (firstcheck.test(string)) {
              var recheck = new RegExp("^(?=.*[0-9]).{6,12}$");
              if (recheck.test(string)) {
                var password = bcrypt.hashSync(request.new_password, bcrypt.genSaltSync(8), null);
                bcrypt.compare(request.password, password, function (err, results) {
                  if (results == false) {
                    db.UpdateDocument('users', { '_id': request.user_id }, { 'password': password }, function (err, docdata) {
                      if (err) {
                        res.send(err);
                      } else {
                        data.status = 1;
                        data.response = res.__(CONFIG.USER + ' Password Changed Successfully');
                        res.send(data);
                      }
                    });
                  } else {
                    data.response = res.__('Current Password and New Password should not be same');
                    res.send(data);
                  }
                });
              } else {
                data.response = res.__('Password Must Contain One Numeric digit And Min 6 Characters Max 12 Characters');
                res.send(data);
              }
            } else {
              data.response = res.__('Password Must Contain Atleast One uppercase,One lower case');
              res.send(data);
            }
          } else {
            data.response = res.__('Please Check the Current Password You Entered ');
            res.send(data);
          }
        });
      }
    });
  };
  controller.resetPassword = function (req, res) {

    var data = {};
    data.status = 0;

    req.checkBody('email', res.__('Email or Phonenumber is Required')).notEmpty().withMessage('Valid Email or Phonenumber is Required');
    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data); return;
    }

    req.sanitizeBody('email').trim();

    var request = {};
    request.email = req.body.email;
    request.reset = library.randomString(6, '#');

    async.waterfall([
      function (callback) {
        db.GetOneDocument('users', { $or: [{ 'email': request.email }, { 'phone.number': request.email }] }, {}, {}, function (err, user) {
          if (err || !user) {
            data.response = res.__('No ' + CONFIG.USER + ' Found for this Email or Phone Number');
            res.send(data);
          } else { callback(err, user); }
        });
      },
      function (user, callback) {
        db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
          if (err || !settings) {
            data.response = res.__('No ' + CONFIG.USER + ' Found for this Email or Phone Number');
            res.send(data);
          } else { callback(err, user, settings); }
        });
      },
      function (user, settings, callback) {
        db.UpdateDocument('users', { '_id': user._id }, { 'reset_code': request.reset }, {}, function (err, response) {
          if (err || response.nModified == 0) {
            data.response = res.__('Unable to update your reset code');
            res.send(data);
          } else { callback(err, user, settings); }
        });
      }
    ], function (err, user, settings) {
      var mailData = {};
      mailData.template = 'Reset Password';
      mailData.to = user.email;
      mailData.html = [];
      mailData.html.push({ name: 'username', value: user.username || "" });
      mailData.html.push({ name: 'site_title', value: settings.settings.site_title || "" });
      mailData.html.push({ name: 'site_url', value: settings.settings.site_url || "" });
      mailData.html.push({ name: 'logo', value: settings.settings.logo || "" });
      mailData.html.push({ name: 'reset', value: request.reset || "" });
      mailcontent.sendmail(mailData, function (err, response) { });
      var to = user.phone.code + user.phone.number;
      //var message = 'Dear ' + user.username + '! Here is your verification code to reset your password ' + request.reset;
      var message = util.format(CONFIG.SMS.FORGOT_PASSWORD, user.username, request.reset);
      twilio.createMessage(to, '', message, function (err, response) { });
      if (settings.settings.twilio.mode == 'development') {
        data.sms_status = 'development';
      } else {
        data.sms_status = 'production';
      }
      data.status = 1;
      data.verification_code = request.reset;
      data.email_address = user.email;
      data.response = res.__('Reset Code Sent Successfully!');
      res.send(data);
    });
  };



  controller.updateResetPassword = function (req, res) {

    var data = {};
    data.status = 0;

    req.checkBody('email', res.__('Valid email is required')).notEmpty();
    req.checkBody('password', res.__('Password is invalid')).notEmpty();
    req.checkBody('reset', res.__('Valid Reset Code is required')).optional();

    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data); return;
    }

    req.sanitizeBody('email').trim();
    req.sanitizeBody('password').trim();
    req.sanitizeBody('reset').trim();

    var request = {};
    request.email = req.body.email;
    request.reset = req.body.reset;
    request.password = req.body.password;

    var input = (request.password).toString();
    var string = input;
    var firstcheck = new RegExp("^(?=.*[a-z])(?=.*[A-Z])");
    if (firstcheck.test(string)) {
      var recheck = new RegExp("^(?=.*[0-9]).{6,12}$");
      if (recheck.test(string)) {
        var password = bcrypt.hashSync(request.password, bcrypt.genSaltSync(8), null);
        async.waterfall([
          function (callback) {
            db.GetOneDocument('users', { $or: [{ 'email': request.email }, { 'phone.number': request.email }], 'reset_code': request.reset }, {}, {}, function (err, user) {
              if (err || !user) {
                data.response = res.__(CONFIG.USER + ' Email/Reset Code Invalid');
                res.send(data);
              } else { callback(err, user); }
            });
          },
          function (user, callback) {
            db.UpdateDocument('users', { '_id': user._id }, { 'password': password, $unset: { reset_code: 1 } }, {}, function (err, response) {
              if (err || response.nModified == 0) {
                data.response = res.__('Unable to update your reset code');
                res.send(data);
              } else { callback(err, response); }
            });
          },
        ], function (response) {
          data.status = 1;
          data.response = res.__('Password Changed Successfully');
          res.send(data);
        });
      } else {
        data.response = res.__('Password Must Contain One Numeric digit And Min 6 Characters Max 12 Characters');
        res.send(data);
      }
    } else {
      data.response = res.__('Password Must Contain Atleast One uppercase,One lower case');
      res.send(data);
    }
  };

  controller.login = function (req, res) {
    var errors = [];
    req.checkBody('phone_number', res.__('Valid Phone number is required')).notEmpty();
    req.checkBody('deviceToken', res.__('Invalid Device Token')).optional();
    req.checkBody('gcm_id', res.__('Invalid Gcm id')).optional();

    errors = req.validationErrors();

    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }
    if (!req.body.deviceToken) {
      if (!req.body.gcm_id) {
        res.send({
          "status": 3,
          "errors": "Send Valid Gcm id"
        });
        return;
      }
    }

    var status = '0';
    var message = '';
    var data = {};
    data.phone = req.body.phone_number;
    data.token = req.body.deviceToken;
    data.gcm = req.body.gcm_id;
  
    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
      if (err) {
        res.send({
          "status": 0,
          "message": res.__('Unable to fetch settings data')
        });
      } else {
        db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
          if (err || !currencies) {
            res.send({
              "status": 0,
              "message": res.__('Unable to fetch currencies data')
            });
          } else {
            db.GetDocument('users', { 'phone.number': data.phone, 'status': { $ne: 0 } }, {}, {}, function (err, docs) {
              if (err || !docs[0]) {
                res.send({
                  "status": 0,
                  "message": res.__('Please Register')
                });
              } else {
                    if (docs[0].status == 1) {
                      db.UpdateDocument('users', { 'phone.number': data.phone }, { 'activity.last_login': new Date() }, {}, function (err, response) {

                        if (err || response.nModified == 0) {
                          res.send({
                            "status": 0,
                            "message": res.__('Unable to update user data')
                          });
                        } else {
          
                          if (data.token) {
                            db.UpdateDocument('users', { 'phone.number': data.phone }, { 'device_info.device_type': 'ios', 'device_info.device_token': data.token, 'activity.last_login': new Date() }, {}, function (err, response) {
                              if (err || response.nModified == 0) {
                                res.send({
                                  "status": 0,
                                  "message": res.__('Unable to update user data')
                                });
                              } else {
                                var insertdocID = docs[0]._id;
                                var key = '';
                                var push_data = {};
                                push_data["push_notification_key"] = {};
                                var is_alive_other = "No";
                                var existingKey = '';
                                var user_image = '';
                                if (docs[0].avatar) {
                                  user_image = settings.settings.site_url + docs[0].avatar;
                                } else {
                                  user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                }

                                var wallet_amount;
                                db.GetDocument('walletReacharge', { "user_id": docs[0]._id }, {}, {}, function (usererr, walletdata) {
                                  var location_id = '';
                                  if (docs[0].location_id) {
                                    if (docs[0].location_id != '') {
                                      location_id = docs[0].location_id;
                                    }
                                  }
                                  var wallet_amount = 0;
                                  if (walletdata[0]) {
                                    wallet_amount = walletdata[0].total || 0;
                                  }

                                  res.send({
                                    user_image: user_image,
                                    soc_key: crypto.createHash('md5').update(docs[0]._id.toString()).digest('hex'),
                                    user_id: docs[0]._id,
                                    username: docs[0].username ? docs[0].username : '',
                                    firstname: docs[0].firstname ? docs[0].firstname : '',
                                    lastname: docs[0].lastname ? docs[0].lastname : '',
                                    email: docs[0].email,
                                    user_group: "User",
                                    country: docs[0].address.country,
                                    status: docs[0].status,
                                    message: res.__("You are Logged In successfully"),
                                    currency: currencies.code,
                                    img_name: docs[0].img_name,
                                    img_path: docs[0].img_path,
                                    referal_code: docs[0].referral_code || "",
                                    is_alive_other: "No",
                                    location_name: docs[0].address.city || "",
                                    country_code: docs[0].phone.code,
                                    phone_number: docs[0].phone.number,
                                    location_id: docs[0].location_id || "",
                                    wallet_amount: wallet_amount,
                                    category: "",
                                    auth_token: jwtSign({ username: docs[0].username ? docs[0].username : '' }),
                                    provider_notification: docs[0].provider_notification || ""
                                  })
                                });

                              }
                            });
                          } else {
                            db.UpdateDocument('users', { 'phone.number': data.phone }, { 'device_info.device_type': 'android', 'device_info.gcm': data.gcm, 'activity.last_login': new Date() }, {}, function (err, response) {
                              console.log("err", err);
                              console.log("response", response);

                              if (err || response.nModified == 0) {
                                res.send({
                                  "status": 0,
                                  "message": res.__('Unable to update user data')
                                });
                              } else {
                                var insertdocID = docs[0]._id;
                                var key = '';
                                var push_data = {};
                                push_data["push_notification_key"] = {};
                                var is_alive_other = "No";
                                var existingKey = '';
                                var user_image = '';
                                if (docs[0].avatar) {
                                  user_image = settings.settings.site_url + docs[0].avatar;
                                } else {
                                  user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                }

                                var wallet_amount;
                                db.GetDocument('walletReacharge', { "user_id": docs[0]._id }, {}, {}, function (usererr, walletdata) {
                                  var location_id = '';
                                  if (docs[0].location_id) {
                                    if (docs[0].location_id != '') {
                                      location_id = docs[0].location_id;
                                    }
                                  }
                                  var wallet_amount = 0;
                                  if (walletdata[0]) {
                                    wallet_amount = walletdata[0].total || 0;
                                  }
                                  res.send({
                                    user_image: user_image,
                                    soc_key: crypto.createHash('md5').update(docs[0]._id.toString()).digest('hex'),
                                    user_id: docs[0]._id,
                                    username: docs[0].username ? docs[0].username : '',
                                    firstname: docs[0].firstname ? docs[0].firstname : '',
                                    lastname: docs[0].lastname ? docs[0].lastname : '',
                                    email: docs[0].email,
                                    user_group: "User",
                                    country: docs[0].address.country,
                                    status: docs[0].status,
                                    message: res.__("You are Logged In successfully"),
                                    currency: currencies.code,
                                    img_name: docs[0].img_name,
                                    img_path: docs[0].img_path,
                                    referal_code: docs[0].referral_code || "",
                                    is_alive_other: "No",
                                    location_name: docs[0].address.city || "",
                                    country_code: docs[0].phone.code,
                                    phone_number: docs[0].phone.number,
                                    location_id: docs[0].location_id || "",
                                    wallet_amount: wallet_amount,
                                    category: "",
                                    auth_token: jwtSign({ username: docs[0].username ? docs[0].username : '' }),
                                    provider_notification: docs[0].provider_notification || ""
                                  })
                                });

                              }
                            });
                          }
                        }
                      });
                    } else {
                      if (docs[0].status == 0) {
                        res.send({
                          "status": 0,
                          "message": res.__('Your account has beed modified')
                        });
                      } else {
                        res.send({
                          "status": 0,
                          "message": res.__('Your account has been inactivated')
                        });
                      }
                    }
              }
            });
          }
        });
      }
    });
  };

  controller.register = function (req, res) {
    var data = {};
    data.status = '0';
    var message = '';
    req.checkBody('firstname', res.__('first_name is required')).notEmpty();
    req.checkBody('lastname', res.__('last_name is required')).notEmpty();
    req.checkBody('email', res.__('Valid email is required')).isEmail();
    req.checkBody('country_code', res.__('Country Code is required')).notEmpty();
    req.checkBody('phone_number', res.__('Phone Number is required')).notEmpty();
    req.checkBody('unique_code', res.__('Unique_code is required')).optional();
    req.checkBody('deviceToken', res.__('Invalid Device Token')).optional();
    req.checkBody('gcm_id', res.__('Invalid Gcm id')).optional();

    var errors = req.validationErrors();
    if (errors) {
      res.send({ "status": "0", "errors": errors[0].msg });
      return;
    }

    req.sanitizeBody('firstname').trim();
    req.sanitizeBody('lastname').trim();
    req.sanitizeBody('email').trim();
    req.sanitizeBody('country_code').trim();
    req.sanitizeBody('phone_number').trim();
    req.sanitizeBody('unique_code').trim();
    req.sanitizeBody('deviceToken').trim();
    req.sanitizeBody('gcm_id').trim();

    var request = {};
    data.email = req.body.email;
    data.firstname = req.body.firstname;
    data.lastname = req.body.lastname;
    data.username = req.body.firstname + ' ' + req.body.lastname;
    data.country_code = req.body.country_code;
    data.phone_number = req.body.phone_number;
    data.unique_code = req.body.unique_code;
    data.deviceToken = req.body.deviceToken;
    data.gcm_id = req.body.gcm_id;

    async.waterfall([
      function (callback) {
        db.GetDocument('users', { email: req.body.email }, {}, {}, function (err, user) {
          if (err || !user) { res.send({ "status": "0", "message": res.__("No " + CONFIG.USER + " Found for this Email") }); } else { callback(err, user); }
        });
      },
      function (user, callback) {
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
          if (err || !settings) {
            res.send({ "status": "0", "message": res._("Configure your website settings") });
          } else {
            callback(err, user, settings);
          }
        });
      },
      function (user, settings, callback) {
        if (settings.settings.referral.status == 0 || !data.unique_code) {
          var newdata = { phone: {} };

          newdata.user_type = 'Normal';
          newdata.username = data.username;
          newdata.firstname = data.firstname;
          newdata.lastname = data.lastname;
          newdata.unique_code = library.randomString(8, '#A');
          newdata.role = 'user';
          newdata.email = data.email;
          //newdata.avatar = '';
          newdata.status = 1;
          newdata.phone.code = data.country_code;
          newdata.phone.number = data.phone_number;
          newdata.verification_code = [{ "email": library.randomString(6, '#') }];
          var user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
          console.log("usersssssssssssss", user);
      if(user.length == 0) {
        db.InsertDocument('users', newdata, function (err, response) {
        if (err) {
          console.log("err", err);
          res.send({ "status": "0", "message": res.__("Phone Number Already Registered") });
        } else {
          db.UpdateDocument('users', { '_id': response._id }, { 'firstname': req.body.firstname, 'lastname': req.body.lastname }, {}, function (err, responseuser) {
          if (err || responseuser.nModified == 0) { res.send({ "status": "0", "message": res.__("No " + CONFIG.USER + " Found for this Email") }); } else {
            db.GetOneDocument('users', { '_id': response._id }, {}, {}, function (err, usermailrefer) {
            if (err || !usermailrefer) { res.send({ "status": "0", "message": res.__("No " + CONFIG.USER + " Found for this Email") }); } else {
              var insertdocID = response._id;
              var key = '';

              var mailData = {};
              mailData.template = 'Sighnupmessage';
              mailData.to = response.email;
              mailData.html = [];
              mailData.html.push({ name: 'referal_code', value: usermailrefer.unique_code || "" });
              mailData.html.push({ name: 'username', value: response.username || "" });
              mailData.html.push({ name: 'email', value: response.email || "" });
              mailcontent.sendmail(mailData, function (err, response) { });


              db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
              if (err || !currencies) {
                res.send({
                "status": 0,
                "message": res.__('Error in registration')
                });
              } else {
                if (data.deviceToken) {
                db.UpdateDocument('users', { 'email': data.email }, { 'device_info.device_type': 'ios', 'device_info.device_token': data.deviceToken, 'activity.last_login': new Date() }, {}, function (err, responseuser) {
                  if (err || responseuser.nModified == 0) {
                  res.send({
                    "status": 0,
                    "message": res.__('Please check the email and try again')
                  });
                  } else {
                  res.send({
                    "status": '1',
                    "message": res.__('Successfully registered'),
                    "is_alive_other": "Yes",
                    "user_image": settings.settings.site_url + 'uploads/images/default_avat.png',
                    "user_id": insertdocID,
                    "soc_key": bcrypt.hashSync(insertdocID, bcrypt.genSaltSync(8), null),
                    "firstname": usermailrefer.firstname,
                    "lastname": usermailrefer.lastname,
                    "user_group": "User",
                    "email": response.email,
                    "country_code": response.phone.code,
                    "phone_number": response.phone.number,
                    "new_referel_code": response.unique_code,
                    "referal_code": data.unique_code,
                    "key": key,
                    "currency": currencies.code,
                    "category": "",
                    // "wallet_amount": (walletReachargeRepo.total).toString() || 0
                    "wallet_amount": 0
                  });
                  }
                });
                } else if (data.gcm_id) {
                db.UpdateDocument('users', { 'email': data.email }, { 'device_info.device_type': 'android', 'device_info.gcm': data.gcm_id, 'activity.last_login': new Date() }, {}, function (err, responseuser) {
                  if (err || responseuser.nModified == 0) {
                  res.send({
                    "status": 0,
                    "message": res.__('Please check the email and try again')
                  });
                  } else {
                  res.send({
                    "status": '1',
                    "message": res.__('Successfully registered'),
                    "is_alive_other": "Yes",
                    "user_image": settings.settings.site_url + 'uploads/images/default_avat.png',
                    "user_id": insertdocID,
                    "soc_key": bcrypt.hashSync(insertdocID, bcrypt.genSaltSync(8), null),
                    "firstname": response.firstname,
                    "lastname": usermailrefer.lastname,
                    "user_group": "User",
                    "email": response.email,
                    "country_code": response.phone.code,
                    "phone_number": response.phone.number,
                    "new_referel_code": response.unique_code,
                    "referal_code": data.unique_code,
                    "key": key,
                    "currency": currencies.code,
                    "category": "",
                    //"wallet_amount": (walletReachargeRepo.total).toString() || 0
                    "wallet_amount": 0
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
      } else {
        res.send({ "status": "0", "response": res.__("Email Id already exists") });
      }
        } else {
          db.GetDocument('users', { 'unique_code': req.body.unique_code }, {}, {}, function (referalErr, referalCheck) {
            if (referalErr || referalCheck == 0) { res.send({ "status": "0", "response": res.__("Invalid Referral") }); } else { callback(referalErr, user, settings, referalCheck); }
          });
        }
      },
      function (user, settings, referalCheck, callback) {
        var newdata = { phone: {} };
        newdata.user_type = 'Normal';
        newdata.firstname = data.firstname;
        newdata.lastname = data.lastname;
        newdata.username = data.username;
        newdata.unique_code = library.randomString(8, '#A');
        newdata.role = 'user';
        newdata.email = data.email;
        //newdata.avatar = '';
        newdata.status = 1;
        newdata.phone.code = data.country_code;
        newdata.phone.number = data.phone_number;
        newdata.verification_code = [{ "email": library.randomString(6, '#') }];
        var user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;

        db.InsertDocument('users', newdata, function (err, response) {
          if (err) {
            res.send({ "status": "0", "message": res.__("Username or Phone Number Already Registered") });
          } else {
            callback(err, user, settings, referalCheck, response);
          }
        });
      },
      function (user, settings, referalCheck, response, callback) {
        var welcomeamt = {
          'user_id': response._id,
          "total": settings.settings.referral.amount.referral,
          'type': 'wallet',
          "transactions": [{
            'type': 'CREDIT',
            'credit_type': 'Referral',
            'ref_id': referalCheck[0]._id,
            'trans_amount': settings.settings.referral.amount.referral,
            'avail_amount': settings.settings.referral.amount.referral,
            'trans_date': new Date(),
            //'trans_id': ''
          }]
        };
        db.UpdateDocument('users', { '_id': response._id }, { 'firstname': req.body.firstname, 'lastname': req.body.lastname }, {}, function (err, responseuser) { });
        db.InsertDocument('walletReacharge', welcomeamt, function (walletReachargeErr, walletReachargeRepo) {
          if (walletReachargeErr || walletReachargeRepo.nModified == 0) { res.send({ "status": "0", "message": res.__("Error in given data") }); } else {
            callback(walletReachargeErr, user, settings, referalCheck, response, walletReachargeRepo);
          }
        });
      },
      function (user, settings, referalCheck, response, walletReachargeRepo, callback) {
        var walletdata = { wallet_id: walletReachargeRepo._id };
        db.UpdateDocument('users', { _id: new mongoose.Types.ObjectId(response._id) }, { $set: walletdata }, { multi: true }, function (usersErr, usersRespo) {
          if (usersErr) { res.send({ "status": "0", "message": res.__("Error in given data") }); } else { callback(usersErr, user, settings, referalCheck, response, walletReachargeRepo, usersRespo); }
        });
      },
      function (user, settings, referalCheck, response, walletReachargeRepo, usersRespo, callback) {
        db.GetOneDocument('users', { '_id': response._id }, {}, {}, function (err, usermailrefer) {
          if (err || !usermailrefer) { res.send({ "status": "0", "message": res.__("Error in given data") }); } else { callback(err, user, settings, referalCheck, response, walletReachargeRepo, usersRespo, usermailrefer); }
        });
      },
      function (user, settings, referalCheck, response, walletReachargeRepo, usersRespo, usermailrefer, callback) {
        db.GetOneDocument('walletReacharge', { 'user_id': referalCheck[0]._id }, {}, {}, function (refErr, refRespo) {
          if (refErr) { res.send({ "status": "0", "message": res.__("Error in given data") }); } else { callback(refErr, user, settings, referalCheck, response, walletReachargeRepo, usersRespo, usermailrefer, refRespo); }
        });
      },
      function (user, settings, referalCheck, response, walletReachargeRepo, usersRespo, usermailrefer, refRespo, callback) {
        if (refRespo) {
          var walletArr = {
            'type': 'CREDIT',
            'credit_type': 'Referral',
            'trans_amount': settings.settings.referral.amount.referrer,
            'avail_amount': parseInt(settings.settings.referral.amount.referrer) + parseInt(refRespo.total),
            'trans_date': new Date(),
            'ref_id': response._id,
            'trans_id': ''
          };
          db.UpdateDocument('walletReacharge', { 'user_id': referalCheck[0]._id }, { $push: { transactions: walletArr }, $set: { "total": parseInt(refRespo.total) + parseInt(settings.settings.referral.amount.referrer) } }, {}, function (refupErr, refupRespo) {
            if (refupErr || refupRespo.nModified == 0) { res.send({ "status": "0", "message": res.__("Error in given data") }); } else { callback(refupErr, user, settings, referalCheck, response, walletReachargeRepo, usersRespo, usermailrefer, refRespo, refupRespo); }
          });
        } else {
          var welcomeamt = {
            'user_id': referalCheck[0]._id,
            "total": settings.settings.referral.amount.referrer,
            'type': 'wallet',
            "transactions": [{
              'type': 'CREDIT',
              'credit_type': 'Referral',
              'trans_amount': settings.settings.referral.amount.referrer,
              'avail_amount': settings.settings.referral.amount.referrer,
              'trans_date': new Date(),
              'ref_id': response._id,
              'trans_id': ''
            }]
          };
          db.InsertDocument('walletReacharge', welcomeamt, function (refupErr, refupRespo) {
            if (refupErr || refupRespo.nModified == 0) { res.send({ "status": "0", "message": res.__("Error in given data") }); } else { callback(refupErr, user, settings, referalCheck, response, walletReachargeRepo, usersRespo, usermailrefer, refRespo, refupRespo); }
          });
        }
      }
    ], function (usersErr, user, settings, referalCheck, response, walletReachargeRepo, usersRespo, usermailrefer, refRespo, refupRespo) {
      var insertdocID = response._id;
      var key = '';
      var mailData = {};
      mailData.template = 'Sighnupmessage';
      mailData.to = response.email;
      mailData.html = [];
      mailData.html.push({ name: 'referal_code', value: usermailrefer.unique_code || "" });
      mailData.html.push({ name: 'name', value: response.firstname || "" });
      mailData.html.push({ name: 'email', value: response.email || "" });
      mailcontent.sendmail(mailData, function (err, response) { });

      db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
        if (err || !currencies) {
          res.send({
            "status": 0,
            "message": res.__('Error in registration')
          });
        } else {
          if (data.deviceToken) { // ios
            db.UpdateDocument('users', { 'email': data.email }, { 'device_info.device_type': 'ios', 'device_info.device_token': data.deviceToken, 'activity.last_login': new Date() }, {}, function (err, responseuser) {
              if (err || responseuser.nModified == 0) {
                res.send({
                  "status": 0,
                  "message": res.__('Please check the email and try again')
                });
              } else {
                res.send({
                  "status": '1',
                  "message": res.__('Successfully registered'),
                  "is_alive_other": "Yes",
                  "user_image": settings.settings.site_url + 'uploads/images/default_avat.png',
                  "user_id": insertdocID,
                  "soc_key": bcrypt.hashSync(insertdocID, bcrypt.genSaltSync(8), null),
                  "firstname": response.firstname,
                  "lastname": response.lastname,
                  "user_group": "User",
                  "email": response.email,
                  "country_code": response.phone.code,
                  "phone_number": response.phone.number,
                  "new_referel_code": response.unique_code,
                  "referal_code": data.unique_code,
                  "key": key,
                  "currency": currencies.code,
                  "category": "",
                  "wallet_amount": (walletReachargeRepo.total || 0).toString()
                });
              }
            });
          } else if (data.gcm_id) { //android
            db.UpdateDocument('users', { 'email': data.email }, { 'device_info.device_type': 'android', 'device_info.gcm': data.gcm_id, 'activity.last_login': new Date() }, {}, function (err, responseuser) {
              if (err || responseuser.nModified == 0) {
                res.send({
                  "status": 0,
                  "message": res.__('Please check the email and try again')
                });
              } else {
                res.send({
                  "status": '1',
                  "message": res.__('Successfully registered'),
                  "is_alive_other": "Yes",
                  "user_image": settings.settings.site_url + 'uploads/images/default_avat.png',
                  "user_id": insertdocID,
                  "soc_key": bcrypt.hashSync(insertdocID, bcrypt.genSaltSync(8), null),
                  "firstname": response.firstname,
                  "lastname": response.lastname,
                  "user_group": "User",
                  "email": response.email,
                  "country_code": response.phone.code,
                  "phone_number": response.phone.number,
                  "new_referel_code": response.unique_code,
                  "referal_code": data.unique_code,
                  "key": key,
                  "currency": currencies.code,
                  "category": "",
                  "wallet_amount": (walletReachargeRepo.total || 0).toString()
                });
              }
            });
          }
        }
      });
    });
  }


  controller.categories = function (req, res) {
    var errors = [];
    var data = {};
    data.cat_id = req.body.category;
    data.location_id = req.body.location_id;
    var locCheck = 0;
    var locationCondition = {};

    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
      if (err || !settings) {
        res.send({
          "status": "0",
          "message": res.__("Configure your website settings")
        });
      } else {
        var conditon = { 'parent': { $exists: false }, 'status': 1 };
        if (req.body.category != '' && req.body.category != 'undefined' && req.body.category) {
          conditon = { 'parent': new mongoose.Types.ObjectId(req.body.category), 'status': 1 };
        } else {
          conditon = { 'parent': { $exists: false }, 'status': 1 };
        }
        var categoryQuery = [{ "$match": conditon },
        {
          $group: {
            _id: "null",
            category: {
              $push: {
                cat_id: "$_id",
                icon_normal: { $cond: ["$icon_normal", { $concat: [settings.settings.site_url, CONFIG.CATEGORY_DEFAULT_IMAGE, "$img_name"] }, { $literal: settings.settings.site_url + CONFIG.CATEGORY_DEFAULT_IMAGE }] },
                hasChild: { $cond: { if: { $gt: ["$no_of_childs", 0] }, then: 'Yes', else: 'No' } },
                cat_name: "$name",
                cat_hours: "$hours",
                image: { $cond: ["$image", { $concat: [settings.settings.site_url, "$img_path", "thumbs/", "$img_name"] }, { $literal: settings.settings.site_url + CONFIG.CATEGORY_DEFAULT_IMAGE }] },
                inactive_icon: { $cond: ["$icon", { $concat: [settings.settings.site_url, "$icon"] }, { $literal: settings.settings.site_url + CONFIG.CATEGORY_DEFAULT_IMAGE }] },
                active_icon: { $cond: ["$activeicon", { $concat: [settings.settings.site_url, "$activeicon"] }, { $literal: settings.settings.site_url + CONFIG.CATEGORY_DEFAULT_IMAGE }] },
              }
            }
          }
        }
        ];
        db.GetAggregation('category', categoryQuery, function (catErr, catRespo) {
          if (catRespo.length > 0) {
            var locationsArr = [];
            res.send({
              "status": "1",
              "response": {
                "locations": locationsArr,
                "category": catRespo[0].category
              }
            });
          } else {
            res.send({
              "status": "0",
              "response": res.__("No categories found")
            });
          }
        });
      }
    });
  };

  controller.allcategories = function (req, res) {

    db.GetDocument('category', {}, {}, {}, function (err, categories) {
      if (err || !categories) {
        res.send({
          "status": "0",
          "message": res.__("Unable to get data")
        });
      } else {
        res.send(categories);
      }
    });
  };

  controller.bookJob = function (req, res) {
    console.log("req.body", req.body.pickup_time);
    var errors = [];
    req.checkBody('user_id', CONFIG.USER + ' ID is Required').optional();
    req.checkBody('address_name', 'Address ID is Required').optional();
    req.checkBody('category', 'Category is Required').notEmpty();
    req.checkBody('category_hours', 'Category hours is Required').notEmpty();
    req.checkBody('service', 'Service is Required').notEmpty();
    // req.checkBody('category_type',  'Category Type is Required').notEmpty();
    req.checkBody('pickup_date', 'Pickup Date is Required').notEmpty();
    req.checkBody('pickup_time', 'Pickup Time is Required').notEmpty();
    req.checkBody('code', 'Code is Required').optional();
    req.checkBody('instruction', 'Instruction is Required').optional();
    req.checkBody('lat', 'Latitude is Required').notEmpty();
    req.checkBody('long', 'Longitude is Required').notEmpty();
    req.checkBody('service_address', 'Service Address is Required').notEmpty();
    /***********************filter for provider list**********************/
    req.checkBody('booking_id', 'Enter valid booking ID').optional();
    req.checkBody('rating', 'Enter valid rating').optional();
    req.checkBody('price', 'Enter valid price').optional();
    req.checkBody('orderby', 'Enter valid order').optional();
    req.checkBody('sortby', 'Enter valid option').optional();
    req.checkBody('from', 'Enter valid from date').optional(); //yyyy-mm-dd hh:mm:ss
    req.checkBody('to', 'Enter valid to date').optional(); //yyyy-mm-dd hh:mm:ss
    req.checkBody('minrate', 'Enter minrate ').optional(); //yyyy-mm-dd hh:mm:ss
    req.checkBody('maxrate', 'Enter maxrate ').optional(); //yyyy-mm-dd hh:mm:ss
    req.checkBody('distancefilter', 'Enter distancefilter ').optional();

    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "response": errors[0].msg
      });
      return;
    }

    var status = '0';
    var response = '';
    var data = {};
    var limit = '';
    var minrate = parseInt(req.body.minrate) || 1;
    var maxrate = parseInt(req.body.maxrate) || 10000;

    if(req.body.user_id && req.body.user_id != ''){
      var user_id = req.body.user_id;
    }
    else{
      var user_id = new mongoose.Types.ObjectId();
    }

    var id = req.body.address_name;
    // req.body.address_name = id.substr(id.length - 1);
    data.address_name = parseInt(req.body.address_name);
    data.category = req.body.category;
    data.service = req.body.service;
    data.reach_date = req.body.pickup_date;
    data.reach_time = req.body.pickup_time;
    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
      if (err) {
        res.send({
          "status": "0",
          "response": "Error in settings"
        });
      }
      else {
        data.pickup_time = data.reach_time;
        var today = moment(Date.now()).format('MM/DD/YYYY');
        var ctime = timezone.tz(Date.now(), settings.settings.time_zone).format('HH');

        data.code = req.body.code;
        data.instruction = req.body.instruction;

        data.user_lat = req.body.lat;
        data.user_lon = req.body.long;

        data.try = parseInt(req.body.try);
        data.job_id = req.body.job_id;
        data.acceptance = 'No';

        data.price = parseInt(req.body.price);
        /*-----------------------------------------------------------------*/
        var pickup_lat = req.body.lat;
        var pickup_lon = req.body.long;
        var categoryid = req.body.category;
        var working_days = {};
        //var time = req.body.pickup_time.substr(0, 2);
        var time = req.body.pickup_time;
        var currenttime = ctime.substr(0, 2);
        var hour = '';
        var currenthour = '';
        var day = data.reach_date;

        var from = moment(time,'HH:mm').format('HH');
        var to = moment(time,'HH:mm').add(req.body.category_hours, 'h').format('HH');

        var tasktime = [];

        if(to - from > 1) {
            tasktime.push(parseInt(from), parseInt(from) + 1, parseInt(to));
        } else {
            tasktime.push(parseInt(from), parseInt(to));
        }

         /*if ((time >= 8) && (time < 12)) {
          hour = "morning";
        } else if ((time >= 12) && (time < 16)) {
          hour = "afternoon";
        } else {
          hour = "evening";
        }*/

      /*  if ((currenttime >= 8) && (currenttime < 12)) {
          currenthour = "morning";
        } else if ((currenttime >= 12) && (currenttime < 16)) {
          currenthour = "afternoon";
        } else {
          currenthour = "evening";
        } */

       /*  if ((data.reach_date == today) && (hour == currenthour)) {
          res.send({
            "status": "0",
            "response": "Use book now to book job for this session"
          });
        }
        else { */

          var dayTemp = new Date(data.reach_date);
          var dayCheck = dayTemp.getDay();
          if (dayCheck == 0) {
            day = "Sunday";
          } else if (dayCheck == 1) {
            day = "Monday";
          } else if (dayCheck == 2) {
            day = "Tuesday";
          } else if (dayCheck == 3) {
            day = "Wednesday";
          } else if (dayCheck == 4) {
            day = "Thursday";
          } else if (dayCheck == 5) {
            day = "Friday";
          } else if (dayCheck == 6) {
            day = "Saturday";
          }

          var responseflag = true;
          /*if (hour && day) {
            var hourcondition = [];
            var hourArr = hour.split(",");
            for (var i in hourArr) {
              var val = hourArr[i];

              if (val == 'morning') {
                hourcondition.push({ $elemMatch: { "day": day, "hour.morning": true } });
              } else if (val == 'afternoon') {
                hourcondition.push({ $elemMatch: { "day": day, "hour.afternoon": true } });
              } else if (val == 'evening') {
                hourcondition.push({ $elemMatch: { "day": day, "hour.evening": true } });
              } else {
                responseflag = false;
              }
              working_days = { $all: hourcondition };
            }
          } else {
            responseflag = false;
          }
*/
          if (req.body.distancefilter) {
            var kmdistance = parseInt(req.body.distancefilter);
          } else {
            var kmdistance = 10;
          }

          var sorting = {};

          if (settings.settings.distanceby == 'km') {
            var distanceval = 0.001;
          }
          else {
            var distanceval = 0.000621371;
          }
          var defaultCondition = [{
            "$geoNear": {
              near: { type: "Point", coordinates: [parseFloat(pickup_lon), parseFloat(pickup_lat)] },
              distanceField: "distance",
              includeLocs: "location",
              query: {
                "status": 1,
                //"availability": 1,
                "taskerskills": { $elemMatch: { childid: new mongoose.Types.ObjectId(categoryid), status: 1 } },
                "working_days": { $elemMatch: { day: day, slots: { $all: tasktime } } }
              },
              distanceMultiplier: distanceval,
              spherical: true,
              maxDistance: kmdistance / distanceval
            }
          },
          {
            "$redact": {
              "$cond": {
                "if": { "$lte": ["$distance", "$radius"] },
                // "if": { "$lte": ["$distance", kmdistance] },
                "then": "$$KEEP",
                "else": "$$PRUNE"
              }
            }
          },
          {
            $lookup: {
              from: "task",
              localField: "_id",
              foreignField: "tasker",
              as: "tasks"
            }
          },
          {
            $unwind: { path: "$tasks", preserveNullAndEmptyArrays: true }
          },
          {
            $project:
            {
              "username": 1,
              "name": 1,
              "email": 1,
              "phone": 1,
              "distance": 1,
              "radius": 1,
              "total_review": 1,
              "avg_review": 1,
              "location": 1,
              "categoryid": { $literal: new mongoose.Types.ObjectId(categoryid) },
              "taskerskills": 1,
              "avatar": 1,
              "tasker_area": 1,
              "tasks": 1,
              "booked": {
                  $cond: { if: { $and: [ { $ne: [ { $setIntersection: ["$tasks.task_slots", tasktime] }, [] ] }, { $ne: ["$tasks.status", 8] }, { $gte: ["$tasks.status", 2] }, { $lte: ["$tasks.status", 5] }, { $eq: ["$tasks.task_date", data.reach_date] } ] }, then: 1, else: 0 }
              }
            }
          },
          {
            $project:
            {
              "username": 1,
              "name": 1,
              "email": 1,
              "phone": 1,
              "distance": 1,
              "radius": 1,
              "total_review": 1,
              "avg_review": 1,
              "location": 1,
              "categoryid": 1,
              "taskerskills": { $filter: { input: "$taskerskills", as: "item", cond: { $eq: ["$$item.childid", "$categoryid"] } } },
              "avatar": 1,
              "tasker_area": 1,
              "tasks": 1,
              "booked": 1
            }
          },
        /*   { "$lookup": { from: "experience", localField: "taskerskills.experience", foreignField: "_id", as: "experience" } }, */
          {
            "$group":
            {
              "_id": "$_id",
              "username": { $first: "$username" },
              "name": { $first: "$name" },
              "email": { $first: "$email" },
              "phone": { $first: "$phone" },
              "distance": { $first: "$distance" },
              "radius": { $first: "$radius" },
              "total_review": { $first: "$total_review" },
              "avg_review": { $first: "$avg_review" },
              "location": { $first: "$location" },
              "categoryid": { $first: "$categoryid" },
              "taskerskills": { $first: "$taskerskills" },
              "avatar": { $first: "$avatar" },
              "tasker_area": { $first: "$tasker_area" },
              "booked": { $sum: "$booked" },
              // "tasks": { "$push": "$tasks" }
            }
          },
          { $sort: { 'distance': 1 } },
          {
            "$match": { "booked": 0 }
          }
            // {
            // "$group": {
            // _id: null,
            // count: { $sum: 1 },
            // taskers: { $push: "$$ROOT" }
            // }
            // }
          ];
          // "taskerskills.childid":new mongoose.Types.ObjectId(categoryid),
          defaultCondition.push({ "$match": { "taskerskills.hour_rate": { '$gte': minrate, '$lte': maxrate } } });

          var customCondition = [
            {
              "$group":
              {
                _id: null,
                count: { $sum: 1 },
                taskers: { $push: "$$ROOT" }
              }
            }

          ];
          if (parseFloat(req.body.rating) > 0) {
            //defaultCondition[0]['$geoNear']['query']['avg_review'] = { $gte: 0, $lte: parseFloat(req.body.rating) };
            defaultCondition[0]['$geoNear']['query']['avg_review'] = { $gte: parseFloat(req.body.rating) };
          }
          if (responseflag) {
            db.GetOneDocument('category', { '_id': data.category }, {}, {}, function (err, category) {
              if (err) {
                res.send({
                  "status": "0",
                  "response": CONFIG.TASKER + " are not available"
                });
              } else {

                data.cat_img = settings.settings.site_url + category.image;
                data.cat_type = category.ratetype;
                data.commision = category.commision;

                  db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    if (err) {
                      res.send({
                        "status": "0",
                        "response": CONFIG.TASKER + " are not available"
                      });
                    } else {
                      var taskercondition = defaultCondition.concat(customCondition);
                      db.GetAggregation('tasker', taskercondition, function (err, docdata) {
                        if (err || docdata.length == 0) {
                          res.send({
                            "status": "0",
                            "response": CONFIG.TASKER + " are not available"
                          });
                        } else {
                          db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                            if (err) {
                              res.send(err);
                            }
                            var data = {};
                            data.category = categoryid;
                            data.user = user_id;
                            data.task_description = req.body.instruction;
                            data.booking_id = settings.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
                            data.status = 10;
                            data.task_hour = hour;
                            data.task_session = hour;
                            data.task_slots = tasktime;
                            data.task_date = moment(req.body.pickup_date).format('YYYY-MM-DD');
                            data.task_day = day;
                            data.task_time = time;
                            data.location = {
                              lat: req.body.lat,
                              log: req.body.long
                            };
                            data.hourly_rate = 0;
                            data.service_address = req.body.service_address;
                            data.booking_information = {};
                            var formatedDate = moment(new Date(req.body.pickup_date + ' ' + req.body.pickup_time)).format('YYYY-MM-DD HH:mm:ss');
                            data.booking_information.booking_date = timezone.tz(formatedDate, settings.settings.time_zone);
                            data.booking_information.service_type = category.name;
                            data.booking_information.work_type = category.name;

                            



                              db.InsertDocument('task', data, function (err, bookdata) {

                                

                                if (err) {
                                  res.send(err);
                                } else {
                                  db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
                                    if (err) {
                                      res.send(err);
                                    } else {
                                     
                                          var providerList = [];
                                          for (var i = 0; i < docdata[0].taskers.length; i++) {

                                            /*
                                                 var lat1 = req.body.lat;
                                                 var lat2 = docdata[0].taskers[i].location.lat;
                                                 var lon1 = req.body.long;
                                                 var lon2 = docdata[0].taskers[i].location.lng;

                                                 var earthRadius = 6371; // Radius of the earth in km
                                                 var dLat = deg2rad(lat2 - lat1);  // deg2rad below
                                                 var dLon = deg2rad(lon2 - lon1);
                                                 var a =
                                                     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                                     Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
                                                     Math.sin(dLon / 2) * Math.sin(dLon / 2)
                                                     ;
                                                 var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                                 var d = earthRadius * c;
                                                 // var miles = d / 1.609344;
                                              function deg2rad(deg) {
                                                return deg * (Math.PI/180)
                                              } */

                                            var providertemp = { name: "", image_url: "" };
                                            if (docdata[0].taskers[i].avatar) {
                                              providertemp.image_url = settings.settings.site_url + docdata[0].taskers[i].avatar.replace('./', '');
                                            } else {
                                              providertemp.image_url = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                            }
                                            providertemp.name = docdata[0].taskers[i].username;
                                           
                                            //providertemp.cat_img = category.image;
                                            providertemp.cat_type = category.ratetype;

                                            // providertemp.marker_img = settings.settings.site_url + marker.marker;
                                            providertemp.distance_km = (docdata[0].taskers[i].distance).toFixed(1) + ' ' + settings.settings.distanceby;
                                            //providertemp.distance_mile = miles.toFixed(1) + ' ' + 'Miles';
                                            providertemp.taskerid = docdata[0].taskers[i]._id;
                                            providertemp.radius = docdata[0].taskers[i].radius;
                                            providertemp.lng = docdata[0].taskers[i].location.lng;
                                            providertemp.lat = docdata[0].taskers[i].location.lat;
                                            providertemp.reviews = docdata[0].taskers[i].total_review;
                                            providertemp.currency_symbol = currencies.symbol;
                                            providertemp.currency_code = currencies.code;
                                            providertemp.hourly_amount =  docdata[0].taskers[i].taskerskills.filter(function (ol) {

                                              return ol.childid == req.body.category;
                                            }).map(function (ma) {
                                              return ma;
                                            })[0].hour_rate || 0;

                                            /*var category = docdata[0].taskers[i].taskerskills.map(function(item) {
                                              if (item.childid == req.body.category) {
                                                var catdet = {};
                                                catdet._id = item.childid._id;
                                                catdet.name = item.childid.name;
                                                return catdet;
                                              } else {
                                                return "";
                                              }
                                            });
                          
                                            var catdet = [];
                                            for (i = 0; i < category.length; i++) {
                                              var id = category[i]._id;
                                              var categoryname = category[i].name;
                          
                                              catdet.push({
                                                'categoryname': categoryname,
                                                '_id': id
                                              });
                                            }*/

                                            //providertemp.category_name = catdet;
                                            providertemp.min_amount = data.commision;
                                            providertemp.rating = docdata[0].taskers[i].avg_review || 0;
                                            providertemp.company = docdata[0].taskers[i].taskerskills[0].name || "default company";
                                            providertemp.availability = docdata[0].taskers[i].mode == "Available" ? 'Yes' : 'No';

                                            //Pricing
                                            if (data.price) {
                                              if (parseFloat(providertemp.min_amount) <= parseInt(data.price)) {
                                                //condition['taskerskills.hour_rate'] = { $gte: 0, $lte:  data.price };
                                                providerList.push(providertemp);
                                              } else {
                                                docdata[0].count--;
                                              }
                                            } else {
                                              providerList.push(providertemp);
                                            }
                                          }

                                          var lowest = Number.POSITIVE_INFINITY;
                                          var highest = Number.NEGATIVE_INFINITY;
                                          var tmp;
                                          for (var i = providerList.length - 1; i >= 0; i--) {
                                            tmp = providerList[i].hourly_amount;
                                            if (tmp < lowest) lowest = tmp;
                                            if (tmp > highest) highest = tmp;
                                          }
                                          if (lowest == highest) {
                                            lowest = 0;
                                          }
                                          console.log("providerList", providerList);
                                          

                                              res.send({ booking_id: bookdata.booking_id, task_id: bookdata._id, count: docdata[0].count, status: "1", lowesthourlyrate: lowest, highesthourlyrate: highest, response: providerList , categorytype : category.ratetype , categorytypestatus : category.ratetype == 'Flat' ? 1  : 2 });
                                    }
                                  });
                                }
                              });
                            // }
                          });
                        }
                      });
                    }
                });
              }
            });
          } else {
            res.send({ count: 0, result: [] });
          }
      }
    });
  };

  controller.mapbookJob = function (req, res) {
  console.log("req.body", req.body);
    var errors = [];
    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).optional();
    req.checkBody('category', res.__('Category is Required')).optional();
    req.checkBody('maincategory', res.__('Main Category is Required')).optional();
    req.checkBody('lat', res.__('Latitude is Required')).notEmpty();
    req.checkBody('long', res.__('Longitude is Required')).notEmpty();
    /***********************filter for provider list**********************/
    req.checkBody('rating', res.__('Enter valid rating')).optional();
    req.checkBody('price', res.__('Enter valid price')).optional();
    req.checkBody('orderby', res.__('Enter valid order')).optional();
    req.checkBody('sortby', res.__('Enter valid option')).optional();
    req.checkBody('from', res.__('Enter valid from date')).optional(); //yyyy-mm-dd hh:mm:ss
    req.checkBody('to', res.__('Enter valid to date')).optional(); //yyyy-mm-dd hh:mm:ss
    req.checkBody('minrate', res.__('Enter minrate ')).optional(); //yyyy-mm-dd hh:mm:ss
    req.checkBody('maxrate', res.__('Enter maxrate ')).optional(); //yyyy-mm-dd hh:mm:ss

    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "response": errors[0].msg
      });
      return;
    }

    var status = '0';
    var response = '';
    var data = {};
    var limit = '';
    // var minrate = parseInt(req.body.minrate) || 1;
    // var maxrate = parseInt(req.body.maxrate) || 1000;
	

    data.user_id = req.body.user_id;
    data.user_lat = req.body.lat;
    data.user_lon = req.body.long;
    data.category = req.body.category;
    data.maincategory = req.body.maincategory;

    // data.price = parseInt(req.body.price);
    /*-----------------------------------------------------------------*/
    var pickup_lat = req.body.lat;
    var pickup_lon = req.body.long;
    var categoryid = req.body.category;
    var maincategoryid = req.body.maincategory;
    var working_days = {};

    var reach_date = moment(Date.now()).format('MM/DD/YYYY');
    var d = new Date();
    var t = d.getHours();
    var pickup_time = t + ':00';

    var time = pickup_time.substr(0, 2);
    var hour = '';
    var day = reach_date;

    if ((time >= 8) && (time < 12)) {
      hour = "morning";
    } else if ((time >= 12) && (time < 16)) {
      hour = "afternoon";
    } else {
      hour = "evening";
    }

    var dayTemp = new Date(reach_date);
    var dayCheck = dayTemp.getDay();
    if (dayCheck == 0) {
      day = "Sunday";
    } else if (dayCheck == 1) {
      day = "Monday";
    } else if (dayCheck == 2) {
      day = "Tuesday";
    } else if (dayCheck == 3) {
      day = "Wednesday";
    } else if (dayCheck == 4) {
      day = "Thursday";
    } else if (dayCheck == 5) {
      day = "Friday";
    } else if (dayCheck == 6) {
      day = "Saturday";
    }

    var responseflag = true;
    if (hour && day) {
      var hourcondition = [];
      var hourArr = hour.split(",");
      for (var i in hourArr) {
        var val = hourArr[i];
        if (val == 'morning') {
          hourcondition.push({ $elemMatch: { "day": day, "hour.morning": true } });
        } else if (val == 'afternoon') {
          hourcondition.push({ $elemMatch: { "day": day, "hour.afternoon": true } });
        } else if (val == 'evening') {
          hourcondition.push({ $elemMatch: { "day": day, "hour.evening": true } });
        } else {
          responseflag = false;
        }
        working_days = { $all: hourcondition };
      }
    } else {
      responseflag = false;
    }

    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
      if (err) {
        res.send(err);
      }
      else {

        if (settings.settings.distanceby == 'km') {
          var distanceval = 0.001;
        }
        else {
          var distanceval = 0.000621371;
        }

        var sorting = {};
        if (req.body.category) {
          var taskercondition = [{
            "$geoNear": {
              near: { type: "Point", coordinates: [parseFloat(pickup_lon), parseFloat(pickup_lat)] },
              distanceField: "distance",
              includeLocs: "location",
              query: { "status": 1, "taskerskills": { $elemMatch: { childid: new mongoose.Types.ObjectId(categoryid), status: 1 } } },
              distanceMultiplier: distanceval,
              spherical: true
            }
          },
          { "$redact": { "$cond": { "if": { "$lte": ["$distance", settings.settings.tasker_distance] }, "then": "$$KEEP", "else": "$$PRUNE" } } },
          { "$group": { _id: null, count: { $sum: 1 }, taskers: { $push: "$$ROOT" } } }
          ]
        }
        else if (req.body.maincategory) {
          var taskercondition = [{
            "$geoNear": {
              near: { type: "Point", coordinates: [parseFloat(pickup_lon), parseFloat(pickup_lat)] },
              distanceField: "distance",
              includeLocs: "location",
              query: { "status": 1, "availability": 1, "taskerskills": { $elemMatch: { categoryid: new mongoose.Types.ObjectId(maincategoryid), status: 1 } } },
              distanceMultiplier: distanceval,
              spherical: true
            }
          },
          { "$redact": { "$cond": { "if": { "$lte": ["$distance", settings.settings.tasker_distance] }, "then": "$$KEEP", "else": "$$PRUNE" } } },
          { "$group": { _id: null, count: { $sum: 1 }, taskers: { $push: "$$ROOT" } } }
          ]
        }
        else {
          var taskercondition = [{
            "$geoNear": {
              near: { type: "Point", coordinates: [parseFloat(pickup_lon), parseFloat(pickup_lat)] },
              distanceField: "distance",
              includeLocs: "location",
              query: { "status": 1, "availability": 1 },
              distanceMultiplier: distanceval,
              spherical: true
            }
          },
          { "$redact": { "$cond": { "if": { "$lte": ["$distance", settings.settings.tasker_distance] }, "then": "$$KEEP", "else": "$$PRUNE" } } },
          { "$group": { _id: null, count: { $sum: 1 }, taskers: { $push: "$$ROOT" } } }
          ];
        }
        if (responseflag) {
		if(req.body.user_id){
          db.GetOneDocument('users', { '_id': req.body.user_id }, {}, {}, function (err, user) {
            if (err) {
              res.send(err);
            }
            else {
              if(user.status == 1) {
                db.GetAggregation('tasker', taskercondition, function (err, docdata) {
                  if (err || docdata.length == 0) {
                      res.send({
                        "status": "0",
                        "response": res.__(CONFIG.TASKER + " are not available")
                      });
                  } else {
                        var providerList = [];
                        for (var i = 0; i < docdata[0].taskers.length; i++) {
                          var lat1 = req.body.lat;
                          var lat2 = docdata[0].taskers[i].location.lat;
                          var lon1 = req.body.long;
                          var lon2 = docdata[0].taskers[i].location.lng;
                          
                          var providertemp = { name: "", image_url: "" };
                          if (docdata[0].taskers[i].avatar) {
                            providertemp.image_url = settings.settings.site_url + docdata[0].taskers[i].avatar.replace('./', '');
                          } else {
                            providertemp.image_url = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                          }
                          providertemp.name = docdata[0].taskers[i].username;
                          providertemp.cat_img = '';
                          providertemp.marker_img = '';
                          providertemp.taskerid = docdata[0].taskers[i]._id;
                          providertemp.lng = docdata[0].taskers[i].location.lng;
                          providertemp.lat = docdata[0].taskers[i].location.lat;
                          providertemp.worklocation = docdata[0].taskers[i].availability_address;
                          if (req.body.category) {
                            providertemp.hourly_amount = docdata[0].taskers[i].taskerskills.filter(function (ol) {
                              return ol.childid == req.body.category;
                            }).map(function (ma) {
                              return ma;
                            })[0].hour_rate || 0;

                          }
                          providertemp.availability = docdata[0].taskers[i].mode == "Available" ? 'Yes' : 'No';
                          providerList.push(providertemp);
                      }
                    res.send({ count: docdata[0].count, status: "1", response: providerList , distance : settings.settings.tasker_distance });
                  }
                });
              } else if(user.status == 2){
                res.send({'status': 2, 'response': 'Your account is In-active'});
              } else {
                res.send({'status': 2, 'response': 'Admin Deleted Your Account'});
              }
            }
          });
		  }
		  else{
		         db.GetAggregation('tasker', taskercondition, function (err, docdata) {
                  if (err || docdata.length == 0) {
                      res.send({
                        "status": "0",
                        "response": res.__(CONFIG.TASKER + " are not available")
                      });
                  } else {
                        var providerList = [];
                        for (var i = 0; i < docdata[0].taskers.length; i++) {
                          var lat1 = req.body.lat;
                          var lat2 = docdata[0].taskers[i].location.lat;
                          var lon1 = req.body.long;
                          var lon2 = docdata[0].taskers[i].location.lng;
                          
                          var providertemp = { name: "", image_url: "" };
                          if (docdata[0].taskers[i].avatar) {
                            providertemp.image_url = settings.settings.site_url + docdata[0].taskers[i].avatar.replace('./', '');
                          } else {
                            providertemp.image_url = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                          }
                          providertemp.name = docdata[0].taskers[i].username;
                          providertemp.cat_img = '';
                          providertemp.marker_img = '';
                          providertemp.taskerid = docdata[0].taskers[i]._id;
                          providertemp.lng = docdata[0].taskers[i].location.lng;
                          providertemp.lat = docdata[0].taskers[i].location.lat;
                          providertemp.worklocation = docdata[0].taskers[i].availability_address;
                          if (req.body.category) {
                            providertemp.hourly_amount = docdata[0].taskers[i].taskerskills.filter(function (ol) {
                              return ol.childid == req.body.category;
                            }).map(function (ma) {
                              return ma;
                            })[0].hour_rate || 0;

                          }
                          providertemp.availability = docdata[0].taskers[i].mode == "Available" ? 'Yes' : 'No';
                          providerList.push(providertemp);
                      }
                    res.send({ count: docdata[0].count, status: "1", response: providerList , distance : settings.settings.tasker_distance });
                  }
                });
		  }
        } 		
		else {
          res.send({ count: 0, result: [] });
        }
      }
    });
  };


  controller.searchJob = function (req, res) {

    var errors = [];
    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('address_name', res.__('Address ID is Required')).notEmpty();
    req.checkBody('category', res.__('Category is Required')).notEmpty();
    req.checkBody('service', res.__('Service is Required')).notEmpty();
    req.checkBody('pickup_date', res.__('Pickup Date is Required')).notEmpty();
    req.checkBody('pickup_time', res.__('Pickup Time is Required')).notEmpty();
    req.checkBody('instruction', res.__('Instruction is Required')).notEmpty();
    req.checkBody('lat', res.__('Latitude is Required')).notEmpty();
    req.checkBody('long', res.__('Longitude is Required')).notEmpty();

    /***********************filter for provider list**********************/
    req.checkBody('code', res.__('Code is Required')).optional();
    req.checkBody('booking_id', res.__('Enter valid booking ID')).optional();
    req.checkBody('rating', res.__('Enter valid rating')).optional();
    req.checkBody('page', res.__('Enter valid page')).optional();
    req.checkBody('perPage', res.__('Enter valid perPage')).optional();
    req.checkBody('price', res.__('Enter valid price')).optional();
    req.checkBody('orderby', res.__('Enter valid order')).optional();
    req.checkBody('sortby', res.__('Enter valid option')).optional();
    req.checkBody('from', res.__('Enter valid from date')).optional(); //yyyy-mm-dd hh:mm:ss
    req.checkBody('to', res.__('Enter valid to date')).optional(); //yyyy-mm-dd hh:mm:ss

    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "response": errors[0].msg
      });
      return;
    }

    var data = {};
    var id = req.body.address_name;

    req.body.address_name = id.substr(id.length - 1);

    data.user_id = req.body.user_id;
    data.address_name = parseInt(req.body.address_name);
    data.category = req.body.category;
    data.service = req.body.service;
    data.reach_date = req.body.pickup_date;
    data.pickup_time = req.body.pickup_time;
    data.code = req.body.code;
    data.instruction = req.body.instruction;
    data.page = parseInt(req.body.page) || 1;
    data.perPage = parseInt(req.body.perPage) || 20;
    data.orderby = parseInt(req.body.orderby) || 1;
    data.sortby = req.body.sortby || 'createdAt';
    data.from = req.body.from + ' 00:00:00';
    data.to = req.body.to + ' 24:00:00';


    data.pickup_lat = req.body.lat;
    data.pickup_lon = req.body.long;

    data.try = parseInt(req.body.try);
    data.job_id = req.body.job_id;
    data.acceptance = 'No';

    var condition = { status: 1, tasker_status: 1 };

    var time = req.body.pickup_time.substr(0, 2);
    var hour = 'morning';
    var day = data.reach_date;

    if ((time >= 8) && (time < 12)) {
      hour = "morning";
    } else if ((time >= 12) && (time <= 16)) {
      hour = "afternoon";
    } else {
      hour = "evening";
    }

    var dayTemp = new Date(data.reach_date);

    var dayCheck = dayTemp.getDay();

    switch (dayCheck) {
      case 0:
        day = "Sunday";
        break;
      case 1:
        day = "Monday";
        break;
      case 2:
        day = "Tuesday";
        break;
      case 3:
        day = "Wednesday";
        break;
      case 4:
        day = "Thursday";
        break;
      case 5:
        day = "Friday";
        break;
      case 6:
        day = "Saturday";
        break;
    }

    condition['$and'] = [];
    var responseflag = true;

    if (typeof data.pickup_lat != 'undefined' && typeof data.pickup_lon != 'undefined' && data.pickup_lon != '' && data.pickup_lat != '') {
      condition['$and'].push({
        working_area: {
          $geoIntersects: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(data.pickup_lon), parseFloat(data.pickup_lat)]
            }
          }
        }
      });
    } else {
      responseflag = false;
    }

    if (data.category) {
      if (objectID.isValid(data.category)) {
        condition.taskerskills = { $elemMatch: { childid: new mongoose.Types.ObjectId(data.category) } };
      } else {
        responseflag = false;
      }
    } else {
      responseflag = false;
    }

    if (hour && day) {
      var hourcondition = [];
      var hourArr = hour.split(",");
      for (var i in hourArr) {
        var val = hourArr[i];
        if (val == 'morning') {
          hourcondition.push({ $elemMatch: { "day": day, "hour.morning": true } });
        } else if (val == 'afternoon') {
          hourcondition.push({ $elemMatch: { "day": day, "hour.afternoon": true } });
        } else if (val == 'evening') {
          hourcondition.push({ $elemMatch: { "day": day, "hour.evening": true } });
        } else {
          responseflag = false;
        }
        condition.working_days = { $all: hourcondition };
      }
    } else {
      responseflag = false;
    }

    if (condition['$and'].length == 0) {
      delete condition.$and;
    }

    if (data.sortby == 'name') {
      data.sortby = 'user.username'
    } else if (data.sortby == 'date') {
      data.sortby = 'createdAt'
    }
    var sorting = {};
    sorting[data.sortby] = data.orderby;
    var extension = {
      options: {
        limit: 12,
        skip: 0
      }
    };
    if (typeof req.query.limit != 'undefined' && typeof req.query.skip != 'undefined') {
      extension.options.limit = parseInt(data.perPage);
      extension.options.skip = parseInt((data.perPage * (data.page - 1)));
      extension.options.sort = sorting;
    }

    if (responseflag) {
      db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
        if (err) {
          res.send({
            "status": "0",
            "response": res.__(CONFIG.TASKER + " are not available")
          });
        } else {
          db.GetDocument('tasker', condition, {}, extension, function (err, docdata) {
            if (err || docdata.length == 0) {
              res.send({
                "status": "0",
                "response": res.__(CONFIG.TASKER + " are not available")
              });
            } else {
              var data = {};
              data.category = categoryid;
              //	data.address = req.body.address;
              data.user = req.body.user_id;
              data.task_description = req.body.instruction;
              data.booking_id = 'QR-' + Math.floor(100000 + Math.random() * 900000);
              data.status = 10;
              data.task_hour = hour;
              data.task_date = moment(new Date()).format('YYYY-MM-DD');
              data.task_day = day;
              data.location = {
                lat: req.body.lat,
                log: req.body.long
              };

              db.InsertDocument('task', data, function (err, bookdata) {
                if (err) {
                  res.send(err);
                } else {
                  db.GetCount('tasker', condition, function (err, count) {
                    if (err) {
                      res.send(err);
                    } else {
                      var providerList = [];
                      for (var i = 0; i < docdata.length; i++) {
                        var providertemp = { name: "", image_url: "" };
                        if (docdata[i].avatar) {
                          providertemp.image_url = settings.settings.site_url + docdata[i].avatar.replace('./', '');
                        } else {
                          providertemp.image_url = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                        }
                        providertemp.name = docdata[i].username;
                        providertemp.taskerid = docdata[i]._id;
                        providertemp.min_amount = docdata[i].taskerskills[0].hour_rate || "0";
                        providertemp.rating = docdata[i].avg_review || 0;
                        providertemp.company = docdata[i].taskerskills[0].name || "default company";
                        providertemp.availability = docdata[i].mode == "Available" ? 'Yes' : 'No';
                        providerList.push(providertemp);
                      }
                      res.send({ booking_id: bookdata.booking_id, task_id: bookdata._id, count: count, status: "1", response: providerList });
                    }
                  });
                }
              });
            }
          });
        }
      });
    } else {
      res.send({ count: 0, result: [] });
    }
  }

  controller.getuserprofile = function (req, res) {
    var data = {};
    data.status = '0';
    req.checkBody('userid', res.__(CONFIG.USER + ' id is Required')).notEmpty();
    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data);
    }
    req.sanitizeBody('userid').trim();
    db.GetOneDocument('users', { '_id': req.body.userid }, {}, {}, function (err, user) {
      if (err | !user) {
        res.send({
          "status": "0",
          "response": res.__(CONFIG.USER + " are not available")
        });
      }
      else {
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
          if (err || !settings) {
            data.response = res.__('Configure your website settings');
            res.send(data);
          }
          else {
            data.status = 1;
            data.username = user.username ? user.username : '';
            data.firstname = user.firstname;
            data.lastname = user.lastname;
            data.email = user.email;
            if (user.avatar) {
              data.avatar = settings.settings.site_url + user.avatar;
            }
            else {
              data.avatar = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
            }
            data.countrycode = user.phone.code;
            data.number = user.phone.number;

            res.send(data);
          }
        });
      }

    });

  }



  controller.userBooking = function (req, res) {

    

    var data = {};
    data.status = 0;
    var request = {};
    request.user_id = req.body.user_id;
    request.taskid = req.body.taskid;
    request.taskerid = req.body.taskerid;
    request.location = req.body.location;
    request.tasklat = req.body.tasklat;
    request.tasklng = req.body.tasklng;

    db.GetOneDocument('users', { _id: req.body.user_id }, {}, {}, function (usererr, userdata) {
      if (usererr || !userdata) {
        res.send({
          "status": "0",
          "response": res.__("please check " + CONFIG.USER + " id")
        });
      } else {
        var options = {};
        options.populate = 'category user tasker';
        db.GetOneDocument('task', { _id: req.body.taskid }, {}, options, function (err, taskdata) {
          if (err || !taskdata) {
            res.send({
              "status": "0",
              "response": res.__("please check Task Id")
            });
          } else {
            db.GetOneDocument('tasker', { _id: req.body.taskerid }, {}, options, function (taskerErr, taskerData) {
              if (taskerErr || !taskerData) {
                res.send({
                  "status": "0",
                  "response": res.__("please check " + CONFIG.TASKER + " Id")
                });
              } else {
                console.log("taskerData.availability",taskerData.availability)
                if(taskerData.availability !=  1){
                  res.send({
                    "status": 0,
                    "response": "Tasker Not Availale"
                  });
                  return;
                }
                var catid = taskdata.category._id.toString();
                for (var key = 0; key < taskerData.taskerskills.length; key++) {
                  if (taskerData.taskerskills[key].childid == catid) {
                    var rate = taskerData.taskerskills[key].hour_rate;
                  }
                }

                db.GetOneDocument('users', { _id: req.body.user_id }, {}, {}, function (useraddresserr, useraddreessdata) {
                  if (useraddresserr || !useraddreessdata) {
                    res.send({
                      "status": "0",
                      "response": res.__("please check " + CONFIG.USER + " id")
                    });
                  } else {
                    var geocode = {
                      'latitude': req.body.tasklat,
                      'longitude': req.body.tasklng
                    };
                    GoogleAPI.geocode(geocode, function (response) {
                      if (response.length > 1) {
                        if (response[0].formatted_address) {
                          request.working_location = response[0].formatted_address;
                        } else {
                          request.working_location = '';
                        }
                      }
                      else {
                        request.working_location = '';
                      }
                      var a = request.working_location;
                      var words = a.split(", ");
                      taskdata.task_address = {
                        'zipcode': words[5] || "",
                        'country': words[7] || "",
                        'state': words[5] || "",
                        'city': words[4] || "",
                        'line1': words[0] || "",
                        'line2': words[2] || "",
                        'lat': req.body.tasklat || "",
                        'lng': req.body.tasklng || "",
                        'exactaddress': request.working_location || "",
                      };

                      if (useraddreessdata.address.city != undefined && useraddreessdata.address.line1 != undefined && useraddreessdata.address.line2 != undefined) {
                        taskdata.billing_address = {
                          'city': useraddreessdata.address.city || "",
                          'line1': useraddreessdata.address.line1 || "",
                          'line2': useraddreessdata.address.street || "",
                          'state': useraddreessdata.address.state || "",
                          'country': useraddreessdata.address.country || "",
                          'zipcode': useraddreessdata.address.zipcode || "",

                        };
                      } else {
                        taskdata.billing_address = {
                          'city': taskdata.task_address.city || "",
                          'line1': taskdata.task_address.line1 || "",
                          'line2': taskdata.task_address.line2 || "",
                          'state': taskdata.task_address.state || "",
                          'country': taskdata.task_address.country || "",
                          'zipcode': taskdata.task_address.zipcode || "",
                        };
                      }
                      var locationcity = ''
                      for (var keys = 0; keys < useraddreessdata.addressList.length; keys++) {
                        if (useraddreessdata.addressList[keys].status == 3) {
                          var address = ''
                          if (useraddreessdata.addressList[keys].line1) {
                            address += useraddreessdata.addressList[keys].line1 + ', ';
                          }
                          if (useraddreessdata.addressList[keys].line2 && useraddreessdata.addressList[keys].line2 != useraddreessdata.addressList[keys].line1) {
                            address += useraddreessdata.addressList[keys].line2 + ', ';
                          }
                          if (useraddreessdata.addressList[keys].street && useraddreessdata.addressList[keys].street != useraddreessdata.addressList[keys].line2) {
                            address += useraddreessdata.addressList[keys].street + ', ';
                          }
                          if (useraddreessdata.addressList[keys].locality && useraddreessdata.addressList[keys].locality != useraddreessdata.addressList[keys].street) {
                            address += useraddreessdata.addressList[keys].locality + ', ';
                          }
                          if (useraddreessdata.addressList[keys].state) {
                            address += useraddreessdata.addressList[keys].state + ', ';
                          }
                          if (useraddreessdata.addressList[keys].zipcode) {
                            address += useraddreessdata.addressList[keys].zipcode + ', ';
                          }
                          if (useraddreessdata.addressList[keys].country) {
                            address += useraddreessdata.addressList[keys].country;
                          }

                          locationcity = address || "";
                        }
                      }
                      taskdata.tasker = req.body.taskerid;
                      taskdata.user = req.body.user_id;
                      taskdata.status = 1;
                      taskdata.hourly_rate = rate;
                      taskdata.bookingmode = "booklater";
                      taskdata.booking_information = {
                        //'service_id': taskdata.category.parent,
                        'service_type': taskdata.category.name,
                        'work_type': taskdata.category.name,
                        'work_id': taskdata.category._id,
                        'instruction': taskdata.task_description,
                        'booking_date': taskdata.booking_information.booking_date,
                        'reach_date': new Date(),
                        'est_reach_date': new Date(),
                        'job_email': taskerData.email,
                        'location': locationcity || '',
                        'user_latlong': {
                          'lon': taskdata.location.log,
                          'lat': taskdata.location.lat
                        }
                      };
                      db.UpdateDocument('task', { _id: req.body.taskid }, taskdata, {}, function (err, docdata) {
                        

                        if (err) {
                          res.send({
                            "status": "0",
                            "response": res.__("please check task")
                          });
                        } else {
                          db.UpdateDocument('task', { _id: req.body.taskid }, { 'history.job_booking_time': new Date() }, {}, function (err, docdata) {
                            if (err) {
                              res.send({
                                "status": "0",
                                "response": res.__("please check task")
                              });
                            } else {
                              var android_provider = req.body.taskerid;
                              var message = 'You got a new job request from ' + useraddreessdata.username;
                              var response_time = CONFIG.respond_timeout;
                              var options = [taskdata.booking_id, android_provider, response_time];
                              for (var i = 1; i == 1; i++) {
                                push.sendPushnotification(android_provider, message, 'job_request', 'ANDROID', options, 'PROVIDER', function (err, response, body) { });
                              }

                              db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                if (err) {
                                  res.send({
                                    "status": "0",
                                    "response": res.__("please check task")
                                  });
                                } else {
                                  res.send({
                                    "status": "1",
                                    "response": {
                                      "job_id": taskdata.booking_id,
                                      "message": res.__("Your booking is submitted, waiting for confirmation"),
                                      "description": taskdata.task_description,
                                      "service_type": taskdata.category.name,
                                      "note": "Cost is subject to change following inspection.,",
                                      "booking_date": timezone.tz(taskdata.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.date_format + ',' + settings.settings.time_format),
                                      "job_date": moment(new Date()).format('MMMM D, YYYY, h:mm a'),
                                      "tasker_verfied_status": taskerData.status
                                    }
                                  });


                                  var job_date = timezone.tz(taskdata.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.date_format);
                                  var job_time = timezone.tz(taskdata.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.time_format);

                                  var mailData = {};
                                  mailData.template = 'Taskpendingapproval';
                                  mailData.to = userdata.email;
                                  mailData.html = [];
                                  mailData.html.push({ name: 'username', value: userdata.username });
                                  mailData.html.push({ name: 'taskername', value: taskerData.username });
                                  mailData.html.push({ name: 'taskname', value: taskdata.category.name });
                                  mailData.html.push({ name: 'bookingid', value: taskdata.booking_id });
                                  mailData.html.push({ name: 'startdate', value: job_date });
                                  mailData.html.push({ name: 'workingtime', value: job_time });
                                  mailData.html.push({ name: 'description', value: taskdata.task_description });
                                 
                                  mailcontent.sendmail(mailData, function (err, response) { });

                                  var mailData1 = {};
                                  mailData1.template = 'Quickrabbitconfirmtask';
                                  mailData1.to = taskerData.email;
                                  mailData1.html = [];
                                  mailData1.html.push({ name: 'username', value: userdata.username });
                                  mailData1.html.push({ name: 'taskername', value: taskerData.username });
                                  mailData1.html.push({ name: 'taskname', value: taskdata.category.name });
                                  mailData1.html.push({ name: 'bookingid', value: taskdata.booking_id });
                                  mailData1.html.push({ name: 'startdate', value: job_date });
                                  mailData1.html.push({ name: 'workingtime', value: job_time });
                                  mailData1.html.push({ name: 'description', value: taskdata.task_description });
                                 
                                  mailcontent.sendmail(mailData1, function (err, response) { });
                                }
                              });
                            }
                          });
                        }
                      });
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  };

  controller.mapuserBooking = function (req, res) {

    var a = req.body.locality;
    var words = a.split(", ");

    var data = {};
    data.status = 0;
    var request = {};
    request.user_id = req.body.user_id;
    request.taskid = req.body.taskid;
    request.taskerid = req.body.taskerid;
    request.task_description = req.body.instruction;
    request.pickup_date = req.body.pickup_date;
    request.pickup_time = req.body.pickup_time;
    request.location = req.body.location;
    request.lat = req.body.lat;
    request.lng = req.body.lng;
    request.city = req.body.city;
    request.country = req.body.country;
    request.state = req.body.state;
    request.zipcode = req.body.zipcode;
    request.locality = req.body.locality;
    request.street = req.body.street;
    request.line1 = words[0];
    db.GetOneDocument('users', { _id: req.body.user_id }, {}, {}, function (usererr, userdata) {
      if (usererr || !userdata) {
        res.send({
          "status": "0",
          "response": res.__("please check " + CONFIG.USER + " id")
        });
      } else {
        var options = {};
        options.populate = 'category user tasker';
        db.GetOneDocument('task', { _id: req.body.taskid }, {}, options, function (err, taskdata) {
          if (err || !taskdata) {


            

            res.send({
              "status": "0",
              "response": res.__("please check Task Id")
            });
          } else {
            db.GetOneDocument('tasker', { _id: req.body.taskerid }, {}, options, function (taskerErr, taskerData) {
              if (taskerErr || !taskerData) {
                res.send({
                  "status": "0",
                  "response": res.__("please check " + CONFIG.TASKER + " Id")
                });
              } else {
                var catid = taskdata.category._id.toString();
                for (var key = 0; key < taskerData.taskerskills.length; key++) {
                  if (taskerData.taskerskills[key].childid == catid) {
                    var rate = taskerData.taskerskills[key].hour_rate;
                  }
                }
                db.GetOneDocument('users', { _id: req.body.user_id }, {}, {}, function (useraddresserr, useraddreessdata) {
                  if (useraddresserr || !useraddreessdata) {
                    res.send({
                      "status": "0",
                      "response": res.__("please check " + CONFIG.USER + " id")
                    });
                  } else {
                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, mapsettings) {
                      if (err) {
                        res.send({
                          "status": "0",
                          "response": res.__("please check task")
                        });
                      } else {
                        // for (var key = 0; key < useraddreessdata.addressList.length; key++) {
                        // if (useraddreessdata.addressList[key].status == 3) {
                        taskdata.task_address = {
                          'zipcode': request.zipcode || "",
                          'country': request.country || "",
                          'state': request.state || "",
                          'city': request.city || "",
                          'line1': request.line1 || "",
                          'line2': request.street || "",
                          'lat': request.lat || "",
                          'lng': request.lng || "",
                          'exactaddress': request.locality || "",
                        };
                        if (useraddreessdata.address.city != undefined && useraddreessdata.address.line1 != undefined && useraddreessdata.address.line2 != undefined) {
                          taskdata.billing_address = {
                            'city': useraddreessdata.address.city || "",
                            'line1': useraddreessdata.address.line1 || "",
                            'line2': useraddreessdata.address.street || "",
                            'state': useraddreessdata.address.state || "",
                            'country': useraddreessdata.address.country || "",
                            'zipcode': useraddreessdata.address.zipcode || "",
                          };
                        } else {
                          taskdata.billing_address = {
                            'city': taskdata.task_address.city || "",
                            'line1': taskdata.task_address.line1 || "",
                            'line2': taskdata.task_address.line2 || "",
                            'state': taskdata.task_address.state || "",
                            'country': taskdata.task_address.country || "",
                            'zipcode': taskdata.task_address.zipcode || "",
                          };
                        }
                        var locationcity = ''
                        for (var keys = 0; keys < useraddreessdata.addressList.length; keys++) {
                          if (useraddreessdata.addressList[keys].status == 3) {
                            var address = ''
                            if (useraddreessdata.addressList[keys].line1) {
                              address += useraddreessdata.addressList[keys].line1 + ', ';
                            }
                            if (useraddreessdata.addressList[keys].line2 && useraddreessdata.addressList[keys].line2 != useraddreessdata.addressList[keys].line1) {
                              address += useraddreessdata.addressList[keys].line2 + ', ';
                            }
                            if (useraddreessdata.addressList[keys].street && useraddreessdata.addressList[keys].street != useraddreessdata.addressList[keys].line2) {
                              address += useraddreessdata.addressList[keys].street + ', ';
                            }
                            if (useraddreessdata.addressList[keys].locality && useraddreessdata.addressList[keys].locality != useraddreessdata.addressList[keys].street) {
                              address += useraddreessdata.addressList[keys].locality + ', ';
                            }
                            if (useraddreessdata.addressList[keys].state) {
                              address += useraddreessdata.addressList[keys].state + ', ';
                            }
                            if (useraddreessdata.addressList[keys].zipcode) {
                              address += useraddreessdata.addressList[keys].zipcode + ', ';
                            }
                            if (useraddreessdata.addressList[keys].country) {
                              address += useraddreessdata.addressList[keys].country;
                            }
                            locationcity = address || "";
                          }
                        }
                        var geocode = { 'latitude': taskdata.location.lat, 'longitude': taskdata.location.log };
                        GoogleAPI.geocode(geocode, function (response) {
                          if (response[0].formatted_address) {

                          }
                        })

                        var formatedDate = moment(new Date(req.body.pickup_date + ' ' + req.body.pickup_time)).format('YYYY-MM-DD HH:mm:ss');
                        var mapbooking_date = timezone.tz(formatedDate, mapsettings.settings.time_zone);
                        taskdata.task_description = req.body.instruction;
                        taskdata.tasker = req.body.taskerid;
                        taskdata.user = req.body.userid;
                        taskdata.bookingmode = "booknow";
                        taskdata.status = 1;
                        taskdata.hourly_rate = rate;
                        taskdata.booking_information = {
                          //'service_id': taskdata.category.parent,
                          'service_type': taskdata.category.name,
                          'work_type': taskdata.category.name,
                          'work_id': taskdata.category._id,
                          'instruction': req.body.instruction,
                          'booking_date': mapbooking_date,
                          'reach_date': new Date(),
                          'est_reach_date': new Date(),
                          'job_email': taskerData.email,
                          // 'location': locationcity || req.body.location,
                          'location': request.locality,
                          'user_latlong': {
                            'lon': taskdata.location.log,
                            'lat': taskdata.location.lat
                          }
                        };




                        db.UpdateDocument('task', { _id: req.body.taskid }, taskdata, {}, function (err, docdata) {
                          if (err) {
                            res.send({
                              "status": "0",
                              "response": res.__("please check task")
                            });
                          } else {
                            db.UpdateDocument('task', { _id: req.body.taskid }, { 'history.job_booking_time': new Date() }, {}, function (err, docdata) {
                              if (err) {
                                res.send({
                                  "status": "0",
                                  "response": res.__("please check task")
                                });
                              } else {
                                var android_provider = req.body.taskerid;
                                var message = CONFIG.NOTIFICATION.YOU_GOT_A_REQUEST_FOR_A_NEW_JOB;
                                var response_time = CONFIG.respond_timeout;
                                var options = [taskdata.booking_id, android_provider, response_time];
                                for (var i = 1; i == 1; i++) {
                                  push.sendPushnotification(android_provider, message, 'job_request', 'ANDROID', options, 'PROVIDER', function (err, response, body) { });
                                }
                                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                  if (err) {
                                    res.send({
                                      "status": "0",
                                      "response": res.__("please check task")
                                    });
                                  } else {
                                    var attributes = {};
                                    attributes.populate = 'user tasker category';
                                    db.GetDocument('task', { _id: req.body.taskid }, {}, attributes, function (err, libraryresponses) {
                                      if (err) {
                                        res.send(err);
                                      } else {
                                        res.send({
                                          "status": "1",
                                          "response": {
                                            "job_id": taskdata.booking_id,
                                            "message": res.__("Your booking is submitted, waiting for confirmation"),
                                            "description": taskdata.task_description,
                                            "service_type": taskdata.category.name,
                                            "note": "Cost is subject to change following inspection.,",
                                            "booking_date": timezone.tz(taskdata.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.date_format + ',' + settings.settings.time_format),
                                            "job_date": moment(new Date()).format('MMMM D, YYYY, h:mm a'),
                                          }
                                        });
                                        taskTimeLibrary.taskReminder(libraryresponses, function (err, response) { });
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
            });
          }
        });
      }
    });
  };

  controller.getTransList = function (req, res) {

    var errors = [];

    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }
    var extension = {
      sort: { updatedAt: -1 }
    };
    var data = {};
    data.user_id = req.body.user_id;
    data.type = req.body.type;
    if (req.body.user_id != '') {
      db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
        if (err || !currencies) {
          res.send({
            "status": "0",
            "response": res.__('Data Not available')
          });
        } else {
          db.GetDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
            if (userRespo.length > 0) {
              var where_clause = '';
              switch (req.body.type) {
                case 'all':
                  where_clause = { "user_id": new mongoose.Types.ObjectId(req.body.user_id) };
                  break;
                case 'credit':
                  where_clause = { "user_id": new mongoose.Types.ObjectId(req.body.user_id), 'transactions.type': { $eq: 'CREDIT' } };
                  break;
                case 'debit':
                  where_clause = { "user_id": new mongoose.Types.ObjectId(req.body.user_id), 'transactions.type': { $eq: 'DEBIT' } };
                  break;
                default:
                  where_clause = { "user_id": new mongoose.Types.ObjectId(req.body.user_id) };
              }

              db.GetDocument('walletReacharge', where_clause, { 'transactions': 1, 'user_id': 1, 'total': 1, 'updatedAt': 1, 'createdAt': 1 }, { sort: { 'transactions.trans_date': -1 } }, function (walletErr, walletRespo) {
                //
                if (walletErr || walletRespo.length == 0) {
                  res.send({
                    "status": "0",
                    "response": res.__('Data Not available')
                  });
                } else {
                  db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    if (err) {
                      res.send({
                        "status": "0",
                        "response": res.__('Data Not available')
                      });
                    } else {

                      if (walletRespo.length >= 0 && walletRespo[0].transactions) {
                        var total_amount = walletRespo[0].total;
                        var transArr = [];

                        if (data.type == 'all') {

                          for (var i = 0; i < walletRespo[0].transactions.length; i++) {
                            var title = '';
                            var transacData = {};
                            if (walletRespo[0].transactions[i].type == 'CREDIT') {

                              if (walletRespo[0].transactions[i].credit_type == 'welcome') {
                                title = 'Welcome Bonus';
                              } else if (walletRespo[0].transactions[i].credit_type == 'Referral') {
                                title = 'Referral reward';
                                /*
                                if (walletRespo[0].transactions[i].ref_id != null) {
                                  title = 'Wallet Recharge';
                                }
                                */
                              } else {
                                title = 'Wallet Recharge';
                              }
                            } else if (walletRespo[0].transactions[i].type == 'DEBIT') {
                              //  title = 'Booking for #' + walletRespo[0].transactions[i].ref_id;
                              title = 'Payment by wallet';
                            }
                            transacData.type = walletRespo[0].transactions[i].type || '';
                            transacData.trans_amount = (walletRespo[0].transactions[i].trans_amount * currencies.value).toFixed(2) || 0.00;
                            transacData.title = title;
                            transacData.trans_date = timezone.tz(walletRespo[0].transactions[i].trans_date, settings.settings.time_zone).format(settings.settings.date_format + ',' + settings.settings.time_format) || '';
                            //transacData.trans_date = moment(new Date(walletRespo[0].transactions[i].trans_date)).format('MMMM D, YYYY, h:mm a') || '';
                            transacData.balance_amount = (walletRespo[0].transactions[i].avail_amount * currencies.value).toFixed(2) || 0.00;
                            transArr.push(transacData);
                          }
                        }
                        if (data.type == 'credit') {

                          for (var i = 0; i < walletRespo[0].transactions.length; i++) {
                            var title = '';
                            var transacData = {};
                            if (walletRespo[0].transactions[i].type == 'CREDIT') {

                              if (walletRespo[0].transactions[i].credit_type == 'welcome') {
                                title = 'Welcome Bonus';
                              } else if (walletRespo[0].transactions[i].credit_type == 'referral') {
                                title = 'Referral reward';
                                /*
                                if (walletRespo[0].transactions[i].ref_id != null) {
                                  title = 'Wallet Recharge';
                                }
                                */
                              } else {
                                title = 'Wallet Recharge';
                              }
                              transacData.type = walletRespo[0].transactions[i].type || '';
                              transacData.trans_amount = (walletRespo[0].transactions[i].trans_amount * currencies.value).toFixed(2) || 0.00;
                              transacData.title = title;
                              transacData.trans_date = timezone.tz(walletRespo[0].transactions[i].trans_date, settings.settings.time_zone).format(settings.settings.date_format + ',' + settings.settings.time_format) || '';
                              //transacData.trans_date = moment(new Date(walletRespo[0].transactions[i].trans_date)).format('MMMM D, YYYY, h:mm a') || '';
                              transacData.balance_amount = (walletRespo[0].transactions[i].avail_amount * currencies.value).toFixed(2) || 0.00;
                              transArr.push(transacData);
                            }
                          }

                        }
                        if (data.type == 'debit') {

                          for (var i = 0; i < walletRespo[0].transactions.length; i++) {
                            var title = '';
                            var transacData = {};
                            if (walletRespo[0].transactions[i].type == 'DEBIT') {
                              // title = 'Booking for #' + walletRespo[0].transactions[i].ref_id;
                              title = 'Payment by wallet';
                              transacData.type = walletRespo[0].transactions[i].type || '';
                              transacData.trans_amount = (walletRespo[0].transactions[i].trans_amount * currencies.value).toFixed(2) || 0.00;
                              transacData.title = title;
                              transacData.trans_date = timezone.tz(walletRespo[0].transactions[i].trans_date, settings.settings.time_zone).format(settings.settings.date_format + ',' + settings.settings.time_format) || '';
                              //transacData.trans_date = moment(new Date(walletRespo[0].transactions[i].trans_date)).format('MMMM D, YYYY, h:mm a') || '';
                              transacData.balance_amount = (walletRespo[0].transactions[i].avail_amount * currencies.value).toFixed(2) || 0.00;
                              transArr.push(transacData);
                            }
                          }
                        }
                        //new code
                        transArr.sort(function (a, b) {
                          return new Date(b.trans_date) - new Date(a.trans_date);
                        });
                        //new code
                        res.send({
                          "status": "1",
                          "response": {
                            'currency': currencies.code,
                            'total_amount': (total_amount * currencies.value).toFixed(2),
                            'total_transaction': walletRespo[0].transactions.length,
                            'trans': transArr
                          }
                        })
                      }
                    }
                  });
                }
              });
            } else {
              res.send({
                "status": "0",
                "message": res.__("Invalid " + CONFIG.USER)
                
              });
            }
          });
        }
      });

    } else {
      res.send({
        "status": "0",
        "message": res.__("Some Parameters are missing")
      });
    }
  }

  controller.forgotPassword = function (req, res) {
    var data = {};
    data.status = '0';
    req.checkBody('email', res.__('Email is Required')).notEmpty().withMessage('Valid Email is Required').isEmail();
    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data); return;
    }
    req.sanitizeBody('email').trim();
    var request = {};
    request.email = req.body.email;
    request.reset = library.randomString(8, '#A');
    async.waterfall([
      function (callback) {
        db.GetOneDocument('users', { 'email': request.email }, {}, {}, function (err, user) {
          if (err || !user) {
            data.response = res.__('No ' + CONFIG.USER + ' Found for this Email');
            res.send(data);
          } else { callback(err, user); }
        });
      },
      function (user, callback) {
        db.UpdateDocument('users', { '_id': user._id }, { 'reset_code': request.reset }, {}, function (err, response) {
          if (err || response.nModified == 0) {
            data.response = res.__('Unable to update your reset code');
            res.send(data);
          } else { callback(err, user); }
        });
      },
      function (user, callback) {
        db.GetOneDocument('users', { '_id': user._id }, {}, {}, function (err, user) {
          if (err || !user) {
            data.response = res.__('No ' + CONFIG.USER + ' Found for this Email');
            res.send(data);
          } else { callback(err, user); }
        });
      },
      function (user, callback) {
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
          if (err) {
            data.response = res.__('No ' + CONFIG.USER + ' Found for this Email');
            res.send(data);
          } else { callback(err, user, settings); }
        });
      }
    ], function (err, user, settings) {
      var name;
      if (user.name) {
        name = user.username;
      } else {
        name = user.username;
      }
      var mailData = {};
      mailData.template = 'Forgotpassword';
      mailData.to = user.email;
      mailData.html = [];
      mailData.html.push({ name: 'name', value: name || "" });
      mailData.html.push({ name: 'email', value: user.email || "" });
      mailData.html.push({ name: 'url', value: settings.settings.site_url + 'reset-password/user' + '/' + user._id + '/' + user.reset_code });
      mailcontent.sendmail(mailData, function (err, response) { });
      var to = user.phone.code + user.phone.number;
      var message = util.format(CONFIG.SMS.FORGOT_PASSWORD, user.username, user.reset_code);
      twilio.createMessage(to, '', message, function (err, response) { });
      data.status = '1';
      data.verification_code = request.reset;
      data.email_address = user.email;
      data.response = res.__('Reset Code Sent Successfully!');
      res.send(data);
    });
  }



  controller.insertAddress = function (req, res) {

    var errors = [];
    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('landmark', res.__('landmark is Required')).optional();
    req.checkBody('city', res.__('City is Required')).optional();
    req.checkBody('state', res.__('State is Required')).optional();
    req.checkBody('country', res.__('country is Required')).optional();
    req.checkBody('zipcode', res.__('Zipcode is Required')).optional();
    req.checkBody('lng', res.__('Select address from the suggestions')).notEmpty();
    req.checkBody('lat', res.__('Select address from the suggestions')).notEmpty();

    req.checkBody('locality', res.__('locality is Required')).optional(); // line1
    req.checkBody('line1', res.__('line1 is Required')).optional(); // not user
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }

    var a = req.body.locality;
    var words = a.split(", ");

    var data = {};
    data.user_id = req.body.user_id;
    data.line1 = words[0];
    data.locality = req.body.city;
    data.street = req.body.street;
    data.landmark = req.body.landmark;
    data.state = req.body.state;
    data.country = req.body.country;
    data.zipcode = req.body.zipcode;

    data.lng = parseFloat(req.body.lng);
    data.lat = parseFloat(req.body.lat);

    var location = { 'lng': data.lng, 'lat': data.lat };
    if (isNaN(data.lng)) {
      res.send({
        "status": "0",
        "response": res.__("lat and lng is required")
      });
    } else {
      db.GetOneDocument('users', { _id: req.body.user_id }, { 'addressList': 1 }, {}, function (addErr, docdata) {
        if (addErr) {
          res.send({ "status": "0", "response": res.__('address not updated') });
        } else {
          if (docdata.addressList.length > 4) {
            res.send({ "status": "0", "response": res.__('Can add Only 5 Adddress') });
          }
          else {
            db.GetOneDocument('users', { '_id': req.body.userid, addressList: { $elemMatch: { "location.lng": data.lng, "location.lat": data.lat } } }, {}, {}, function (addErr, addRespo) {
              if (addErr || addRespo) {
                res.send({ "status": "0", "response": res.__('Address already on list') });
              } else {
                db.GetDocument('users', { _id: req.body.user_id }, {}, {}, function (addErr, addRespo) {
                  if (addRespo.length > 0 && addRespo[0].address.city) {
                    var addressdata = {};
                    addressdata.user_id = req.body.user_id;
                    addressdata.line1 = data.line1;
                    addressdata.street = data.street;
                    addressdata.city = data.locality;
                    addressdata.state = data.state;
                    addressdata.landmark = data.landmark;
                    addressdata.country = data.country;
                    addressdata.zipcode = req.body.zipcode;
                    addressdata.location = location;
                    addressdata.fulladdress = req.body.locality;
                    db.UpdateDocument('users', { _id: req.body.user_id }, { '$push': { 'addressList': addressdata } }, { multi: true }, function (addUErr, addURespo) {
                      if (addUErr) {
                        res.send({
                          "status": "0",
                          "response": res.__("address not updated")
                        });
                      } else {
                        res.send({ 'status': "1", "response": res.__("Inserted Successfully") });
                      }
                    });
                  } else {
                    var address = {
                      'name': req.body.name,
                      'email': req.body.email,
                      'line1': data.line1,
                      'country': data.country,
                      'street': data.street,
                      'landmark': data.landmark,
                      'city': data.locality,
                      'state': data.state,
                      'zipcode': req.body.zipcode,
                      'location': location,
                      'fulladdress': req.body.locality
                    };

                    db.UpdateDocument('users', { _id: req.body.user_id }, { '$push': { 'addressList': address } }, { multi: true }, function (addUErr, addURespo) {
                      if (addUErr) {
                        res.send({
                          "status": "0",
                          "response": res.__("address not updated")
                        });
                      } else {
                        db.UpdateDocument('users', { _id: req.body.user_id }, { address: address }, function (insErr, insRespo) {
                          if (insErr) {
                            res.send({
                              "status": "0",
                              "response": res.__("address not Inserted")
                            });
                          } else {
                            res.send({ "status": "1", "response": res.__("Inserted Successfully") });
                          }
                        });
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
  };


  controller.mapinsertAddress = function (req, res) {

    //  city:required city
    //  locality:full addres will come
    //   landmark:whatever we enter in landmark
    // State,country,Zipcode as usal  s it is

    var errors = [];
    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('landmark', res.__('landmark is Required')).optional();
    req.checkBody('city', res.__('City is Required')).optional();
    req.checkBody('state', res.__('State is Required')).optional();
    req.checkBody('country', res.__('country is Required')).optional();
    req.checkBody('zipcode', res.__('Zipcode is Required')).optional();
    req.checkBody('lng', res.__('Longitude is Required')).notEmpty();
    req.checkBody('lat', res.__('latitude is Required')).notEmpty();

    req.checkBody('locality', res.__('locality is Required')).optional();
    req.checkBody('line1', res.__('line1 is Required')).optional();



    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }

    var a = req.body.locality;
    var words = a.split(", ");

    // var wlength = words.length;
    //  var countrye = wlength - 1;
    //  var state = wlength - 2;
    //  var city = wlength - 3;

    try {
      var data = {};
      data.user_id = req.body.user_id;
      data.line1 = words[0];
      data.locality = req.body.city;
      data.street = req.body.street;
      data.landmark = req.body.landmark;
      data.state = req.body.state;
      data.country = req.body.country;
      data.zipcode = req.body.zipcode;

      data.lng = parseFloat(req.body.lng);
      data.lat = parseFloat(req.body.lat);

      var location = { 'lng': data.lng, 'lat': data.lat };
      if (isNaN(data.lng)) {
        res.send({
          "status": "0",
          "response": res.__("lat and lng is required")
        });
      } else {
        if (Object.keys(req.body).length > 4) {
          db.GetOneDocument('users', { _id: req.body.user_id }, { 'addressList': 1 }, {}, function (addErr, docdata) {
            if (addErr) {
              res.send({ "status": "0", "response": res.__('address not updated') });
            } else {
              if (docdata.addressList.length > 4) {
                res.send({ "status": "0", "response": res.__('Can add Only 5 Adddress') });
              }
              else {
                db.UpdateDocument('users', { _id: req.body.user_id, 'addressList.status': 3 }, { "addressList.$.status": 1 }, { multi: true }, function (err, docdata) {
                  db.GetDocument('users', { _id: req.body.user_id }, {}, {}, function (addErr, addRespo) {
                    if (addRespo.length > 0 && addRespo[0].address.city) {
                      var addressdata = {};
                      addressdata.user_id = req.body.user_id;
                      addressdata.line1 = data.line1;
                      addressdata.street = data.street;
                      addressdata.city = data.locality;
                      addressdata.state = data.state;
                      addressdata.landmark = data.landmark;
                      addressdata.country = data.country;
                      addressdata.zipcode = req.body.zipcode;
                      addressdata.location = location;
                      addressdata.status = '3';
                      db.UpdateDocument('users', { _id: req.body.user_id }, { '$push': { 'addressList': addressdata } }, { multi: true }, function (addUErr, addURespo) {
                        if (addUErr) {
                          res.send({
                            "status": "0",
                            "response": res.__("address not updated")
                          });
                        } else {
                          res.send({ 'status': "1", "response": res.__("Inserted Successfully") });
                        }
                      });
                    } else {
                      var address = {
                        'name': req.body.name,
                        'email': req.body.email,
                        'line1': data.line1,
                        'country': data.country,
                        'street': data.street,
                        'landmark': data.landmark,
                        'city': data.locality,
                        'state': data.state,
                        'zipcode': req.body.zipcode,
                        'location': location,
                        'status': '3'
                      };
                      db.UpdateDocument('users', { _id: req.body.user_id }, { '$push': { 'addressList': address } }, { multi: true }, function (addUErr, addURespo) {
                        if (addUErr) {
                          res.send({
                            "status": "0",
                            "response": res.__("address not updated")
                          });
                        } else {
                          db.UpdateDocument('users', { _id: req.body.user_id }, { address: address }, function (insErr, insRespo) {
                            if (insErr) {
                              res.send({
                                "status": "0",
                                "response": res.__("address not Inserted")
                              });
                            } else {
                              res.send({ "status": "1", "response": res.__("Inserted Successfully") });
                            }
                          });
                        }
                      });
                    }
                  });
                });
              }
            }
          });
        } else {
          res.send({
            "status": "0",
            "response": res.__("Some parameters are missing")
          });
        }
      }
    } catch (e) {
      res.send({
        "status": "0",
        "message": res.__("error in connection")
      });
    }
  };


  controller.listAddress = function (req, res) {
    var errors = [];
    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }
    try {
      var data = {};
      data.whichAddress = req.body.address_name;
      data.user_id = req.body.user_id;
      db.GetDocument('users', { _id: req.body.user_id }, {}, {}, function (addErr, addRespo) {
        if (addRespo.length > 0) {
          if (addRespo[0].addressList) {
            var addressArr = [];
            if (!req.body.address_name) {
              //  var test={};
              var addressArr = [];
              for (var key = 0; key < addRespo[0].addressList.length; key++) {
                addressArr.push({
                  "address_name": key,
                  "address_status": addRespo[0].addressList[key].status || '',
                  "name": addRespo[0].username,
                  "email": addRespo[0].email,
                  // "country_code": addRespo[0].addressList[key].country,
                  // "mobile": addRespo[0].addressList[key].mobile || '',
                  "mobile": '',
                  "street": addRespo[0].addressList[key].street || '',
                  "line1": addRespo[0].addressList[key].line1 || '',
                  "fulladdress": addRespo[0].addressList[key].fulladdress || '',
                  "city": addRespo[0].addressList[key].city || addRespo[0].addressList[key].locality || '',
                  "landmark": addRespo[0].addressList[key].landmark || '',
                  "locality": addRespo[0].addressList[key].locality || '',
                  "state": addRespo[0].addressList[key].state || '',
                  "country": addRespo[0].addressList[key].country || '',
                  "zipcode": addRespo[0].addressList[key].zipcode || '',
                  "lng": addRespo[0].addressList[key].location.lng || '',
                  "lat": addRespo[0].addressList[key].location.lat || '',
                  "_id": addRespo[0].addressList[key]._id || ''
                });
              }
              if (addressArr.length >= 1) {
                res.send({
                  "status": "1",
                  "response": addressArr.reverse()
                });
              } else {
                res.send({
                  "status": "0",
                  "response": res.__("Sorry, Address name doesn't exist")
                });
              }
            } else {
              var Address_name = parseInt(req.body.address_name);
              var Addresslength = parseInt(addRespo[0].addressList.length);
              if (Address_name < Addresslength) {
                if (addRespo[0].addressList.length >= 1) {
                  for (var key = 0; key < addRespo[0].addressList.length; key++) {
                    if (key == req.body.address_name) {
                      addressArr.push({
                        "address_name": key,
                        "name": addRespo[0].username,
                        "email": addRespo[0].email,
                        //"country_code": addRespo[0].addressList[key].country,
                        // "mobile": addRespo[0].addressList[key].mobile || '',
                        "mobile": '',
                        "street": addRespo[0].addressList[key].street || '',
                        "line1": addRespo[0].addressList[key].line1 || '',
                        "city": addRespo[0].addressList[key].city || addRespo[0].addressList[key].locality || '',
                        "landmark": addRespo[0].addressList[key].landmark || '',
                        "locality": addRespo[0].addressList[key].locality || '',
                        "zipcode": addRespo[0].addressList[key].zipcode || '',
                        "fulladdress": addRespo[0].addressList[key].fulladdress || '',
                        "lng": addRespo[0].addressList[key].location.lng || '',
                        "lat": addRespo[0].addressList[key].location.lat || '',
                        "_id": addRespo[0].addressList[key]._id || ''
                      });
                      var addressListid = addRespo[0].addressList[key]._id;
                      db.UpdateDocument('users', { '_id': req.body.user_id, 'addressList.status': 3 }, { "addressList.$.status": 1 }, { multi: true }, function (err, docdata) {
                        db.UpdateDocument('users', { '_id': req.body.user_id, 'addressList._id': addressListid }, { "addressList.$.status": 3 }, {}, function (addUErr, addURespo) {
                          if (addUErr || addURespo.nModified == 0) {
                            res.send({
                              "status": "0",
                              "response": res.__("Sorry, No Address Found")
                            });
                          } else {
                            res.send({
                              "status": "1",
                              "response": addressArr
                            });
                          }
                        });
                      });
                    }
                  }
                } else {
                  res.send({
                    "status": "0",
                    "response": res.__("Sorry, No Address Found")
                  });
                }
              } else {
                res.send({
                  "status": "0",
                  "response": res.__("Sorry, Invalid address_name")
                });
              }
            }
          } else {
            res.send({
              "status": "0",
              "response": res.__("Sorry, Address name doesn't exist")
            });
          }
        } else {
          res.send({
            "status": "0",
            "response": res.__("Sorry, No Address Found")
          });
        }
      });
    } catch (e) {
      res.send({
        "status": "0",
        "message": res.__("error in connection")
      });
    }
  };



  controller.listAddressforandroid = function (req, res) {

    var errors = [];
    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('address_name', res.__('Address_name is Required')).notEmpty();

    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }
    var data = {};
    data.whichAddress = req.body.address_name;
    data.user_id = req.body.user_id;
    var addressArr = [];
    db.GetDocument('users', { _id: req.body.user_id }, {}, {}, function (addErr, addRespo) {
      if (addErr || addRespo.length == 0) {
        res.send({
          "status": "0",
          "response": res.__("Sorry, Address doesn't exist")
        });
      } else {
        var Address_name = parseInt(req.body.address_name);
        var Addresslength = parseInt(addRespo[0].addressList.length);
        if (Address_name < Addresslength) {
          for (var key = 0; key < addRespo[0].addressList.length; key++) {
            if (key == req.body.address_name) {
              addressArr.push({
                "address_name": key,
                "name": addRespo[0].username,
                "email": addRespo[0].email,
                "country_code": addRespo[0].addressList[key].country,
                //"mobile": addRespo[0].addressList[key].mobile || '',
                "mobile": '',
                "street": addRespo[0].addressList[key].street,
                "city": addRespo[0].addressList[key].city,
                "landmark": addRespo[0].addressList[key].landmark,
                "locality": addRespo[0].addressList[key].locality,
                "zipcode": addRespo[0].addressList[key].zipcode,
                "lng": addRespo[0].addressList[key].location.lng,
                "lat": addRespo[0].addressList[key].location.lat,
                "_id": addRespo[0].addressList[key]._id
              });
              var addressListid = addRespo[0].addressList[key]._id;
              db.UpdateDocument('users', { '_id': req.body.user_id, 'addressList.status': 3 }, { "addressList.$.status": 1 }, { multi: true }, function (err, docdata) {
                db.UpdateDocument('users', { '_id': req.body.user_id, 'addressList._id': addressListid }, { "addressList.$.status": 3 }, {}, function (addUErr, addURespo) {
                  if (addUErr || addURespo.nModified == 0) {
                    res.send({
                      "status": "0",
                      "response": res.__("Sorry, No Address Found")
                    });
                  } else {
                    res.send({
                      "status": "1",
                      "response": addressArr
                    });
                  }
                });
              });
            }
          }
        } else {
          res.send({
            "status": "0",
            "response": res.__("Sorry, Invalid address_name")
          });
        }
      }
    });
  };

  controller.deleteAddress = function (req, res) {

    var errors = [];
    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('address_name', res.__('Address Name is Required')).notEmpty();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }

    try {
      var whichAddress = parseInt(req.body.address_name);
      var user_id = req.body.user_id;
      db.GetDocument('users', { '_id': req.body.user_id }, {}, {}, function (addErr, addRespo) {
        if (addErr || addRespo.length == 0) {
          res.send({
            "status": "0",
            "response": res.__("address not updated")
          });
        } else {
          addRespo[0].addressList.splice(whichAddress, 1);
          db.UpdateDocument('users', { _id: req.body.user_id }, addRespo[0], { multi: true }, function (addUErr, addURespo) {
            if (addUErr) {
              res.send({
                "status": "0",
                "response": res.__("address not updated")
              });
            } else {
              res.send({ 'status': "1", "response": res.__("Deleted Successfully") });
            }

          });

        }
      });

    } catch (e) {
      res.send({
        "status": "0",
        "message": res.__("error in connection")
      });
    }
  };

  controller.setUserLocation = function (req, res) {


    var status = '0';
    var message = '';

    try {
      var data = {};
      data.user_id = req.body.user_id;
      data.location_id = req.body.location_id;

      var errors = [];

      req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
      req.checkBody('location_id', res.__('Location ID is Required')).notEmpty();
      errors = req.validationErrors();
      if (errors) {
        res.send({
          "status": "0",
          "errors": errors[0].msg
        });
        return;
      }

      if (Object.keys(req.body).length >= 2) {

        db.GetDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
          if (userErr || !userRespo) {
            res.send({
              "status": status,
              "message": res.__("Invalid Error")
            });
          } else
            if (userRespo.length >= 1) {
              db.GetDocument('locations', { _id: req.body.location_id }, {}, {}, function (locationErr, locRespo) {
                if (locationErr || !locRespo) {
                  res.send({
                    "status": status,
                    "message": res.__("Invalid Error")
                  });
                } else
                  if (locRespo.length > 0) {
                    userRespo[0].location_id = req.body.location_id;
                    db.UpdateDocument('users', { _id: req.body.user_id }, { $set: userRespo[0] }, { multi: true }, function (updateErr, updateRespo) {
                      if (updateErr) {
                        res.send({
                          "status": status,
                          "message": res.__("Invalid Error")
                        });
                      }
                      res.send({
                        "status": "1",
                        "message": res.__("Location Updated"),
                        "location_id": req.body.location_id
                      });
                    });
                  } else {
                    res.send({
                      "status": "0",
                      "message": res.__("Location id doesn't exist"),
                    });
                  }

              })

            } else {
              res.send({
                "status": status,
                "message": res.__("Invalid " + CONFIG.USER)
              });
            }
        });

      } else {
        res.send({
          "status": status,
          "message": res.__("Some Parameters are missing")
        });
      }
    } catch (e) {
      res.send({
        "status": status,
        "message": res.__("Error in connection")
      });
    }
  };

  controller.getRattingsOptions = function (req, res) {

    var errors = [];

    req.checkBody('holder_type', res.__('holder_type is Required')).notEmpty();
    req.checkBody('user', res.__(CONFIG.USER + ' is Required')).notEmpty();
    req.checkBody('job_id', res.__('job_id is Required')).notEmpty();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }
    var data = {};
    data.holder_type = req.body.holder_type;
    var review_opt_arr = [];
    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
      if (err) {
        res.send({
          "status": "0",
          "response": res.__("Please check " + CONFIG.USER + " id")
        });
      } else {
        if (req.body.holder_type == "user") {
          db.GetOneDocument('users', { '_id': req.body.user }, {}, {}, function (err, user) {
            if (err || !user) {
              res.send({
                "status": "0",
                "response": res.__("Please check " + CONFIG.USER + " id")
              });
            } else {
              var extension = {};
              extension.populate = { path: 'tasker' };
              db.GetOneDocument('task', { 'booking_id': req.body.job_id }, {}, extension, function (err, bookings) {
                if (err || !bookings) {
                  data.response = res.__("Jobs Not Available pls pass job_id");
                  res.send(data);
                } else {

                  var userimg = '';
                  if (bookings.tasker.avatar) {
                    userimg = settings.settings.site_url + bookings.tasker.avatar;
                  } else {
                    userimg = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                  }
                  review_opt_arr = [{
                    'option_holder': 'user',
                    'option_name': 'Way Of Approach',
                    'status': 'Active',
                    'option_id': 2,
                    'image': userimg,
                    'name': bookings.tasker.username
                  }];
                  res.send({
                    status: '1',
                    holder_type: req.body.holder_type,
                    total: review_opt_arr.length,
                    review_options: review_opt_arr
                  });
                }
              });
            }
          });
        } else if (req.body.holder_type == "provider") {
          db.GetOneDocument('tasker', { '_id': req.body.user }, {}, {}, function (err, tasker) {
            if (err || !tasker) {
              res.send({
                "status": "0",
                "response": res.__("please check " + CONFIG.TASKER + " id")
              });
            } else {
              var extension = {};
              extension.populate = { path: 'user' };
              db.GetOneDocument('task', { 'booking_id': req.body.job_id }, {}, extension, function (err, bookings) {
                if (err || !bookings) {
                  data.response = res.__("Jobs Not Available pls pass job_id");
                  res.send(data);
                } else {
                  var taskerimg = '';
                  if (bookings.user.avatar) {
                    taskerimg = settings.settings.site_url + bookings.user.avatar;
                  } else {
                    taskerimg = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                  }

                  review_opt_arr = [{
                    'option_holder': 'provider',
                    'option_name': 'Way Of Approach',
                    'status': 'Active',
                    'option_id': 1,
                    'image': taskerimg,
                    'username': bookings.user.username
                  }];
                  res.send({
                    status: '1',
                    holder_type: req.body.holder_type,
                    total: review_opt_arr.length,
                    review_options: review_opt_arr
                  });
                }
              });
            }
          });
        }
      }
    });
  };

  controller.userProfilePic = function (req, res) {
    req.checkBody('user_id', res.__('Invalid ' + CONFIG.USER)).notEmpty();

    var data = {};
    data.status = 0;

    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data); return;
    }

    var request = {};
    request.user_id = req.body.user_id;

    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
      if (err) {
        data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
        res.send(data);
      } else {
        db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, IsVaid) {
          if (err) {
            data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
            res.send(data);
          } else {
            if (IsVaid) {
              if (req.file) {
                data.image = attachment.get_attachment(req.file.destination, req.file.filename)
                data.img_name = encodeURI(req.file.filename);
                data.img_path = req.file.destination.substring(2);

                db.UpdateDocument('users', { '_id': request.user_id }, { 'avatar': 'uploads/images/users/' + data.img_name, 'img_name': data.img_name, 'img_path': data.img_path }, {}, function (err, result) {
                  if (err || result.nModified == 0) {
                    data.response = res.__('Unable to save your data');
                    res.send({
                      status: "0",
                      response: {
                        "msg": res.__("Unable to save your data")
                      }
                    });
                  } else {
                    data.status = 1;
                    
                    data.response = settings.settings.site_url + "uploads/images/users/" + req.file.filename;
                    res.send({
                      status: "1",
                      response: {
                        "image": settings.settings.site_url + "uploads/images/users/" + req.file.filename,
                        "msg": res.__("Image uploaded successfully...")
                      }
                    });
                  }
                });
              }

            } else {
              data.response = res.__('Invalid ' + CONFIG.TASKER);
              res.send(data);
            }
          }
        });
      }
    });
  };

  controller.apiKeys = function (req, res) {
    var data = {};
    var errors = [];

    req.checkBody('api_for', res.__('API is Required')).notEmpty();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }
    data.api_for = req.body.api_for;

    if (req.body.api_for && req.body.api_for != '') {
      var selectArr = req.body.api_for.split(",");

      var newSelectArr = [];
      var keyCount = 0;
      for (var value in selectArr) {
        var value = selectArr[value] + "_api_key";

        var sample = {};
        sample[value] = CONFIG[value];


        if (CONFIG[value] != '') {
          keyCount++;
          newSelectArr.push(sample);
        } else {
          newSelectArr[value] = '';
        }
      }
      if (keyCount > 0) {
        res.send({
          'status': '1',
          'response': newSelectArr
        });
      } else {
        res.send({
          'status': '0',
          'response': res.__("Invalid api key request")
        });
      }

    } else {
      res.send({
        "status": "0",
        "response": res.__("Some parameters are missing")
      });
    }
  };

  controller.getLocation = function (req, res) {

    var status = '0';
    var response = '';

    db.GetDocument('locations', { status: 1 }, {}, {}, function (err, respo) {
      if (err) {
        res.send({
          'status': '0',
          'response': res.__("No locations are available")
        });
      }
      if (respo.length > 0) {
        var locarionArray = [];
        for (var i = 0; i < respo.length; i++) {
          var data = {
            id: respo[i].id,
            city: respo[i].city
          };
          locarionArray.push(data);
        }
        res.send({ 'status': '1', 'response': { 'locations': locarionArray } });
      } else {
        res.send({
          'status': '0',
          'response': res.__("No locations are availbale")
        });
      }
    });
  };

  controller.cancellation = function (req, res) {
    var status = '0';
    var response = '';
    var errors = [];

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
    db.GetDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
      if (userRespo.length >= 1) {
        var categoryQuery = [{ "$match": { status: 1, 'type': 'user' } },
        {
          $group: {
            _id: "null",
            cancellation: { $push: { id: "$_id", reason: "$reason" } }
          }
        }
        ];
        db.GetAggregation('cancellation', categoryQuery, function (canErr, canRespo) {
          if (canRespo.length > 0) {
            res.send({
              "status": "1",
              "response": canRespo[0].cancellation
            });
          } else {
            res.send({
              "status": "0",
              "response": res.__("No reasons available to cancelling job")
            });
          }
        });
      } else {
        res.send({
          "status": "0",
          "response": res.__("Invalid " + CONFIG.USER)
        });
      }
    });

  }

  controller.getInvites = function (req, res) {
    var errors = [];
    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('username', res.__('Username is Required')).notEmpty();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }
    var data = {};
    var status = '0';
    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
      if (err || !settings) {
        res.send({
          "status": "0",
          "message": res.__("Configure your website settings")
        });
      } else {
        data.user_id = req.body.user_id;
        data.username = req.body.username;
        db.GetOneDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
          if (userRespo || !userErr) {
            db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
              if (err || !currencies) {
                res.send({
                  "status": "0",
                  "message": res.__("Configure your website settings")
                });
              } else {
                var detailsArr = {
                  'friends_earn_amount': parseFloat(settings.settings.referral.amount.referral),
                  'your_earn': '',
                  'your_earn_amount': parseFloat(settings.settings.referral.amount.referrer),
                  'referral_code': userRespo.unique_code || '',
                  'currency': currencies.code,
                  'link': settings.settings.site_url + 'register/user' || '',
                  'image_url': settings.settings.site_url + settings.settings.logo || ''
                };
                res.send({
                  "status": "1",
                  "response": { 'details': detailsArr }
                });
              }
            });
          } else {
            res.send({
              "status": "0",
              "message": res.__("Invalid " + CONFIG.USER)
            });
          }
        });

      }
    });
  }



  controller.getEarnings = function (req, res) {

    var errors = [];

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
    db.GetDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
      if (userRespo.length > 0) {
        var earningsArr = [];
        var wallet_amount = 0;
        db.GetDocument('transaction', { user: req.body.user_id }, {}, {}, function (walletErr, walletRespo) {
          if (walletErr) {
            res.send({
              "status": "0",
              "message": res.__("Check wallet")
            });
          } else
            if (walletRespo.length > 0 && (walletRespo[0].amount)) {
              wallet_amount = walletRespo[0].amount;
              if ((userRespo.length > 0) && (userRespo[0].refer_history)) {
                for (var i = 0; i < userRespo[0].refer_history.length; i++) {
                  var amountData = {};
                  if (userRespo[0].refer_history[i].used == 'true') {
                    amountData.amount = userRespo[0].refer_history[i].amount_earns;
                    amountData.email = userRespo[0].refer_history[i].reference_mail;
                  } else if (userRespo[0].refer_history[i].used == 'false') {
                    amountData.amount = 'joined';
                    amountData.email = userRespo[0].refer_history[i].reference_mail
                  }
                  earningsArr.push(amountData);
                }
              }

              db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
                if (err || !currencies) {
                  res.send({
                    "status": 0,
                    "message": res.__('Please check the ' + CONFIG.USER + '_id and try again')
                  });
                } else {
                  res.send({
                    "status": "1",
                    "response": { 'currency': currencies.code, 'wallet_amount': wallet_amount, 'earnings': earningsArr }
                  });
                }
              });

            } else {
              res.send({
                "status": "0",
                "message": res.__("Check wallet")
              });
            }
        });
      } else {
        res.send({
          "status": "0",
          "message": res.__("Invalid " + CONFIG.USER)
        });
      }
    });
  };

  controller.setUserGeo = function (req, res) {

    var status = '0';
    var message = '';

    var data = {};
    data.user_id = req.body.user_id;
    data.latitude = req.body.latitude;
    data.longitude = req.body.longitude;
    var errors = [];

    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('latitude', res.__('Latitude is Required')).notEmpty();
    req.checkBody('longitude', res.__('Longitude is Required')).notEmpty();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }
    if (Object.keys(req.body.user_id).length >= 3) {
      db.GetDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
        if (userRespo.length == 1) {
          userRespo[0].geo = [parseFloat(req.body.longitude), parseFloat(req.body.latitude)];
          db.UpdateDocument('users', { _id: userRespo[0]._id }, { $set: userRespo[0] }, { multi: true }, function (err, locatonRespo) { });
          var location_name = '0';
          if (userRespo[0].location_id != '' && userRespo[0].location_id) {
            db.GetDocument('locations', { "_id": userRespo[0].location_id }, {}, {}, function (locationsErr, locationsRespo) {
              if (locationsErr) {
                res.send({
                  "status": "0",
                  "response": res.__("Check your location")
                });
              } else {
                if (locationsRespo[0].city) {
                  location_name = locationsRespo[0].city;
                }
                var avail_amount = 0;
                db.GetDocument('transaction', { "user": userRespo[0]._id }, {}, {}, function (walletErr, walletRespo) {
                  if (walletRespo.length >= 0) {
                    avail_amount = parseInt(walletRespo[0].amount);

                    db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
                      if (err || !currencies) {
                        res.send({
                          "status": "0",
                          "response": res.__("Check your location")
                        });
                      } else {
                        res.send({
                          status: 1,
                          message: res.__('Geo Location Updated'),
                          location_name: location_name,
                          wallet_amount: avail_amount,
                          currency: currencies.code
                        });
                      }
                    });
                  }
                });
              }
            });
          } else {
            res.send({
              "status": "0",
              "message": res.__("Invalid Location")
            });
          }

        } else {
          res.send({
            "status": status,
            "message": res.__("Invalid " + CONFIG.USER)
          });
        }
      });
    } else {
      res.send({
        "status": status,
        "message": res.__("Some Parameters are missing")
      });
    }

  };


  controller.providerProfile = function (req, res) {
    var errors = [];
    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('provider_id', res.__(CONFIG.TASKER + ' ID is Required')).notEmpty();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }
    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
      if (err) {
        res.send({
          "status": "0",
          "response": res.__('INVALID ERROR')
        });
      } else {
        db.GetDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
          if (userErr) {
            res.send({
              "status": "0",
              "response": res.__('INVALID ERROR')
            });
          } else
            if (userRespo.length > 0) {
              var extension = {};
              extension.populate = { path: 'taskerskills.childid', select: 'name -_id image' };
              db.GetDocument('tasker', { _id: req.body.provider_id, role: 'tasker' }, {}, extension, function (proErr, proRespo) {
                if (proErr) {
                  res.send({
                    "status": "0",
                    "response": res.__("please check " + CONFIG.TASKER + " id")
                  });
                } else
                  if (proRespo.length > 0) {

                    var category_name = [];
                    let bio = '';
                    let avg_review = '';
                    let uimage = '';

                    if (proRespo[0].profile_details[1] && proRespo[0].profile_details[1].answer) {
                      var about = proRespo[0].profile_details[1].answer || "";
                    } else {
                      about = '';
                    }
                    if (proRespo[0].profile_details[0] && proRespo[0].profile_details[0].answer) {
                      var exp = proRespo[0].profile_details[0].answer || "";
                    } else {
                      exp = '';
                    }

                    if (proRespo[0].avg_review) {
                      avg_review = proRespo[0].avg_review;
                    } else {
                      avg_review = 0;
                    }
                    if (!proRespo[0].image) {
                      uimage = settings.settings.site_url + CONFIG.USER_PROFILE_THUMB_DEFAULT;
                    } else {
                      uimage = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE + proRespo[0].image;
                    }
                    var avatarimage;
                    if (proRespo[0].avatar) {
                      avatarimage = settings.settings.site_url + proRespo[0].avatar;
                    } else {
                      avatarimage = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                    }
                    var categoriesdetail = [];
                    for (var i = 0; i < proRespo[0].taskerskills.length; i++) {
                      if (proRespo[0].taskerskills[i].childid != null) {
                        categoriesdetail.push(proRespo[0].taskerskills[i].childid);
                      }
                    }

                    var a = proRespo[0].address.line1;
                    var words = a.split(", ");

                    var address = ''
                    if (proRespo[0].address) {
                      if (proRespo[0].address.line1) {
                        address += words[0] + ', ';
                      }
                      if (words[1] && words[1] != words[0]) {
                        address += words[1] + ', ';
                      }
                      if (proRespo[0].address.line2 && proRespo[0].address.line2 != words[1]) {
                        address += proRespo[0].address.line2 + ', ';
                      }
                      if (proRespo[0].address.city && proRespo[0].address.city != proRespo[0].address.line2) {
                        address += proRespo[0].address.city + ', ';
                      }
                      if (proRespo[0].address.state) {
                        address += proRespo[0].address.state + ', ';
                      }
                      if (proRespo[0].address.zipcode) {
                        address += proRespo[0].address.zipcode + ', ';
                      }
                      if (proRespo[0].address.country) {
                        address += proRespo[0].address.country;
                      }
                    }

                    var geocode = { 'latitude': proRespo[0].location.lat, 'longitude': proRespo[0].location.lng };
                    GoogleAPI.geocode(geocode, function (response) {
                      if (response[0].formatted_address) {
                        var working_location = response[0].formatted_address;
                      } else {
                        working_location = '';
                      }

                      res.send({
                        "status": "1",
                        "response": {
                          "siturl": settings.settings.site_url,
                          "provider_name": proRespo[0].username,
                          "email": proRespo[0].email,
                          "bio": about || '',
                          "experience": exp || '',
                          "category": categoriesdetail,
                          "avg_review": avg_review,
                          "image": avatarimage,
                          "mobile_number": proRespo[0].phone.code + proRespo[0].phone.number,
                          "provider_address": address,
                          'radius': proRespo[0].radius,
                          'working_location': working_location,
                          'provider_availability': proRespo[0].working_days

                        }
                      });
                    });
                  } else {
                    res.send({
                      "status": "0",
                      "response": res.__('Invalid ' + CONFIG.TASKER)
                    });
                  }
              });
            } else {
              res.send({
                "status": "0",
                "response": res.__("Invalid " + CONFIG.USER)
              });
            }
        });
      }
    });
  };


  controller.myJobsNew = function (req, res) {

    // taskLibrary.taskExpired({}, function (err, response) {

      var status = '0';
      var response = '';
      var errors = [];
      req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
      req.checkBody('type', res.__('Type is Required')).notEmpty();
      req.checkBody('perPage', res.__('Per Page is Required')).notEmpty();
      req.checkBody('page', res.__('Page is Required')).notEmpty();
      req.checkBody('orderby', res.__('Enter valid order')).optional();
      req.checkBody('sortby', res.__('Enter valid option')).optional();
      req.checkBody('from', res.__('Enter valid from date')).optional(); //yyyy-mm-dd hh:mm:ss
      req.checkBody('to', res.__('Enter valid to date')).optional();
      errors = req.validationErrors();
      if (errors) {
        res.send({
          "status": "0",
          "errors": errors[0].msg
        });
        return;
      }
      req.sanitizeBody('user_id').trim();
      req.sanitizeBody('type').trim();
      req.sanitizeBody('perPage').trim();
      req.sanitizeBody('page').trim();
      req.sanitizeBody('orderby').trim();
      req.sanitizeBody('sortby').trim();
      req.sanitizeBody('from').trim();
      req.sanitizeBody('to').trim();

      var data = {};
      data.user_id = req.body.user_id.trim();
      data.type = parseInt(req.body.type) || 1;
      if (parseInt(req.body.type) == 4) {
        data.type = [6, 7];
      } else if (parseInt(req.body.type) == 5) {
        data.type = [8];
      } else {
        data.type = [1, 2, 3, 4, 5];
      }
      data.orderby = parseInt(req.body.orderby) || -1;
      data.page = parseInt(req.body.page) || 1;
      data.perPage = parseInt(req.body.perPage);
      data.from = req.body.from + ' 00:00:00';
      data.to = req.body.to + ' 23:59:59';
      data.sortby = req.body.sortby || 'date';

      if (data.perPage <= 0) {
        data.perPage = 20;
      }

      if (req.body.type == '')
        data.type = [1, 2, 3, 4, 5];

      if (data.sortby == 'name') {
        data.sortby = 'service_type'
      } else if (data.sortby == 'date') {
        data.sortby = 'booking_date'
      }

      var sorting = {};
      sorting[data.sortby] = data.orderby;

      db.GetOneDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
        if (userErr || !userRespo) {
          
          res.send({
            "status": "0",
            "response": res.__("Invalid " + CONFIG.USER + ", Please check your data")
          });
        } else {

          var query = { 'user': new mongoose.Types.ObjectId(req.body.user_id), 'status': { "$in": data.type } };
          if (req.body.from && req.body.to) {
            query = { 'user': new mongoose.Types.ObjectId(req.body.user_id), 'status': { "$in": data.type }, "booking_information.booking_date": { '$gte': new Date(data.from), '$lte': new Date(data.to) } };
          }


          if (data.type == 1) {
            query = { 'user': new mongoose.Types.ObjectId(req.body.user_id), 'status': { '$in': [1, 2, 3, 4, 5] } };
          }
          db.GetCount('task', query, function (err, count) {
            if (err || count == 0) {
              
              res.send({
                "status": "0",
                "response": res.__("No New Task Found")
              });
            } else {
              db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                if (err || !settings) {
                  
                  data.response = res.__('Configure your website settings');
                  res.send(data);
                } else {

                  db.GetAggregation('task', [
                    { $match: query },
                    { "$lookup": { from: "tasker", localField: "tasker", foreignField: "_id", as: "tasker" } },
                    { "$lookup": { from: "categories", localField: "category", foreignField: "_id", as: "icon_normal" } },
                    { $unwind: { path: "$tasker", preserveNullAndEmptyArrays: true } },
                    { $unwind: { path: "$icon_normal", preserveNullAndEmptyArrays: true } },
                    {
                      "$group": {
                        "_id": "$_id",
                        "job_id": { "$first": "$booking_id" },
                        "tasker_id": { "$first": "$tasker._id" },
                        "tasker_name": { "$first": "$tasker.username" },
                        "status": { "$first": "$status" },
                        "task_id": { "$first": "$_id" },
                        "job_time": { "$first": "$booking_information.est_reach_date" },
                        "job_date": { "$first": "$booking_information.est_reach_date" },
                        "service_type": { "$first": "$booking_information.service_type" },
                        "service_icon": {
                          "$first": {
                            $cond: ["$icon_normal", "$icon_normal.image", { $literal: settings.settings.site_url + CONFIG.CATEGORY_DEFAULT_IMAGE }]
                          }
                        },
                        "booking_date": { "$first": "$booking_information.booking_date" },
                        "completed_date": { "$first": "$history.job_completed_time" },
                        "job_status": { "$first": "$status" },
                        "service_address": { "$first": "$service_address" },
                        "country_code": { "$first": "$tasker.phone.code" },
                        "contact_number": { "$first": "$tasker.phone.number" },
                        "doCall": {
                          "$first": {
                            $cond: { if: { $and: [{ $ne: ["$status", 7] }, { $ne: ["$status", 8] }] }, then: { $literal: "Yes" }, else: { $literal: "No" } }
                          }
                        },
                        "isSupport": {
                          "$first": {
                            $cond: { if: "$tasker.phone.number", then: { $literal: "No" }, else: { $literal: "Yes" } }
                          }
                        },
                        "doMsg": {
                          "$first": {
                            // $cond: { if: "$tasker.phone.number", then: { $literal: "Yes" }, else: { $literal: "No" } }
                            $cond: { if: { $and: [{ $ne: ["$status", 7] }, { $ne: ["$status", 8] }] }, then: { $literal: "Yes" }, else: { $literal: "No" } }
                          }
                        },
                        "doCancel": {
                          "$first": {
                            $cond: { if: { $and: [{ $ne: ["$status", 1] }, { $ne: ["$status", 2] }] }, then: { $literal: "No" }, else: { $literal: "Yes" } }
                            /*  $cond: { if: { $ne: ["$status", 6 ]},then: { $literal: "Yes" }, else: { $literal: "No" }
                          }*/
                          }
                        },
                      }
                    },
                    { "$sort": sorting },
                    { "$skip": (data.perPage * (data.page - 1)) },
                    { "$limit": data.perPage }
                  ], function (err, bookings) {

                    if (err || bookings.length == 0) {
                      
                      res.send({
                        "status": "0",
                        "response": "No New Task Found"
                      });
                    } else {
                      for (var i = 0; i < bookings.length; i++) {

                        if (bookings[i].service_icon) {
                          bookings[i].service_icon = settings.settings.site_url + bookings[i].service_icon;
                        }

                        var bookdate = bookings[i].booking_date;
                        var completed_date = bookings[i].completed_date;
                        bookings[i].booking_date = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.date_format);
                        bookings[i].job_date = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.date_format);
                        bookings[i].job_time = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.time_format);
                        switch (bookings[i].status) {
                          case 1:
                            bookings[i].job_status = 'Request Sent';
                            bookings[i].btn_group = 1;
                            break;
                          case 2:
                            bookings[i].job_status = 'Accepted';
                            bookings[i].btn_group = 2;
                            break;
                          case 3:
                            bookings[i].job_status = 'Started Off';
                            bookings[i].btn_group = 3;
                            break;
                          case 4:
                            bookings[i].job_status = 'Arrived';
                            bookings[i].btn_group = 4;
                            break;
                          case 5:
                            bookings[i].job_status = 'Job Started';
                            bookings[i].btn_group = 5;
                            break;
                          case 6:
                            bookings[i].job_status = 'Payment Pending';
                            bookings[i].btn_group = 6;
                            break;
                          case 7:
                            bookings[i].job_status = 'Completed';
                            bookings[i].btn_group = 7;
                            break;
                          case 8:
                            bookings[i].job_status = 'Cancelled';
                            bookings[i].btn_group = 8;
                            break;
                          case 9:
                            bookings[i].job_status = 'Dispute';
                            bookings[i].btn_group = 9;
                            break;
                          default:
                            bookings[i].job_status = 'Onprogress';
                            bookings[i].btn_group = 1;
                            break;
                        }

                        if(bookings[i].btn_group == 6 || bookings[i].btn_group == 7) {
                          bookings[i].job_time = timezone.tz(completed_date, settings.settings.time_zone).format(settings.settings.time_format);
                        }
                      }
                      res.send({
                        "status": "1",
                        "response": {
                          "tasker_name": bookings.tasker_name,
                          "total_jobs": count,
                          "current_page": data.page,
                          "perPage": data.perPage,
                          "jobs": bookings
                        }
                      })
                    }
                  })
                }
              });
            }
          });
        }
      });
    // });
  }

  controller.viewJob = function (req, res) {

    var data = {};
    data.status = 0;
    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('job_id', res.__('Job ID is Required')).notEmpty();
    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data); return;
    }

    req.sanitizeBody('user_id').trim();
    req.sanitizeBody('job_id').trim();

    var request = {};
    request.user_id = req.body.user_id;
    request.job_id = req.body.job_id;

    async.waterfall([
      function (callback) {
        db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, user) {
          if (err || !user) {
            data.response = res.__('Invalid ' + CONFIG.USER);
            res.send(data);
          } else { callback(err, user); }
        });
      },
      function (user, callback) {
        var options = {};
        options.populate = 'tasker';
        db.GetOneDocument('task', { 'booking_id': request.job_id }, {}, options, function (err, task) {
          if (err || !task) {
            data.response = res.__('Invalid Job');
            res.send(data);
          } else { callback(err, user, task); }
        });
      },
      function (user, task, callback) {
        if (task.tasker) {
          db.GetOneDocument('tasker', { '_id': task.tasker._id }, {}, {}, function (err, tasker) {
            if (err) {
              data.response = res.__("Task didn't have valid " + CONFIG.TASKER);
              res.send(data);
            } else { callback(err, user, task, tasker); }
          });

        } else {
          data.response = res.__("Check " + CONFIG.TASKER + " Document");
          res.send(data);
        }

      },
      function (user, task, tasker, callback) {
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
          if (err) {
            data.response = res.__('Invalid ' + CONFIG.USER);
            res.send(data);
          } else { callback(err, user, task, tasker, settings); }
        });
      },
      function (user, task, tasker, settings, callback) {

        db.GetDocument('review', { 'user': request.user_id, 'task': task._id, 'type': 'user' }, {}, {}, function (err, reviews) {
          if (err || !reviews) {
            data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
            res.send(data);
          } else {
            callback(err, user, task, tasker, settings, reviews);

          }
        });
      },
      function (user, task, tasker, settings, reviews, callback) {

        db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function(err, currencies) {
          if (err || !reviews) {
            data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
            res.send(data);
          } else {
            callback(err, user, task, tasker, settings, reviews, currencies);

          }
        });
      },
      function (user, task, tasker, settings, reviews, currencies, callback) {

        db.GetOneDocument('category', { '_id': task.category }, {}, {}, function (err, categories) {
          if (err || !categories) {
            data.response = res.__('Invalid beauty seeker, Please check your data');
            res.send(data);
          } else {
            callback(err, user, task, tasker, settings, reviews, currencies, categories);

          }
        });
      },
    ], function (err, user, task, tasker, settings, reviews, currencies, categories) {
      var ratings = ''
      var instructions = '';
      if (task.task_description) {
        instructions = task.task_description;
      }
      var provider_ratings = 0;
      var bio = '';
      var image = '';
      var userArr = {};
      var provider_location = {};
      var locality_provider = {};
      for (var key = 0; key < tasker.profile_details.length; key++) {
        if (tasker.profile_details[key].question == '57518be5dc9026c80c333ca7') {
          var texthtml = tasker.profile_details[key].answer;
          bio = htmlToText.fromString(texthtml);
        }
      }

      if (tasker.avatar) {
        image = settings.settings.site_url + tasker.avatar;
      } else {
        image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
      }

      if (tasker.provider_location) {
        provider_location = tasker.provider_location;
      }
      else {
        provider_location = {
          'provider_lng': tasker.location.lng,
          'provider_lat': tasker.location.lat
        };
      }




      locality_provider = {
        latitude: tasker.location.lat,
        longitude: tasker.location.lng
      };
      var provider_hourlyrate = "";

      for (var i = 0; i < tasker.taskerskills.length; i++) {
        if (typeof tasker.taskerskills[i].childid == typeof task.category) {
          provider_hourlyrate = tasker.taskerskills[i].hour_rate;
        }
        else {
          provider_hourlyrate = '';
        }
      }
      userArr = {
        'provider_id': tasker._id,
        'provider_name': tasker.username,
        'provider_email': tasker.email,
        'provider_hourlyrate': provider_hourlyrate,
        'provider_minimumhourlyrate': categories.commision,
        'provider_image': image,
        'provider_mobile': tasker.phone.code + tasker.phone.number || "",
        'provider_ratings': tasker.avg_review || 0,
        // 'bio': bio || ''
        'bio': ''
      };

      function objToString(obj) {
        var str = '';
        for (var p in obj) {
          if (obj.hasOwnProperty(p)) {
            str += p + ':' + obj[p] + ', ';
          }
        }
        return str;
      }
      var bInformation = task.booking_information;
      var lat = bInformation.user_latlong.lat ? bInformation.user_latlong.lat : task.location.lat;
      var lng = bInformation.user_latlong.log ? bInformation.user_latlong.log : task.location.log;
      var do_cancel = "No";
      switch (task.status.toString()) {
        case '1':
          request.status = 'On Progress';
          request.btn_group = 1;
          break;
        case '2':
          request.status = 'Accepted';
          request.btn_group = 2;
          break;
        case '3':
          request.status = 'Started Off';
          request.btn_group = 3;
          break;
        case '4':
          request.status = 'Arrived';
          request.btn_group = 4;
          break;
        case '5':
          request.status = 'Job Started';
          request.btn_group = 5;
          break;
        case '6':
          request.status = 'Payment Pending';
          request.btn_group = 6;
          break;
        case '7':
          request.status = 'Completed';
          request.btn_group = 7;
          break;
        case '8':
          request.status = 'Cancelled';
          request.btn_group = 8;
          break;
        case '9':
          request.status = 'Dispute';
          request.btn_group = 9;
          break;
        case '0':
          request.status = 'Job Expired';
          request.btn_group = 0;
          break;
        default:
          request.status = 'On Progress';
          request.btn_group = 1;
          break;
      }

      do_cancel = "No";
      if (task.status == 2 || task.status == 1) {
        do_cancel = "Yes";
      }
      var need_payment = "No";
      if (task.status == 6) {
        need_payment = "Yes";
      }
      if (task.invoice) {
        if (task.invoice.status == 1) {
          need_payment = "No";
        }
      }

      var submit_ratings = "No";
      if (task.status == 7 && reviews.length == 0) {
        submit_ratings = "Yes";
      }

      var cancelreason = "";
      if (task.cancellation) {
        cancelreason = task.cancellation.reason;
      }
      else {
        cancelreason = '';
      }


      var address = '';
      
      if (task.billing_address) {
        if (task.billing_address.line1) {
          address += task.billing_address.line1 + ', ';
        }
        if (task.billing_address.line2 && task.billing_address.line2 != task.billing_address.line1) {
          address += task.billing_address.line2 + ', ';
        }
        if (task.billing_address.city && task.billing_address.city != task.billing_address.line2) {
          address += task.billing_address.city + ', ';
        }
        if (task.billing_address.state) {
          address += task.billing_address.state + ', ';
        }
        if (task.billing_address.zipcode) {
          address += task.billing_address.zipcode + ', ';
        }
        if (task.billing_address.country) {
          address += task.billing_address.country;
        }
      }

      var billing = [];

      if(task.invoice) {

        if (task.invoice.amount.total) {
          var response = { 'title': 'Task amount', 'dt': '1', 'amount': (task.invoice.amount.total * currencies.value).toFixed(2) };
          billing.push({ response });
        }
        if (task.invoice.amount.service_tax) {
          var response = { 'title': 'Service tax', 'dt': '1', 'amount': (task.invoice.amount.service_tax * currencies.value).toFixed(2) };
          billing.push({ response });
        }
        
        if (task.invoice.amount.wallet_usage > 0) {
          var response = { 'title': 'Wallet used amount', 'dt': '1', 'amount': (task.invoice.amount.wallet_usage * currencies.value).toFixed(2) };
          billing.push({ response });
        }
        if (task.invoice.amount.paid_amount > 0) {
          var response = { 'title': 'Paid amount', 'dt': '1', 'amount': (task.invoice.amount.paid_amount * currencies.value).toFixed(2) };
          billing.push({ response });
        }
        if (task.invoice.amount.extra_amount) {
          var response = { 'title': 'Material amount', 'dt': '1', 'amount': (task.invoice.amount.extra_amount * currencies.value).toFixed(2) };
          billing.push({ response });
        }
        if (task.invoice.amount.discount > 0) {
          var response = { 'title': 'Coupon discount', 'dt': '1', 'amount': (task.invoice.amount.discount * currencies.value).toFixed(2) };
          billing.push({ response });
        }

        if (task.invoice.amount.total) {
          if(task.invoice.amount.extra_amount > 0 && !task.invoice.amount.discount) {
            var response = { 'title': 'Total', 'dt': '1', 'amount': ((task.invoice.amount.total + task.invoice.amount.service_tax + task.invoice.amount.extra_amount) * currencies.value).toFixed(2) };
          billing.push({ response });
          } else if(task.invoice.amount.discount > 0 && !task.invoice.amount.extra_amount) {
            var response = { 'title': 'Total', 'dt': '1', 'amount': ((task.invoice.amount.total + task.invoice.amount.service_tax - task.invoice.amount.discount) * currencies.value).toFixed(2) };
            billing.push({ response });
          } else if(task.invoice.amount.extra_amount > 0 && task.invoice.amount.discount > 0) {
            var response = { 'title': 'Total', 'dt': '1', 'amount': ((task.invoice.amount.total + task.invoice.amount.service_tax + task.invoice.amount.extra_amount - task.invoice.amount.discount) * currencies.value).toFixed(2) };
          billing.push({ response });
          } else {
            var response = { 'title': 'Total', 'dt': '1', 'amount': ((task.invoice.amount.total + task.invoice.amount.service_tax) * currencies.value).toFixed(2) };
            billing.push({ response });
          }
        }

        if (task.invoice.amount.balance_amount != 0 || task.invoice.amount.balance_amount != "") {
          if (task.payment_type == "wallet-other") {
            var response = { 'title': 'Balance Total', 'dt': '1', 'amount': (task.invoice.amount.balance_amount * currencies.value).toFixed(2) };
            billing.push({ response });
          }

          var balancetotal = task.invoice.amount.balance_amount;
        }
        else {
          var balancetotal = '';
        }
        if (task.payment_type) {
          var response = { 'title': 'Payment mode', 'dt': '0', 'amount': task.payment_type };
          billing.push({ response });
        }
      }

      var jobsArr = {
        'task_id': task._id,
        'job_id': req.body.job_id,
        'provider': userArr,
        'avg_rating': ratings,
        'location': bInformation['user_latlong'],
        'lat': lat,
        'lng': lng,
        'book_date': timezone.tz(bInformation['booking_date'], settings.settings.time_zone).format(settings.settings.date_format),
        'book_time': timezone.tz(bInformation['booking_date'], settings.settings.time_zone).format(settings.settings.time_format)/*  + ' - ' +
        timezone.tz(bInformation['booking_date'], settings.settings.time_zone).add(1, 'hour').format(settings.settings.time_format) */,
        'date': timezone.tz(bInformation['booking_date'], settings.settings.time_zone).format(settings.settings.date_format),
        'time': timezone.tz(bInformation['booking_date'], settings.settings.time_zone).format(settings.settings.time_format)/*  + ' - ' +
        timezone.tz(bInformation['booking_date'], settings.settings.time_zone).add(1, 'hour').format(settings.settings.time_format) */,
        'booking_address': address,
        'exactaddress': task.task_address.exactaddress,
        'service_address': task.service_address,
        'job_status': request.status,
        'service_type': bInformation.service_type,
        'instructions': instructions,
        'work_type': bInformation.work_type,
        'do_cancel': do_cancel,
        'cancelreason': cancelreason,
        'need_payment': need_payment,
        'submit_ratings': submit_ratings,
        'distance_by': settings.settings.distanceby,
        'provider_location': provider_location,
        'locality_provider': locality_provider,
        'btn_group': request.btn_group,
        'billing': billing

      };
      var timelineArr = {
        "job_booking_time": CONFIG.NOTIFICATION.JOB_BOOKED,
        "provider_assigned": CONFIG.NOTIFICATION.HIRED_JOB,
        "provider_start_off_time": CONFIG.NOTIFICATION.PROVIDER_START_OFF_FROM_HIS_LOCATION,
        "location_arrived_time": CONFIG.NOTIFICATION.PROVIDER_ARRIVED_AT_JOB_LOCATION,
        "job_started_time": CONFIG.NOTIFICATION.JOB_HAS_BEEN_STARTED,
        "job_completed_time": CONFIG.NOTIFICATION.JOB_HAS_BEEN_COMPLETED,
        "job_closed_time": CONFIG.NOTIFICATION.JOB_HAS_BEEN_CLOSED,
        "wallet_usage_time": CONFIG.NOTIFICATION.PAYMENT_MADE_THROUGH_WALLET,
        "job_cancellation_time": CONFIG.NOTIFICATION.JOB_HAS_BEEN_CANCELLED
      };
      var job_history = {};
      if (task.history) {
        job_history = task.history;
        if (task.history.estimate_reach_time) {
          delete taskRespo.job_history['estimate_reach_time'];
        }
        var response = [];
        for (var key in timelineArr) {
          for (var key1 in job_history) {
            if (key1 == key) {
              response.push({
                'title': timelineArr[key],
                'date': job_history[key] ? timezone.tz(job_history[key], settings.settings.time_zone).format(settings.settings.date_format) : "",
                'time': job_history[key] ? timezone.tz(job_history[key], settings.settings.time_zone).format(settings.settings.time_format) : ""
              });
            }
          }
        }
      }
      res.send({
        "status": "1",
        "response": { "info": jobsArr, "timeline": response || "" }
      });
    });
  }

  controller.jobTimeline = function (req, res) {


    var status = '0';
    var response = '';

    var timelineArr = {
      "job_booking_time": CONFIG.NOTIFICATION.JOB_BOOKED,
      "provider_assigned": CONFIG.NOTIFICATION.HIRED_JOB,
      "provider_start_off_time": CONFIG.NOTIFICATION.PROVIDER_START_OFF_FROM_HIS_LOCATION,
      "location_arrived_time": CONFIG.NOTIFICATION.PROVIDER_ARRIVED_AT_JOB_LOCATION,
      "job_started_time": CONFIG.NOTIFICATION.JOB_HAS_BEEN_STARTED,
      "job_completed_time": CONFIG.NOTIFICATION.JOB_HAS_BEEN_COMPLETED,
      "job_closed_time": CONFIG.NOTIFICATION.JOB_HAS_BEEN_CLOSED,
      "wallet_usage_time": CONFIG.NOTIFICATION.PAYMENT_MADE_THROUGH_WALLET,
      "job_cancellation_time": CONFIG.NOTIFICATION.JOB_HAS_BEEN_CANCELLED
    };

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

    try {
      var data = {};
      data.user_id = req.body.user_id;
      data.job_id = req.body.job_id;

      if (req.body.user_id != '' && req.body.job_id != '') {
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
          if (err || !settings) {
            res.send({
              "status": "0",
              "response": res.__("Some Parameters are missing")
            });
          } else {
            db.GetDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
              if (userErr) {
                res.send({
                  "status": "0",
                  "response": res.__('INVALID ERROR')
                });
              } else
                if (userRespo.length == 1) {
                  db.GetDocument('task', { 'booking_id': req.body.job_id }, {}, {}, function (bookErr, bookRespo) {
                    if (bookErr) {
                      res.send({
                        "status": "0",
                        "response": res.__('INVALID ERROR')
                      });
                    }
                    if (bookRespo.length > 0) {
                      var job_history = bookRespo[0].history;

                      if (job_history.estimate_reach_time) {
                        delete job_history.estimate_reach_time
                      }


                      var response = [];

                      for (var key in timelineArr) {

                        if (job_history[key]) {
                          for (var key1 in job_history) {
                            if (key1 == key) {
                              response.push({
                                'title': timelineArr[key],
                                'date': timezone.tz(job_history[key], settings.settings.time_zone).format(settings.settings.date_format),
                                'time': timezone.tz(job_history[key], settings.settings.time_zone).format(settings.settings.time_format)
                              });
                            }
                          }
                        }
                         /* else {
                          response.push({
                            'title': timelineArr[key],
                            'date': '',
                            'time': ''
                          });
                        } */
                      }

                      res.send({
                        "status": "1",
                        "response": { "status": bookRespo[0].status, "timeline": response }
                      });
                    }
                  });
                } else {
                  res.send({
                    "status": "0",
                    "response": res.__("Authentication Failed")
                  });
                }
            });
          }
        });

      } else {
        res.send({
          "status": "0",
          "response": res.__("Some Parameters are missing")
        });
      }

    } catch (e) {
      res.send({
        "status": "0",
        "response": res.__("error in connection")
      });
    }
  }

  controller.deleteJob = function (req, res) {

    var status = '0';
    var response = '';

    var errors = [];

    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('job_id', res.__('Job ID is Required')).notEmpty();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }

    try {

      var data = {};
      data.user_id = req.body.user_id;
      data.job_id = req.body.job_id;

      if ((req.body.user_id != '') && (req.body.job_id != '')) {
        db.GetDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
          if (userErr) {
            res.send({
              "status": "0",
              "message": res.__("Invalid " + CONFIG.USER)
            });
          }
          if (userRespo.length == 1) {
            db.GetDocument('task', { booking_id: req.body.job_id }, {}, {}, function (bookErr, bookRespo) {
              if (bookRespo.length == 1) {
                db.DeleteDocument('task', { booking_id: req.body.job_id }, function (delErr, delRespo) {
                  res.send({
                    "status": "1",
                    "message": res.__("Job request rejected")
                  });
                });
              } else {
                res.send({
                  "status": "0",
                  "message": res.__("This job is unavailable")
                });
              }
            });
          } else {
            res.send({
              "status": "0",
              "message": res.__("Invalid " + CONFIG.USER)
            });
          }
        });
      } else {
        res.send({
          "status": "0",
          "message": res.__("Some Parameters are missing")
        });
      }
    } catch (e) {
      res.send({
        "status": "0",
        "response": response,
        "message": res.__("Error in connection")
      });
    }
  };

  controller.cancellationReason = function (req, res) {
    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    //validation
    var data = {};
    data.status = '0';
    // Throw Validation Error
    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data);
      return;
    }
    // Throw Validation Error
    var request = {};
    request.user_id = req.body.user_id;
    db.GetOneDocument('users', { '_id': request.user_id, "role": "user" }, {}, {}, function (err, user) {
      if (err || !user) {
        data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
        res.send(data);
      } else {
        db.GetDocument('cancellation', { 'status': 1, 'type': 'user' }, {}, {}, function (err, cancellationReason) {
          if (err || cancellationReason.length == 0) {
            data.response = res.__('No Reasons Available to Cancelling Job');
            res.send(data);
          } else {
            data.status = '1';
            data.response = { reason: [] };
            for (var i = 0; i < cancellationReason.length; i++) {
              var reason = {};
              reason.id = cancellationReason[i].id;
              reason.reason = cancellationReason[i].reason;
              data.response.reason.push(reason);
            }
            res.send(data);
          }
        });
      }
    });
  }
  controller.cancelJob = function (req, res) {

    var status = '0';
    var response = '';
    var errors = [];

    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('job_id', res.__('Job ID is Required')).notEmpty();
    req.checkBody('reason', res.__('Reason is Required')).notEmpty();
    errors = req.validationErrors();
    if (errors) {

      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }

    var data = {};
    data.user_id = req.body.user_id.trim();
    data.job_id = req.body.job_id.trim();
    data.reason = req.body.reason;

    db.GetOneDocument('users', { _id: req.body.user_id.trim() }, {}, {}, function (userErr, userRespo) {
      if (userErr || !userRespo) {
        res.send({
          "status": "0",
          "response": res.__("Invalid " + CONFIG.USER)
        });
      } else {

        var options = {};
        options.populate = 'category user tasker';
        db.GetOneDocument('task', { booking_id: req.body.job_id.trim() }, {}, options, function (bookErr, bookRespo) {
          if (bookErr || !bookRespo) {
            res.send({
              "status": "0",
              "response": res.__("This job is unavailable")
            });
          } else {

            db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
              if (err || !settings) {
                res.send({
                  "status": "0",
                  "response": res.__("Configure your website settings")
                });

              } else {

                var doAction = 0;
                if (bookRespo.status <= 5) {

                  var reason_id = data.reason;
                  var reason_text = '';

                  if (data.reason == 1) {
                    reason_text = 'Changing My Mind';
                  } else if (data.reason == 2) {
                    reason_text = 'Not Intrested';
                  }
                  var jobDetails = {};

                  jobDetails = {
                    'cancellation': {
                      'reason': req.body.reason,
                      'type': 'user',
                      'date': new Date(),
                      'status': 1
                    },
                    'status': 8,
                    'history.job_cancellation_time': Date()
                  };


                  db.UpdateDocument('task', { booking_id: req.body.job_id }, { $set: jobDetails }, {}, function (bookUErr, bookURespo) {

                    if (bookUErr) {
                      res.send({
                        "status": "0",
                        "response": "Task Not Available"
                      });
                    }
                    else {

                      if (bookRespo.bookingmode == 'booknow' && bookRespo.status != 1) {
                        db.UpdateDocument('tasker', { _id: bookRespo.tasker._id }, { $unset: { current_task: "" } }, function (err, taskerreslut) { { } });
                      }

                      var userData = { job_cancel: {} };
                      var current_date = new Date();
                      var hour = "hour_" + current_date.getHours();
                      userData['job_cancel'][hour] = 1;
                      userData['job_cancel']['count'] = 1;
                      if (bookRespo.tasker) {
                        var message = bookRespo.user.username + ' cancelled this job.';
                        var options = [req.body.job_id, bookRespo.tasker];
                        push.sendPushnotification(bookRespo.tasker._id, message, 'job_cancelled', 'ANDROID', options, 'PROVIDER', function (err, response, body) { });
                      }

                      var job_date = timezone.tz(bookRespo.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.date_format);
                      var job_time = timezone.tz(bookRespo.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.time_format);

                      var mailData = {};
                      mailData.template = 'Taskrejectedmailtotasker';
                      mailData.to = bookRespo.tasker.email;
                      mailData.html = [];
                      mailData.html.push({ name: 'username', value: bookRespo.user.username });
                      mailData.html.push({ name: 'taskername', value: bookRespo.tasker.username });
                      mailData.html.push({ name: 'bookingid', value: bookRespo.booking_id });
                      mailData.html.push({ name: 'startdate', value: job_date });
                      mailData.html.push({ name: 'cancelreason', value: req.body.reason });

                      mailcontent.sendmail(mailData, function (err, response) { });

                      res.send({
                        "status": "1",
                        "response": {
                          "job_id": req.body.job_id,
                          "message": res.__("Job Cancelled")
                        }
                      });
                    }
                  });
                } else {
                  res.send({
                    "status": "0",
                    "response": res.__("You cannot do this action right now.")
                  });
                }
              }
            });
          }
        });
      }
    });
  }



  controller.getCategoryInfo = function (req, res) {

    var data = {};
    data.status = 0;

    req.checkBody('category_id', res.__('Invalid Location')).notEmpty();
    req.checkBody('location_id', res.__('Invalid Location')).notEmpty();
    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data); return;
    }

    req.sanitizeBody('category_id').trim();
    req.sanitizeBody('location_id').trim();

    var request = {};
    request.category_id = req.body.category_id;
    request.location_id = req.body.location_id;

    db.GetOneDocument('category', { '_id': request.category_id }, {}, {}, function (err, category) {
      if (err || !category) {
        data.response = res.__('Category unavailable');
        res.send(data);
      } else {
        db.GetOneDocument('locations', { '_id': request.location_id }, {}, {}, function (err, checkLocations) {
          if (err || !checkLocations) {
            data.response = res.__('Location unavailable');
            res.send(data);
          } else {
            db.GetOneDocument('locations', { '_id': request.location_id, 'avail_category': request.category_id }, {}, {}, function (err, locations) {
              if (err || !locations) {
                data.response = {};
                data.response.is_service_available = 'no';
                data.response.msg = res.__('Service not available in requested location');
                res.send(data);
              } else {
                data.status = 1;
                data.response = {};
                data.response.is_service_available = 'yes';
                if (locations.fare) {
                  if (locations.fare[request.category_id].min_fare) {
                    data.response.min_fare = locations.fare[request.category_id].min_fare;
                  }
                }
                data.response.currency_code = 'usd';
                data.response.description = category.description;
                res.send(data);
              }
            });
          }
        });
      }
    });
  };

  controller.socialCheck = function (req, res) {

    var data = {};
    data.status = 0;

    var request = {};
    request.media_id = req.body.media_id;
    request.gcm_id = req.body.gcm_id;
    request.deviceToken = req.body.deviceToken;

    var errors = [];

    req.checkBody('media_id', res.__('Media ID is Required')).notEmpty();
    req.checkBody('gcm_id', res.__('Gcm ID is Required')).optional();
    req.checkBody('deviceToken', res.__('DeviceToken is Required')).optional();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }

    db.GetOneDocument('users', { 'media_id': request.media_id }, {}, {}, function (err, user) {
      if (err || !user) {
        data.response = res.__('Authentication Failed');
        res.send(data);
      } else {
        if (user.status == 'Active') {
          if (request.gcm_id) {
            request.push_data = { 'push_notification_key': { 'gcm_id': request.gcm_id }, 'push_type': 'ANDROID' };
            request.key = request.gcm_id;
          } else if (request.deviceToken) {
            request.push_data = { 'key': request.deviceToken, 'push_type': 'IOS' };
            request.key = request.deviceToken;
          } else {
            request.push_data = { 'gcm_id': '', 'push_type': '' };
            request.key = '';
          }

          async.parallel({
            users: function (callback) {
              db.UpdateDocument('users', { '_id': user._id }, request.push_data, {}, function (err, response) {
                if (err || !response) { callback(err, response); } else { callback(err, response); }
              });
            },
            locations: function (callback) {
              db.GetOneDocument('locations', { '_id': user.location_id }, {}, {}, function (err, response) {
                if (err || !response) { callback(err, response); } else { callback(err, response); }
              });
            },
            settings: function (callback) {
              db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, response) {
                if (err || !response) { callback(err, response); } else { callback(err, response); }
              });
            },
            wallet: function (callback) {
              db.GetOneDocument('wallet', { 'user_id': user._id }, {}, {}, function (err, response) {
                if (err || !response) { callback(err, response); } else { callback(err, response); }
              });
            },
            currencies: function (callback) {
              db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, response) {
                if (err || !response) { callback(err, response); } else { callback(err, response); }
              });
            }
          }, function (err, result) {
            if (err || !result) {
              data.response = res.__('Something went wrong');
              res.send(data);
            } else {
              data.status = 1;
              data.message = res.__('You are Logged In successfully');

              if (user.image) {
                data.user_image = result.settings.settings.site_urlL + CONFIG.USER_PROFILE_IMAGE + user.image;
              } else {
                data.user_image = result.settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
              }

              data.user_id = user._id;
              data.soc_key = crypto.createHash('md5').update(user._id.toString()).digest("hex");
              data.user_name = user.user_name;

              if (user.user_group) {
                data.user_group = user.user_group;
              } else {
                data.user_group = 'User';
              }

              data.email = user.email;
              data.country_code = user.country_code;
              data.phone_number = user.phone_number;
              data.referal_code = user.referral_code;

              data.location_id = '';
              if (user.location_id) {
                if (user.location_id != '') {
                  data.location_id = user.location_id;
                }
              }

              data.key = request.key;

              data.location_name = '';
              if (result.locations.city != '') {
                data.location_name = result.locations.city;
              }

              data.wallet_amount = 0;
              if (result.wallet.total != '') {
                data.wallet_amount = result.wallet.total;
              }

              data.currency = result.currencies.code;

              res.send(data);
            }
          });
        } else {
          data.response = res.__('Your account is currenty unavailable');
          res.send(data);
        }
      }
    });
  };

  controller.getMoneyPage = function (req, res) {
    var errors = [];
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
    if (req.body.user_id != '') {
      db.GetDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
        if (userErr) { res.send({ "status": "0", "response": res.__("invalid " + CONFIG.USER) }) } else {
          if (!userErr || userRespo.length > 0) {
            db.GetOneDocument('settings', { "alias": "general" }, { 'settings.wallet': 1 }, {}, function (err, wallet) {
              if (err || !wallet.settings.wallet.amount.minimum || !wallet.settings.wallet.amount.maximum) {
                data.response = res.__('Wallet Money Settings are not Available, Please try Again Later.');
                res.send(data);
              } else {
                db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
                  if (err || !currencies) {
                    res.send({
                      "status": 0,
                      "message": res.__('Invalid ' + CONFIG.USER)
                    });
                  } else {
                    db.GetDocument('paymentgateway', { 'status': 1 }, {}, {}, function (err, result) {
                      if (err) {
                        res.send({
                          "status": 0,
                          "message": res.__('Invalid Payment')
                        });
                      }
                      else {
                        var paymentArr = [];
                        for (var i = 0; i < result.length; i++) {
                          if (result[i].alias == "stripe") {
                            result[i].gateway_name = "Credit card";
                            paymentArr.push({ 'name': result[i].gateway_name, 'code': result[i].alias });
                          }

                          if (result[i].alias == "paypal") {
                            result[i].gateway_name = "Pay by " + result[i].gateway_name;
                            paymentArr.push({ 'name': result[i].gateway_name, 'code': result[i].alias });
                          }
                        }
                        var wallet_money = { 'min_amount': wallet.settings.wallet.amount.minimum, "middle_amount": ((parseInt(wallet.settings.wallet.amount.minimum) + parseInt(wallet.settings.wallet.amount.maximum)) / 2).toString(), 'max_amount': wallet.settings.wallet.amount.maximum };
                        var current_balance = 0;
                        db.GetOneDocument('walletReacharge', { user_id: req.body.user_id }, {}, {}, function (walletErr, walletRespo) {
                          if (walletErr || !walletRespo) {
                            res.send({
                              "status": "1",
                              "auto_charge_status": "0",
                              "response": { 'currency': currencies.code, 'current_balance': current_balance.toString(), 'recharge_boundary': wallet_money },
                              "Payment": paymentArr
                            });
                          } else {

                            if (!current_balance && walletRespo.total) {
                              current_balance = walletRespo.total.toString();
                            }
                            res.send({
                              "status": "1",
                              "auto_charge_status": "0",
                              "response": { 'currency': currencies.code, 'current_balance': current_balance.toString(), 'recharge_boundary': wallet_money },
                              "Payment": paymentArr
                            });
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          } else {
            res.send({
              "status": "0",
              "message": res.__("Invalid " + CONFIG.USER)
            });
          }
        }
      });
    } else {
      res.send({
        "status": "0",
        "message": res.__("Some Parameters are missing")
      });
    }
  }

  controller.category_search = function (req, res) {
    var errors = [];
    req.checkBody('cat_data', res.__('category is Required')).notEmpty();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }
    var data = req.body.cat_data;
    var name = new RegExp(data, 'i');
    db.GetAggregation('category', [
      { $match: { $and: [{ 'status': { $ne: 0 }, 'parent': { "$exists": false } }, { $or: [{ 'name': { $regex: name } }, { 'skills.tags': { $regex: name } }] }] } },
      /*{ $match:  { 'status': { $ne: 0 }, 'parent':{"$exists" :false }, $or: [ { 'name': { $regex: name } }, { 'skills.tags': { $regex: name } } ] } },*/
      { $project: { _id: '$_id', name: '$name', slug: '$slug', parent: '$parent', skills: '$skills' } }
    ], function (err, doc) {
      var dataArr = [];
      for (var i = 0; i < doc.length; i++) {
        dataArr.push({ id: doc[i]._id, category: doc[i].name });
      }
      if (err) {
        res.send({
          'status': "0",
          'response': res.__("Invalid Error")
        });
      } else {
        res.send({
          'status': "1",
          'response': dataArr
        });
      }
    });
  };

  controller.social_login = function (req, res) {
    var data = {};
    data.facebook = {};
    data.facebook.id = req.body.user_id;
    data.facebook.name = req.body.user_name;
    data.username = req.body.user_name;
    data.facebook.email = req.body.email;
    data.email = req.body.email;
    data.avatar = req.body.user_image;
    data.phone = {};
    data.phone.code = req.body.country_code;
    data.phone.number = req.body.phone_number;
    data.referal_code = req.body.referal_code;
    db.InsertDocument('users', data, function (err, response) {
      if (err) {
        res.send({ "status": "0", "message": res.__("Username or Phone Number Already Registered") });
      } else {
        res.send({
          "status": "1",
          "response": response
        });
      }
    });

  };

  controller.paymentList = function (req, res) {
    var data = {};
    data.status = '0';

    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('job_id', res.__('Job ID is Required')).notEmpty();

    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data); return;
    }

    var request = {};
    request.user = req.body.user_id;
    request.task = req.body.job_id;

    async.parallel({
      settings: function (callback) {
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
          callback(err, settings);
        });
      },
      task: function (callback) {
        var extension = {};
        extension.populate = 'user category tasker';
        db.GetOneDocument('task', { booking_id: request.task, user: request.user, status: 6 }, {}, extension, function (err, task) {
          callback(err, task);
        });
      },
      wallet: function (callback) {
        db.GetOneDocument('walletReacharge', { user_id: request.user }, { 'total': 1 }, {}, function (err, wallet) {
          callback(err, wallet);
        });
      },
      paymentgateway: function (callback) {
        db.GetDocument('paymentgateway', { 'status': 1 }, {}, {}, function (err, paymentgateway) {
          callback(err, paymentgateway);
        });
      },
    }, function (err, result) {
      if (err || !result || !result.task) {
        data.response = res.__("We're unable to show you the payment method this time.");
        res.send(data);
      } else {
        var jobArr = {};
        var payment_amount = '';

        var category_image = result.settings.settings.site_url + CONFIG.CATEGORY_DEFAULT_IMAGE;
        if (result.task.category) {
          if (result.task.category.icon_normal) {
            category_image = result.settings.settings.site_url + result.task.category.icon_normal;
          }
        }

        var user_image = result.settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
        if (result.task.user) {
          if (result.task.user.avatar) {
            user_image = result.settings.settings.site_url + result.task.user.avatar;
          } else {
            user_image = result.settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
          }
        }

        if (!result.task.invoice.amount.wallet_usage) {
          result.task.invoice.amount.wallet_usage = 0;
        }

        payment_amount = result.task.invoice.amount.grand_total - result.task.invoice.amount.wallet_usage;
        if (payment_amount < 0) {
          payment_amount = 0.00;
        }
        jobArr = {
          job_id: req.body.job_id,
          job_date: timezone.tz(result.task.booking_information.reach_date, result.settings.settings.time_zone).format(result.settings.settings.date_format),
          job_time: timezone.tz(result.task.booking_information.reach_date, result.settings.settings.time_zone).format(result.settings.settings.time_format),
          currency: result.task.currency || 'USD',
          payment_amount: payment_amount,
          category_image: category_image,
          user_image: user_image,
          latitude: result.task.booking_information['user_latlong']['lat'],
          longitude: result.task.booking_information['user_latlong']['lon']
        };

        var avail_amount = 0;
        if (result.wallet) {
          if (result.wallet.total) {
            avail_amount = result.wallet.total;
          }
        }

        var paymentArr = [];
        if (result.settings.settings.pay_by_cash.status == 1) {
          paymentArr.push({ 'name': 'Pay by Cash', 'code': 'cash' });
        }

        if (result.settings.settings.wallet.status == 1) {
          if (avail_amount > 0) {
            paymentArr.push({ 'name': 'Use my wallet/money ($' + avail_amount + ')', 'code': 'wallet' });
          }
        }

        for (var i = 0; i < result.paymentgateway.length; i++) {
          if (result.paymentgateway[i].alias == "stripe") {
            result.paymentgateway[i].gateway_name = "Credit card";
            paymentArr.push({ 'name': result.paymentgateway[i].gateway_name, 'code': result.paymentgateway[i].alias });
          }

          if (result.paymentgateway[i].alias == "paypal") {
            result.paymentgateway[i].gateway_name = "Pay by " + result.paymentgateway[i].gateway_name;
            paymentArr.push({ 'name': result.paymentgateway[i].gateway_name, 'code': result.paymentgateway[i].alias });
          }
        }
        res.send({
          "status": "1",
          "response": { "info": jobArr, "payment": paymentArr }
        });
      }
    });
  }



  controller.paymentListhistory = function (req, res) {
    var data = {};
    data.status = '0';

    req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
    req.checkBody('job_id', res.__('Job ID is Required')).notEmpty();

    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data); return;
    }

    var request = {};
    request.user = req.body.user_id;
    request.task = req.body.job_id;

    db.GetOneDocument('task', { booking_id: request.task, user: request.user, status: { '$in': [6, 7] } }, {}, {}, function (err, taskdata) {
      if (err || taskdata.length == 0) {
        data.response = res.__("We're unable to show you the payment method this time.");
        res.send(data);
      }
      else {
        async.parallel({
          settings: function (callback) {
            db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
              callback(err, settings);
            });
          },
          task: function (callback) {
            var extension = {};
            extension.populate = 'user category tasker';
            db.GetOneDocument('task', { booking_id: request.task, user: request.user, status: { '$in': [6, 7] } }, {}, extension, function (err, task) {
              callback(err, task);
            });
          },
          wallet: function (callback) {
            db.GetOneDocument('walletReacharge', { user_id: request.user }, { 'total': 1 }, {}, function (err, wallet) {
              callback(err, wallet);
            });
          },
          paymentgateway: function (callback) {
            db.GetDocument('paymentgateway', { 'status': 1 }, {}, {}, function (err, paymentgateway) {
              callback(err, paymentgateway);
            });
          },
          review: function (callback) {
            db.GetCount('review', { 'user': new mongoose.Types.ObjectId(request.user_id), type: 'user', 'task': taskdata._id }, function (err, count) {
              callback(err, count);
            });
          }
        }, function (err, result) {
          if (err || !result || !result.task) {
            data.response = res.__("We're unable to show you the payment method this time.");
            res.send(data);
          } else {
            db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
              if (err || !currencies) {
                res.send({
                  "status": 0,
                  "message": res.__('Error')
                });
              } else {
                var jobArr = {};
                var payment_amount = '';
                var category_image = result.settings.settings.site_url + CONFIG.CATEGORY_DEFAULT_IMAGE;
                if (result.task.category) {
                  if (result.task.category.icon_normal) {
                    category_image = result.settings.settings.site_url + result.task.category.icon_normal;
                  }
                }
                var user_image = result.settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                if (result.task.user) {
                  if (result.task.user.avatar) {
                    user_image = result.settings.settings.site_url + result.task.user.avatar;
                  } else {
                    user_image = result.settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                  }
                }
                if (!result.task.invoice.amount.wallet_usage) {
                  result.task.invoice.amount.wallet_usage = 0;
                }
                if (result.task.payment_type) {
                  var payment_type = result.task.payment_type;
                }
                else {
                  payment_type = '';
                }
                if (!result.review) {
                  var review = '1';
                }
                else {
                  review = '0';
                }
                payment_amount = result.task.invoice.amount.balance_amount - result.task.invoice.amount.wallet_usage;
                if (payment_amount < 0) {
                  payment_amount = 0.00;
                }
                jobArr = {
                  job_id: req.body.job_id,
                  task_id: result.task._id,
                  job_date: timezone.tz(result.task.booking_information.est_reach_date, result.settings.settings.time_zone).format(result.settings.settings.date_format),
                  job_time: result.task.invoice.worked_hours_human,
                  currency: currencies.code,
                  payment_mode: payment_type,
                  payment_amount: (payment_amount * currencies.value).toFixed(2),
                  category_image: category_image,
                  user_image: user_image,
                  review: review,
                  latitude: result.task.booking_information['user_latlong']['lat'],
                  longitude: result.task.booking_information['user_latlong']['lon']
                };

                var avail_amount = 0;
                if (result.wallet) {
                  if (result.wallet.total) {
                    avail_amount = result.wallet.total;
                  }
                }

                var paymentArr = [];
                if (result.settings.settings.pay_by_cash.status == 1) {
                  paymentArr.push({
                    'name': 'Pay by Cash',
                    'code': 'cash',
                    'active': result.settings.settings.site_url + 'app/mobile/images/cash-active-64.png',
                    'in_active': result.settings.settings.site_url + 'app/mobile/images/cash-64.png'
                  });
                }

                if (result.settings.settings.wallet.status == 1) {
                  if (avail_amount > 0) {
                    paymentArr.push({
                      'name': 'Use my wallet/money ($' + avail_amount + ')',
                      'code': 'wallet',
                      'active': result.settings.settings.site_url + 'app/mobile/images/wallet-active-64.png',
                      'in_active': result.settings.settings.site_url + 'app/mobile/images/wallet-64.png'

                    });
                  }
                }

                for (var i = 0; i < result.paymentgateway.length; i++) {
                  if (result.paymentgateway[i].gateway_name == "Stripe" && result.paymentgateway[i].status == 1) {
                    result.paymentgateway[i].gateway_name = "Credit card";
                    paymentArr.push({
                      'name': result.paymentgateway[i].gateway_name,
                      'code': result.paymentgateway[i].alias,
                      'active': result.settings.settings.site_url + 'app/mobile/images/card-active-64.png',
                      'in_active': result.settings.settings.site_url + 'app/mobile/images/card-64.png'
                    });
                  }

                  if (result.paymentgateway[i].alias == "paypal" && result.paymentgateway[i].status == 1) {
                    result.paymentgateway[i].gateway_name = "Pay by " + result.paymentgateway[i].gateway_name;
                    paymentArr.push({
                      'name': result.paymentgateway[i].gateway_name,
                      'code': result.paymentgateway[i].alias,
                      'active': result.settings.settings.site_url + 'app/mobile/images/paypal-active-64.png',
                      'in_active': result.settings.settings.site_url + 'app/mobile/images/paypal-64.png'
                    });
                  }
                }

                data.status = 1;
                data.response = {};
                data.response.billing = [];
                var billing = [];

                function display(a) {
                  var hours = Math.trunc(a / 60);
                  var minutes = a % 60;
                  if (hours == 0) {
                    return minutes + " minutes";
                  } else {
                    return hours + " hours " + minutes + " minutes";
                  }
                }

                var rep = (result.task.invoice.worked_hours_human).toString();
                var re = /hours/gi;
                var str = rep;
                var newstr = str.replace(re, 'hours');
                var strvalue = newstr;
                var resvalue = strvalue.slice(1, 6)
                if (resvalue == 'hours') {
                  var finaldata = 0;
                } else {
                  var rep = (result.task.invoice.worked_hours_human).toString();
                  var re = /mins/gi;
                  var str = rep;
                  var newstr = str.replace(re, '');
                  var less = parseInt(newstr);
                  finaldata = 60 - less;
                }

              /*   if (result.task.invoice.amount.minimum_cost >= 0) {
                  var response = { 'title': 'Base price', 'dt': '1', 'amount': (result.task.invoice.amount.minimum_cost * currencies.value).toFixed(2) };
                  billing.push({ response });

                } */
                /* if (result.task.hourly_rate) {
                var response = { 'title': 'Base price', 'dt': '0', 'amount': (result.task.hourly_rate * currencies.value).toFixed(2) };
                billing.push({ response });

              }*/
                if (result.task.invoice.worked_hours_human) {
                  var response = { 'title': 'Total Hours Worked', 'dt': '0', 'amount': result.task.invoice.worked_hours_human };
                  billing.push({ response });
                }
                /*  if (result.task.invoice.worked_hours) {
                var response = { 'title': 'Free Hours', 'dt': '0', 'amount': "1 hr" };
                billing.push({ response });
              }
              */
                function deciHours(time) {
                  return (function (i) { return i + (Math.round(((time - i) * 60), 10) / 100); })(parseFloat(time, 10));
                }
                /*   var datecheck = deciHours(result.task.invoice.worked_hours).toString().split(".");
                var datecheck1 = parseInt(deciHours(result.task.invoice.worked_hours_human).toString().split("."));

                if (datecheck[1]) {
                var finaldata = 60 - ((parseFloat(datecheck[0]) * 60) + parseFloat(datecheck[1].substring(0, 2)));
              } else {
              var finaldata = 60 - (parseFloat(datecheck[0]) * 60);
            }
            if (finaldata > 0) {
            var response = { 'title': 'Remaining Hours', 'dt': '0', 'amount': display(finaldata) };
            billing.push({ response });
          }*/
                if (result.task.hourly_rate && result.task.category.ratetype == 'Flat') {
                  var response = { 'title': 'Rate', 'dt': '1', 'amount': (result.task.hourly_rate * currencies.value).toFixed(2) };
                  billing.push({ response });
                }
                else{
                  if(result.task.hourly_rate){
                    var response = { 'title': 'Houlry Rate', 'dt': '1', 'amount': (result.task.hourly_rate * currencies.value).toFixed(2) };
                    billing.push({ response });
                  }
                }

                if (result.task.invoice.amount.discount > 0) {
                  var response = { 'title': 'Coupon discount', 'dt': '1', 'amount': (result.task.invoice.amount.discount * currencies.value).toFixed(2) };
                  billing.push({ response });
                }


                if (result.task.invoice.amount.total) {
                  var response = { 'title': 'Task amount', 'dt': '1', 'amount': (result.task.invoice.amount.total * currencies.value).toFixed(2) };
                  billing.push({ response });
                }
                if (result.task.invoice.amount.service_tax) {
                  var response = { 'title': 'Service tax', 'dt': '1', 'amount': (result.task.invoice.amount.service_tax * currencies.value).toFixed(2) };
                  billing.push({ response });
                }
                
                if (result.task.invoice.amount.wallet_usage > 0) {
                  var response = { 'title': 'Wallet used amount', 'dt': '1', 'amount': (result.task.invoice.amount.wallet_usage * currencies.value).toFixed(2) };
                  billing.push({ response });
                }
                if (result.task.invoice.amount.paid_amount > 0) {
                  var response = { 'title': 'Paid amount', 'dt': '1', 'amount': (result.task.invoice.amount.paid_amount * currencies.value).toFixed(2) };
                  billing.push({ response });
                }
                if (result.task.invoice.amount.extra_amount) {
                  var response = { 'title': 'Miscellaneous amount', 'dt': '1', 'amount': (result.task.invoice.amount.extra_amount * currencies.value).toFixed(2) };
                  billing.push({ response });
                }
                if (result.task.invoice.amount.grand_total) {
                  var response = { 'title': 'Grand Total', 'dt': '1', 'amount': (result.task.invoice.amount.grand_total * currencies.value).toFixed(2) };
                  billing.push({ response });
                }

                var balancetotal = '';

                if (result.task.invoice.amount.total) {
                  if(result.task.invoice.amount.extra_amount > 0 && !result.task.invoice.amount.discount) {
                    balancetotal = result.task.invoice.amount.total + result.task.invoice.amount.service_tax + result.task.invoice.amount.extra_amount;
                  } else if(result.task.invoice.amount.discount > 0 && !result.task.invoice.amount.extra_amount) {
                    balancetotal = result.task.invoice.amount.total + result.task.invoice.amount.service_tax - result.task.invoice.amount.discount;
                  } else if(result.task.invoice.amount.extra_amount > 0 && result.task.invoice.amount.discount > 0) {
                    balancetotal = result.task.invoice.amount.total + result.task.invoice.amount.service_tax + result.task.invoice.amount.extra_amount - result.task.invoice.amount.discount;
                  } else {
                    balancetotal = result.task.invoice.amount.total + result.task.invoice.amount.service_tax;
                  }
                }

                if (result.task.invoice.amount.balance_amount != 0 || result.task.invoice.amount.balance_amount != "") {
                  if (result.task.payment_type == "wallet-other") {
                    var response = { 'title': 'Balance Total', 'dt': '1', 'amount': (result.task.invoice.amount.balance_amount * currencies.value).toFixed(2) };
					balancetotal = result.task.invoice.amount.balance_amount;
                    billing.push({ response });
                  }
                }
                
                if (result.task.payment_type) {
                  var response = { 'title': 'Payment mode', 'dt': '0', 'amount': payment_type };
                  billing.push({ response });
                }
                res.send({
                  "status": "1",
                  "response": { "info": jobArr, "payment": paymentArr, 'billing': billing, 'balancetotal': balancetotal }
                });
              }
            });
          }
        });

      }
    });
  }

  controller.jobMoreInfouser = function (req, res) {

    //validation
    req.checkBody('user_id', res.__('Invalid ' + CONFIG.USER)).notEmpty();
    req.checkBody('job_id', res.__('Invalid Job Info')).notEmpty();
    //validation

    var data = {};
    data.status = 0;

    // Throw Validation Error
    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data);
      return;
    }
    // Throw Validation Error

    var request = {};
    request.user_id = req.body.user_id;
    request.job_id = req.body.job_id;



    db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, provider) {
      if (err || !provider) {
        data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
        res.send(data);
      } else {
        var extension = {};
        extension.populate = { path: 'user', select: 'image avg_review -_id' };
        db.GetOneDocument('task', { 'booking_id': request.job_id }, {}, extension, function (err, bookings) {
          if (err || !bookings) {
            data.response = res.__("Jobs Not Available");
            res.send(data);
          } else {
            db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
              if (err || !currencies) {
                res.send({
                  "status": 0,
                  "message": res.__('Error')
                });
              } else {
                if (bookings.user && (bookings.status == 6 || bookings.status == 3 || bookings.status == 7)) {
                  data.status = 1;
                  data.response = {};
                  data.response.job = {};
                  data.response.job.need_payment = 1;
                  if (bookings.pay_status == "paid" || bookings.invoice.status == 1) {
                    data.response.job.need_payment = 0;
                  }
                  data.response.job.currency = currencies.code;
                  data.response.job.job_summary = bookings.invoice.summary || "";
                  data.response.job.billing = [];
                  data.response.job.btn_group = 7;

                  function display(a) {
                    var hours = Math.trunc(a / 60);
                    var minutes = a % 60;
                    if (hours == 0) {
                      return minutes + " mins";
                    } else {
                      return hours + " hours " + minutes + " mins";
                    }
                  }


                  // var test = bookings.invoice.worked_hours_human;
                  //  var str2 = test.slice(0);

                  if (bookings.invoice.amount.minimum_cost >= 0) {
                    var billing = { 'title': 'Minimum Cost', 'dt': '1', 'amount': (bookings.invoice.amount.minimum_cost * currencies.value).toFixed(2) };
                    data.response.job.billing.push(billing);
                  }
                  /* if (bookings.invoice.amount.hourly_rate) {
                    var billing = { 'title': 'Base price', 'dt': '1', 'amount': (bookings.invoice.amount.hourly_rate * currencies.value).toFixed(2) };
                    data.response.job.billing.push(billing);
                  } */
                  if (bookings.invoice.worked_hours_human) {
                    var response = { 'title': 'Total Hours Worked', 'dt': '1', 'amount': bookings.invoice.worked_hours_human };
                    data.response.job.billing.push(response);
                  }
                  /*  if (bookings.invoice.worked_hours) {
                  var response = { 'title': 'Free Hours', 'dt': '0', 'amount': "1 hr" };
                  data.response.job.billing.push(response);
                }*/

                  function deciHours(time) {
                    return (function (i) { return i + (Math.round(((time - i) * 60), 10) / 100); })(parseFloat(time, 10));
                  }
                  /*    var datecheck = deciHours(bookings.invoice.worked_hours).toString().split(".");
                  var datecheck1 = parseInt(deciHours(bookings.invoice.worked_hours_human).toString().split("."));
                  if (datecheck[1]) {
                  var finaldata = 60 - ((parseFloat(datecheck[0]) * 60) + parseFloat(datecheck[1].substring(0, 2)));
                } else {
                var finaldata = 60 - (parseFloat(datecheck[0]) * 60);
              }*/

                  var rep = (bookings.invoice.worked_hours_human).toString();
                  var re = /hours/gi;
                  var str = rep;
                  var newstr = str.replace(re, 'hours');
                  var strvalue = newstr;
                  var resvalue = strvalue.slice(1, 6)
                  if (resvalue == 'hours') {
                    var finaldata = 0;
                  } else {
                    var rep = (bookings.invoice.worked_hours_human).toString();
                    var re = /mins/gi;
                    var str = rep;
                    var newstr = str.replace(re, '');
                    var less = parseInt(newstr);
                    finaldata = 60 - less;
                  }
                  //if (bookings.invoice.worked_hours) {
                  if (finaldata > 0) {
                    var response = { 'title': 'Remaining Hours', 'dt': '0', 'amount': display(finaldata) };
                    data.response.job.billing.push(response);
                  }
                  /* if (bookings.invoice.amount.task_cost) {
                    var billing = { 'title': 'Base price', 'dt': '1', 'amount': (bookings.invoice.amount.task_cost * currencies.value).toFixed(2) };
                    data.response.job.billing.push(billing);
                  } */
                  if (bookings.invoice.amount.discount > 0) {
                    var billing = { 'title': 'Coupon discount', 'dt': '1', 'amount': (bookings.invoice.amount.discount * currencies.value).toFixed(2) };
                    data.response.job.billing.push(billing);
                  }

                  if (bookings.invoice.amount.total) {
                    var response = { 'title': 'Task amount', 'dt': '1', 'amount': (bookings.invoice.amount.total * currencies.value).toFixed(2) };
                    data.response.job.billing.push(response);
                  }
                  if (bookings.invoice.amount.service_tax >= 0) {
                    var billing = { 'title': 'Service tax', 'dt': '1', 'amount': (bookings.invoice.amount.service_tax * currencies.value).toFixed(2) };
                    data.response.job.billing.push(billing);
                  }

                  

                  if (bookings.invoice.amount.wallet_usage > 0) {
                    var billing = { 'title': 'Wallet used amount', 'dt': '1', 'amount': (bookings.invoice.amount.wallet_usage * currencies.value).toFixed(2) };
                    data.response.job.billing.push(billing);
                  }
                  if (bookings.invoice.amount.paid_amount > 0) {
                    var billing = { 'title': 'Paid amount', 'dt': '1', 'amount': (bookings.invoice.amount.paid_amount * currencies.value).toFixed(2) };
                    data.response.job.billing.push(billing);
                  }
                  if (bookings.invoice.amount.extra_amount) {
                    var billing = { 'title': 'Miscellaneous amount', 'dt': '1', 'amount': (bookings.invoice.amount.extra_amount * currencies.value).toFixed(2) };
                    data.response.job.billing.push(billing);
                  }
                  if (bookings.invoice.amount.grand_total) {
                    var response = { 'title': 'Grand Total', 'dt': '1', 'amount': (bookings.invoice.amount.grand_total * currencies.value).toFixed(2) };
                    data.response.job.billing.push(response);
                  }
                  res.send(data);
                } else {
                  data.response = res.__("You cannot do any action in this job right now.");
                  res.send(data);
                }
              }
            });
          }
        });
      }
    });
  }

  controller.submitRattings = function (req, res) {

    console.log("qwertyuighjkl,req.body",req.body)
    var errors = [];
    req.checkBody('ratingsFor', 'Ratings For is Required').notEmpty();
    req.checkBody('job_id', 'Job ID is Required').notEmpty();
    errors = req.validationErrors();
    if (errors) {
      res.send({
        "status": "0",
        "errors": errors[0].msg
      });
      return;
    }

    var data = {};
    data.ratingsFor = req.body.ratingsFor;
    data.job_id = req.body.job_id;
    data.ratings = req.body.ratings;

    if (typeof req.body.ratings != "object") {
      data.ratingsArr = JSON.parse(req.body.ratings);
    } else {
      data.ratingsArr = req.body.ratings;
    }

    data.comments = req.body.comments;
    var imgstatus = 0;
    if (req.file) {
      imgstatus = 1;
    }
    if (req.file) {
      data.image = attachment.get_attachment(req.file.destination, req.file.filename)
      data.img_name = encodeURI(req.file.filename);
      data.img_path = req.file.destination.substring(2);
    }

    db.GetDocument('task', { booking_id: req.body.job_id }, { 'user': 1, 'tasker': 1, 'user_review_status': 1, 'provider_review_status': 1, 'review_status': 1 }, {}, function (bookErr, bookRespo) {
      if (bookErr || bookRespo.length <= 0) {
        res.send({
          "status": "0",
          "response": "INVALID ERROR"
        });
      } else {
        var providersRating = 0;
        var usersRating = 0;

        if (bookRespo[0].provider_review_status) {
          if (req.body.ratingsFor == 'tasker' && (bookRespo[0].provider_review_status == 'Yes')) {
            providersRating = 1;
          }
        }
        if (bookRespo[0].user_review_status) {
          if (req.body.ratingsFor == 'user' && (bookRespo[0].user_review_status == 'Yes')) {
            usersRating = 1;
          }
        }

        if ((req.body.ratingsFor == 'tasker' && providersRating == 0) || (req.body.ratingsFor == 'user' && usersRating == 0)) {

          var user_id = bookRespo[0].user;
          var provider_id = bookRespo[0].tasker;

          var ratingsArr = data.ratingsArr.filter(Boolean);
          //var ratingsArr = data.ratings;
          var num_of_ratings = 0;
          var totalRatings = 0;
          var avg_rating = 0;

          for (var i = 0; i < (ratingsArr).length; i++) {
            totalRatings = totalRatings + parseInt(ratingsArr[i]['rating']);
            num_of_ratings++;
          }
          avg_rating = totalRatings / num_of_ratings;

          var job_dataArr = {
            'total_options': num_of_ratings,
            'total_ratings': totalRatings,
            'avg_rating': parseInt(avg_rating, 2),
            'ratings': ratingsArr,
            'comments': data.comments
          };

          if (req.body.ratingsFor == 'user') {

            var updateData = { 'ratings': {} };
            updateData.ratings[req.body.ratingsFor] = job_dataArr;
            updateData.ratings['provider_review_status'] = 'Yes';
            db.UpdateDocument('task', { booking_id: req.body.job_id }, { $set: updateData }, {}, function (bookUErr, bookURespo) {
              if (bookUErr) {
                res.send({
                  "status": "0",
                  "response": "Invalid data"
                })
              } else if (req.body.ratingsFor == 'user') {
                if (imgstatus == 1) {
                  var orgimage = 'uploads/images/users/' + data.img_name;
                } else {
                  orgimage = '';
                }

                var review_data = {
                  'type': "user",
                  'task': bookRespo[0]._id,
                  'user': user_id,
                  'tasker': provider_id,
                  'rating': req.body.ratings[0].rating,
                  'comments': data.comments,
                  'status': 1,
                  'image': orgimage,
                  'img_name': data.img_name,
                  'img_path': data.img_path
                };

                db.InsertDocument('review', review_data, function (err, response) {
                  if (err) {
                    res.send({ "status": "0", "message": "Username or Phone Number Already Registered" });
                  } else {
                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                      if (err) {
                        data.response = 'Invalid ' + CONFIG.TASKER + ', Please check your data';
                        res.send(data);
                      } else {
                        var getQuery = [{
                          "$match": { status: { $ne: 0 }, "_id": new mongoose.Types.ObjectId(provider_id) }
                        },

                        { $unwind: { path: "$taskerskills", preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: 'categories', localField: "taskerskills.childid", foreignField: "_id", as: "taskerskills.childid" } },
                        { $unwind: { path: "$taskerskills", preserveNullAndEmptyArrays: true } },
                        { $group: { "_id": "$_id", 'taskercategory': { '$push': '$taskerskills' }, "taskerskills": { "$first": "$taskerskills" }, "createdAt": { "$first": "$createdAt" } } },
                        { $lookup: { from: 'reviews', localField: "_id", foreignField: "tasker", as: "rate" } },
                        { $unwind: { path: "$rate", preserveNullAndEmptyArrays: true } },
                        { $match: { 'rate.type': 'user' } },
                        { $lookup: { from: 'task', localField: "_id", foreignField: "tasker", as: "task" } },
                        { $lookup: { from: 'task', localField: "rate.task", foreignField: "_id", as: "taskcategory" } },
                        { $unwind: { path: "$taskcategory", preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: 'categories', localField: "taskcategory.category", foreignField: "_id", as: "category" } },
                        // { $match : { 'rate.type' : 'user' } },
                        {
                          $project: {
                            rate: 1,
                            task: 1,
                            rating: 1,
                            taskcategory: 1,
                            taskercategory: 1,
                            category: 1,
                            total_review : 1,
                            tasker: {
                              $cond: { if: { $eq: ["$task.status", 6] }, then: "$task", else: "" }
                            },
                            username: 1,
                            email: 1,
                            role: 1,
                            working_days: 1,
                            location: 1,
                            tasker_status: 1,
                            address: 1,
                            name: 1,
                            avatar: 1,
                            working_area: 1,
                            birthdate: 1,
                            gender: 1,
                            phone: 1,
                            stripe_connect: 1,
                            taskerskills: 1,
                            profile_details: 1,
                            createdAt: 1
                          }
                        }, {
                          $project: {
                            name: 1,
                            rate: 1,
                            document: "$$ROOT"
                          }
                        },
                        {
                          $group: { "_id": "$_id", "count": { "$sum": 1 }, "induvidualrating": { "$sum": "$rate.rating" }, "documentData": { $push: "$document" } }
                        },
                        {
                          $group: {
                            "_id": "$_id", "induvidualrating": { $first: "$induvidualrating" }, "avg": { $sum: { $divide: ["$induvidualrating", "$count"] } }, "documentData": { $first: "$documentData" }
                          }
                        }];
                        db.GetAggregation('tasker', getQuery, function (err, docdata) {
                          if (err) {
                            res.send(err);
                          } else {
                            

                            db.GetDocument('tasker', { _id: provider_id }, {}, {}, function (err, taskerDetails) {
                              if (err) {
                                  res.send(err);
                              } else {

                            var avgreview = parseFloat(docdata[0].avg);

                            var totalreview = taskerDetails[0].total_review + 1;
                            db.UpdateDocument('tasker', { _id: provider_id }, { $set: { 'avg_review': avgreview, 'total_review': totalreview } }, { multi: true }, function (userUErr, userURespo) {
                              if (userUErr) {
                                res.send({
                                  'status': '0',
                                  'response': 'INVALID ERROR'
                                });
                              } else {
                                /*var provider_id = provider_id;
                                var message = 'User(' + req.body.ratings[0].rating + ') ratings has been submitted to ' + taskerDetails[0].username;
            
                                var options = {
                                  'job_id': req.body.job_id,
                                  'provider_id': provider_id
    
                                };
                                
                                push.sendPushnotification(provider_id, message, 'ratings', 'ANDROID', options, 'PROVIDER', function(err, Response, body) {});*/
                                var response = {};
                                response.msg = 'Your Rating Has Been Submitted';
                                response.image = settings.settings.site_url + 'uploads/images/users/' + data.img_name;
                                res.send({
                                  'status': '1',
                                  'response': response
                                });
                              }
                            });
                          }
                        });
                          }
                        });
                      }
                    });
                    // }
                  }
                });
              }
            });
          } else if (req.body.ratingsFor == 'tasker') {
            var updateData = { 'ratings': {} };
            updateData.ratings[req.body.ratingsFor] = job_dataArr;
            updateData.ratings['user_review_status'] = 'Yes';
            db.UpdateDocument('task', { booking_id: req.body.job_id }, { $set: updateData }, {}, function (bookUErr, bookURespo) {
              if (bookUErr) {
                res.send({
                  'status': '0',
                  'response': 'INVALID ERROR'
                });
              } else
                if (req.body.ratingsFor == 'tasker') {
                  db.GetDocument('users', { _id: user_id }, { 'avg_review': 1, 'total_review': 1 }, {}, function (userErr, userRespo) {
                    if (userRespo.length > 0) {
                      var userRateDivider = 1,
                        existUserAvgRat = 0,
                        existTotReview = 0,
                        userAvgRatings = '',
                        userTotalReviews = '';
                      if (userRespo[0].avg_review) {
                        existUserAvgRat = userRespo[0].avg_review;
                        userRateDivider++;
                      } else {
                        existUserAvgRat = 0;
                      }
                      if (userRespo[0].total_review) {
                        existTotReview = userRespo[0].total_review;
                      } else {
                        existTotReview = 0;
                      }
                      userAvgRatings = (existUserAvgRat) / userRateDivider;
                      userTotalReviews = existTotReview + 1;

                      db.UpdateDocument('users', { _id: user_id }, { $set: { 'avg_review': parseInt(userAvgRatings, 2), 'total_review': userTotalReviews } }, { multi: true }, function (userUErr, userURespo) {
                        if (userUErr) {
                          res.send({
                            'status': '0',
                            'response': 'INVALID ERROR'
                          });
                        } else {
                          if (imgstatus == 1) {
                            var orgimage = 'uploads/images/users/' + data.img_name;
                          } else {
                            orgimage = '';
                          }
                          var review_data = {
                            'type': "tasker",
                            'task': bookRespo[0]._id,
                            'user': user_id,
                            'tasker': provider_id,
                            'rating': req.body.ratings[0].rating,
                            'comments': data.comments,
                            'status': 1,
                            'image': orgimage,
                            'img_name': data.img_name,
                            'img_path': data.img_path
                          };
                          db.InsertDocument('review', review_data, function (err, response) {
                            if (err) {
                              res.send({ "status": "0", "message": "Username or Phone Number Already Registered" });
                            } else {
                              db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                if (err) {
                                  data.response = 'Invalid ' + CONFIG.TASKER + ', Please check your data';
                                  res.send(data);
                                } else {
                        
                                  /*var provider_id = provider_id;
                                  var message = 'Tasker(' + req.body.ratings[0].rating + ') ratings has been submitted to ' + userRespo[0].username;
              
                                  var options = {
                                    'job_id': req.body.job_id,
                                    'provider_id': provider_id
      
                                  };
                                  
                                  push.sendPushnotification(provider_id, message, 'ratings', 'ANDROID', options, 'PROVIDER', function(err, Response, body) {});*/

                                  var response = {};
                                  response.msg = 'Your Rating Has Been Submitted';
                                  response.image = settings.settings.site_url + '/uploads/images/users/' + data.img_name;
                                  res.send({
                                    'status': '1',
                                    'response': response
                                  });
                                }
                              });
                            }
                          });
                        }
                      })
                    }
                  });
                }
            });
          } else {
            res.send({
              "status": "0",
              "response": "Not a Valid Method"
            });
          }
        } else {
          res.send({
            "status": "0",
          });
        }
      }
    });
  }



  controller.notificationMode = function (req, res) {
    var data = {};
    data.status = '0';

    req.checkBody('user', res.__('Valid ' + CONFIG.USER + '_id is required')).notEmpty();
    req.checkBody('user_type', res.__('Valid user_type is required')).notEmpty();
    req.checkBody('mode', res.__('Valid mode is required')).notEmpty();
    req.checkBody('type', res.__('Invalid Device type')).optional();

    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data); return;
    }

    req.sanitizeBody('user').trim();
    req.sanitizeBody('user_type').trim();
    req.sanitizeBody('mode').trim();
    req.sanitizeBody('type').trim();

    var request = {};
    request.user_id = req.body.user;
    request.country_code = req.body.user_type;
    request.mode = req.body.mode;
    if (req.body.user_type == 'user') {
      if (req.body.type == 'android') {
        db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, user) {
          if (err || !user) {
            res.send({
              "status": "0",
              "message": res.__("Invalid user!")
            });
          } else {

            db.UpdateDocument('users', { '_id': request.user_id }, { 'device_info.android_notification_mode': request.mode }, {}, function (err, response) {
              if (err || response.nModified == 0) {
                res.send({
                  "status": "0",
                  "message": res.__("Invalid " + CONFIG.USER)
                });
              } else {
                res.send({
                  "status": "1",
                  "message": res.__("notification_mode updated")
                });
              }
            });
          }

        });
      } else {
        db.UpdateDocument('users', { '_id': request.user_id }, { 'device_info.ios_notification_mode': request.mode }, {}, function (err, response) {
          if (err || response.nModified == 0) {
            res.send({
              "status": "0",
              "message": "Invalid " + CONFIG.USER
            });
          } else {
            res.send({
              "status": "1",
              "message": res.__("notification_mode updated")
            });
          }
        });
      }
    } else if (req.body.user_type == 'tasker') {
      if (req.body.type == 'android') {
        db.GetOneDocument('tasker', { '_id': request.user_id }, {}, {}, function (err, user) {
          if (err || !user || user.length == 0) {
            res.send({
              "status": "0",
              "message": res.__("Invalid tasker!")
            });
          } else {
            db.UpdateDocument('tasker', { '_id': request.user_id }, { 'device_info.android_notification_mode': request.mode }, {}, function (err, response) {
              if (err || response.nModified == 0) {
                res.send({
                  "status": "0",
                  "message": res.__("Invalid tasker!")
                });
              } else {
                res.send({
                  "status": "1",
                  "message": res.__("notification_mode updated")
                });
              }
            });
          }
        });
      } else {
        db.GetOneDocument('tasker', { '_id': request.user_id }, {}, {}, function (err, user) {
          if (err || !user || user.length == 0) {
            res.send({
              "status": "0",
              "message": res.__("Invalid " + CONFIG.TASKER)
            });
          } else {
            db.UpdateDocument('tasker', { '_id': request.user_id }, { 'device_info.ios_notification_mode': request.mode }, {}, function (err, response) {
              if (err || response.nModified == 0) {
                res.send({
                  "status": "0",
                  "message": res.__("Invalid " + CONFIG.TASKER)
                });
              } else {
                res.send({
                  "status": "1",
                  "message": res.__("notification_mode updated")
                });
              }
            });
          }
        });
      }
    }
  };

  controller.facebookLogin = function (req, res) {

    var data = {};
    data.status = '0';

    req.checkBody('username', res.__('Valid username is required')).notEmpty();
    req.checkBody('email', res.__('Valid email is required')).notEmpty();
    req.checkBody('mode', res.__('Valid mode is required')).notEmpty();
    req.checkBody('type', res.__('Invalid Device type')).optional();

    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data); return;
    }

    req.sanitizeBody('username').trim();
    req.sanitizeBody('email').trim();

    req.sanitizeBody('mode').trim();
    req.sanitizeBody('type').trim();

    var request = {};
    request.username = req.body.username;
    request.email = req.body.email;
    request.mode = req.body.mode;

    passport.use('facebook-register', new LocalStrategy({
      usernameField: 'email',
      passwordField: 'pwd',
      passReqToCallback: true // allows us to pass back the entire request to the callback
    },
      function (req, email, pwd, done) {
        process.nextTick(function () {
          db.GetOneDocument('users', { 'username': req.body.username, 'email': email }, {}, {}, function (err, user) {
            if (err || !user) {
              res.send({
                "status": "0",
                "response": res.__("You are not valid " + CONFIG.USER)
              });
            } else {
              if (user) {
                return done('Email Id Or User name already exists', false, null);
              } else {
                var authHeader = generateToken();

                function generateToken() {
                  var token = jwt.sign({
                    id: req.body.user_name + ':' + req.body.pwd
                  }, 'token_with_username_and_password', {
                      expiresIn: 12000
                    });
                  return token;
                }
                var newUser = new User();
                newUser.unique_code = library.randomString(8, '#A');
                newUser.username = req.body.username;
                newUser.email = req.body.email;
                newUser.password = newUser.generateHash(req.body.pwd);
                newUser.role = req.body.role;
                newUser.status = 1;
                //newUser.address = req.body.location;
                newUser.location = req.body.location;
                newUser.phone = req.body.phone;
                if (req.body.type) {
                  newUser.type = req.body.type;
                }
                newUser.address = { 'city': req.body.location }
                newUser.name = { 'first_name': req.body.firstname, 'last_name': req.body.lastname };
                newUser.activity = { 'created': req.body.today, 'modified': req.body.today, 'last_login': req.body.today, 'last_logout': req.body.today };

                db.InsertDocument('users', newUser, function (err, user) {
                  if (err) {
                    // return done(null, false, req.flash('Error', 'That email or username is already taken.'));
                    res.send({
                      "status": "0",
                      "response": res.__("That email or username is already taken")
                    });
                  }
                  req.session.passport.header = authHeader;
                  var mailData = {};
                  mailData.template = 'Sighnupmessage';
                  mailData.to = user.email;
                  mailData.html = [];
                  mailData.html.push({ name: 'name', value: user.name.first_name || "" });
                  mailData.html.push({ name: 'email', value: user.email || "" });
                  mailData.html.push({ name: 'referal_code', value: user.unique_code || "" });
                  mailcontent.sendmail(mailData, function (err, response) { });
                  var data = {};
                  //return done(null, user);
                  if (req.body.referalcode) {
                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                      if (err || !settings) {
                        res.send({
                          "status": "0",
                          "response": res.__("Unable to get settings")
                        });
                      } else {
                        db.GetOneDocument('users', { 'unique_code': req.body.referalcode }, {}, {}, function (err, referer) {
                          if (err || !referer) {
                            res.send({
                              "status": "0",
                              "response": res.__("Unable to get referer")
                            });
                          } else {
                            db.GetOneDocument('walletReacharge', { 'user_id': referer._id }, {}, {}, function (err, referwallet) {
                              if (err) {
                                res.send({
                                  "status": "0",
                                  "response": res.__("Unable to get referwallet")
                                });
                              } else {
                                if (referwallet) {
                                  var walletArr = {
                                    'type': 'CREDIT',
                                    'credit_type': 'Referel',
                                    'trans_amount': settings.settings.referral.amount.referrer,
                                    'avail_amount': settings.settings.referral.amount.referrer,
                                    'trans_date': Date.now(),
                                    'trans_id': ''
                                  };
                                  db.UpdateDocument('walletReacharge', { 'user_id': referer._id }, { $push: { transactions: walletArr }, $set: { "total": parseInt(referwallet.total) + parseInt(settings.settings.referral.amount.referrer) } }, {}, function (referupErr, referupRespo) {
                                    if (referupErr || referupRespo.nModified == 0) {

                                      res.send({
                                        "status": "0",
                                        "response": res.__("Unable to get referwallet")
                                      });
                                    } else {
                                      return done(null, user);
                                    }
                                  });
                                } else {

                                  if (settings.settings.referral.amount.referrer) {
                                    var totalValue = settings.settings.referral.amount.referrer;
                                  } else {
                                    var totalValue = 0;
                                  }
                                  db.InsertDocument('walletReacharge', {
                                    'user_id': referer._id,
                                    "total": totalValue,
                                    'type': 'wallet',
                                    "transactions": [{
                                      'credit_type': 'Referel',
                                      'ref_id': '',
                                      'trans_amount': settings.settings.referral.amount.referrer,
                                      'trans_date': Date.now(),
                                      'trans_id': mongoose.Types.ObjectId()
                                    }]
                                  }, function (err, result) {
                                    db.UpdateDocument('users', { '_id': referer._id }, { 'wallet_id': result._id }, {}, function (err, userupdate) {
                                      if (err || userupdate.nModified == 0) {
                                        res.send({
                                          "status": "0",
                                          "response": res.__("Unable to get userupdate")
                                        });
                                      } else {
                                        return done(null, user);
                                      }
                                    });
                                    return done(null, user);
                                  });
                                }
                              }
                              db.InsertDocument('walletReacharge', {
                                'user_id': user._id,
                                "total": settings.settings.wallet.amount.welcome,
                                'type': 'wallet',
                                "transactions": [{
                                  'credit_type': 'welcome',
                                  'ref_id': '',
                                  'trans_amount': settings.settings.wallet.amount.welcome,
                                  'trans_date': Date.now(),
                                  'trans_id': mongoose.Types.ObjectId()
                                }]
                              }, function (err, result) {
                                db.UpdateDocument('users', { '_id': user._id }, { 'wallet_id': result._id }, {}, function (err, userupdate) {
                                  if (err || userupdate.nModified == 0) {
                                    res.send({
                                      "status": "0",
                                      "response": res.__("Unable to get userupdate")
                                    });
                                  } else {
                                    return done(null, user);
                                  }
                                });
                                return done(null, user);
                              });
                            });
                          }
                        });
                      }
                    });
                  }
                  return done(null, user);
                });
              }
            }
          });
        });
      }));
  }

  controller.getmessage = function (req, res) {
    var data = {};
    data.status = '0';

    req.checkBody('userId', res.__('Valid ' + CONFIG.USER + ' Id is required')).notEmpty();
    req.checkBody('type', res.__('Valid type is required')).notEmpty();
    var errors = req.validationErrors();
    if (errors) { data.response = errors[0].msg; res.send(data); return; }
    req.sanitizeBody('userId').trim();
    var user = req.body.userId;
    var type = req.body.type;
    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, responses) {
      if (err) {
        data.response = res.__('You have not received Messages yet');
        res.send(data);
      } else {
        if (type == 1) {
          db.GetOneDocument('users', { '_id': user }, {}, {}, function (err, usermailrefer) {
            if (err || !usermailrefer) {
              data.response = res.__('Invalid ' + CONFIG.USER + ' id');
              res.send(data);
            }
            else {
              db.GetAggregation('messages', [
                { $match: { user: new mongoose.Types.ObjectId(user) } },
                { $lookup: { from: 'task', localField: "task", foreignField: "_id", as: "task" } },
                { $lookup: { from: 'tasker', localField: "tasker", foreignField: "_id", as: "tasker" } },
                { $unwind: "$task" },
                { $unwind: "$tasker" },
                { $lookup: { from: 'categories', localField: "task.category", foreignField: "_id", as: "categorys" } },
                { $unwind: "$categorys" },
                { $sort: { createdAt: -1 } },
                {
                  $project: {
                    task_id: '$task._id',
                    booking_id: '$task.booking_id',
                    tasker_name: '$tasker.username',
                    firstname: '$tasker.name.first_name',
                    tasker_image: '$tasker.avatar',
                    tasker_id: '$tasker._id',
                    categorys: '$categorys.name',
                    createdAt: 1,
                    tasker_status: 1,
                    user_status: 1,
                    from: 1
                  }
                },
                {
                  $group: {
                    '_id': "$task_id", 'from': { "$first": "$from" }, 'tasker_image': { "$first": "$tasker_image" }, 'booking_id': { "$first": "$booking_id" }, 'task_id': { "$first": "$task_id" }, 'tasker_name': { "$first": "$tasker_name" }, 'tasker_id': { "$last": "$tasker_id" },
                    'categorys': { "$first": "$categorys" }, 'createdAt': { "$first": "$createdAt" }, 'tasker_status': { "$first": "$tasker_status" }, 'user_status': { "$first": "$user_status" }, 'firstname': { "$last": "$firstname" }
                  }
                },
                { $sort: { createdAt: -1 } },
              ], function (err, messages) {
                if (err || messages.length == 0) {
                  data.response = res.__('You have not received Messages yet');
                  res.send(data);
                } else {
                  data.status = 1;
                  data.response = {};
                  data.response.message = [];
                  for (var i = 0; i < messages.length; i++) {
                    var message = {};
                    message.task_id = messages[i]._id;
                    message.booking_id = messages[i].booking_id;
                    message.category = messages[i].categorys;
                    //message.tasker_name = messages[i].tasker_name;
                    message.tasker_name = messages[i].tasker_name;
                    message.tasker_id = messages[i].tasker_id;
                    message.created = timezone.tz(messages[i].createdAt, responses.settings.time_zone).format(responses.settings.date_format + ',' + responses.settings.time_format);
                    message.tasker_status = messages[i].tasker_status;
                    message.user_status = messages[i].user_status;
                    message.last_message_from = messages[i].from;
                    if (messages[i].tasker_image) {
                      message.tasker_image = responses.settings.site_url + messages[i].tasker_image;
                    }
                    else {
                      message.tasker_image = responses.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                    }


                    data.response.message.push(message);
                  }
                  res.send(data);
                }
              });
            }
          });
        }
        else {
          db.GetOneDocument('tasker', { '_id': user }, {}, {}, function (err, usermailrefer) {
            if (err || !usermailrefer) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ' id');
              res.send(data);
            }
            else {
              db.GetAggregation('messages', [
                { $match: { tasker: new mongoose.Types.ObjectId(user) } },
                { $lookup: { from: 'task', localField: "task", foreignField: "_id", as: "task" } },
                { $lookup: { from: 'users', localField: "user", foreignField: "_id", as: "user" } },
                { $unwind: "$task" },
                { $unwind: "$user" },
                { $lookup: { from: 'categories', localField: "task.category", foreignField: "_id", as: "categorys" } },
                { $unwind: "$categorys" },
                { $sort: { createdAt: -1 } },
                {
                  $project: {
                    task_id: '$task._id',
                    booking_id: '$task.booking_id',
                    user_name: '$user.username',
                    firstname: '$user.name.first_name',
                    user_image: '$user.avatar',
                    user_id: '$user._id',
                    categorys: '$categorys.name',
                    createdAt: 1,
                    tasker_status: 1,
                    user_status: 1,
                    from: 1
                  }
                },

                {
                  $group: {
                    '_id': "$task_id", 'from': { "$first": "$from" }, 'user_image': { "$first": "$user_image" }, 'booking_id': { "$first": "$booking_id" }, 'task_id': { "$first": "$task_id" }, 'user_name': { "$first": "$user_name" }, 'user_id': { "$first": "$user_id" }
                    , 'categorys': { "$first": "$categorys" }, 'createdAt': { "$first": "$createdAt" }, 'tasker_status': { "$first": "$tasker_status" }, 'user_status': { "$first": "$user_status" }, 'firstname': { "$first": "$firstname" }
                  }
                },
                { $sort: { createdAt: -1 } },
              ], function (err, messages) {
                if (err || messages.length == 0) {
                  data.response = res.__('You have not received Messages yet');
                  res.send(data);
                } else {
                  data.status = 1;
                  data.response = {};
                  data.response.message = [];
                  for (var i = 0; i < messages.length; i++) {
                    var message = {};
                    message.task_id = messages[i]._id;
                    message.user_name = messages[i].user_name;
                    message.user_id = messages[i].user_id;
                    message.created = timezone.tz(messages[i].createdAt, responses.settings.time_zone).format(responses.settings.date_format + ',' + responses.settings.time_format);
                    if (messages[i].user_image) {
                      message.user_image = responses.settings.site_url + messages[i].user_image;
                    }
                    else {
                      message.user_image = responses.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                    }
                    message.booking_id = messages[i].booking_id;
                    message.category = messages[i].categorys;
                    message.tasker_status = messages[i].tasker_status;
                    message.user_status = messages[i].user_status;
                    message.last_message_from = messages[i].from;
                    data.response.message.push(message);
                  }
                  res.send(data);
                }
              });
            }
          });
        }
      }
    });
  }


  controller.userTransaction = function (req, res) {

    req.checkBody('user_id', res.__('Invalid ' + CONFIG.USER)).notEmpty();
    req.checkBody('orderby', res.__('Enter valid order')).optional();
    req.checkBody('sortby', res.__('Enter valid option')).optional();
    req.checkBody('from', res.__('Enter valid from date')).optional(); //yyyy-mm-dd hh:mm:ss
    req.checkBody('to', res.__('Enter valid to date')).optional(); //yyyy-mm-dd hh:mm:ss

    var data = {};
    data.status = '0';

    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data);
      return;
    }
    var request = {};
    request.tasker_id = req.body.user_id;
    request.page = parseInt(req.body.page) || 1;
    request.perPage = parseInt(req.body.perPage) || 20;
    request.orderby = parseInt(req.body.orderby) || -1;
    request.sortby = req.body.sortby || 'createdAt';
    request.from = req.body.from + ' 00:00:00';
    request.to = req.body.to + ' 23:59:59';
    if (request.sortby == 'name') {
      request.sortby = 'user.username'
    } else if (request.sortby == 'date') {
      request.sortby = 'createdAt'
    }
    var sorting = {};
    sorting[request.sortby] = request.orderby;
    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
      if (err) {
        data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
        res.send(data);
      } else {
        db.GetOneDocument('users', { '_id': request.tasker_id }, {}, {}, function (err, tasker) {
          if (err || !tasker) {
            data.response = 'Invalid ' + CONFIG.USER + ', Please check your data';
            res.send(data);
          } else {
            db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
              if (err || !currencies) {
                res.send({
                  "status": 0,
                  "message": res.__('Error')
                });
              }
              else {
                var query = {
                  'user': new mongoose.Types.ObjectId(request.tasker_id), 'status': { "$eq": 7 }
                };
                if (req.body.from && req.body.to) {
                  query = {
                    'user': new mongoose.Types.ObjectId(request.tasker_id),
                    'status': {
                      "$eq": 7
                    },
                    "createdAt": {
                      '$gte': new Date(request.from),
                      '$lte': new Date(request.to)
                    }
                  };

                }
                data.status = '1';
                data.response = {};
                data.response.current_page = 0;
                data.response.next_page = request.page + 1;
                data.response.perPage = 0;
                data.response.total_jobs = 0;
                data.response.jobs = [];
                db.GetCount('task', query, function (err, count) {
                  if (err || count == 0) {
                    res.send(data);
                  } else {
                    data.response.total_jobs = count;
                    db.GetAggregation('task', [{ $match: query },
                    { "$lookup": { from: "tasker", localField: "tasker", foreignField: "_id", as: "user" } },
                    { "$lookup": { from: "categories", localField: "category", foreignField: "_id", as: "category" } },
                    { "$sort": sorting },
                    { $unwind: "$user" },
                    { $unwind: "$category" },
                    { "$skip": (request.perPage * (request.page - 1)) },
                    { "$limit": request.perPage }
                    ], function (err, bookings) {
                      if (err || bookings.length == 0) {
                        res.send(data);
                      } else {

                        for (var i = 0; i < bookings.length; i++) {
                          var job = {};
                          job.job_id = bookings[i].booking_id;
                          job.category_name = bookings[i].category.name || '';
                          job.total_amount = (bookings[i].invoice.amount.grand_total * currencies.value).toFixed(2) || '';
                          job.currencycode = currencies.code;
                          // job.booking_date = timezone.tz(bookings[i].history.job_closed_time, settings.settings.time_zone).format(settings.settings.date_format);
                          job.exactaddress = bookings[i].task_address.exactaddress;
                          job.job_date = timezone.tz(bookings[i].history.job_closed_time, settings.settings.time_zone).format(settings.settings.date_format);
                          job.job_time = timezone.tz(bookings[i].history.job_closed_time, settings.settings.time_zone).format(settings.settings.time_format);

                          data.response.jobs.push(job);
                        }
                        res.send(data);
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


  controller.userjobTransaction = function (req, res) {

    req.checkBody('user_id', res.__('Invalid ' + CONFIG.USER)).notEmpty();
    req.checkBody('booking_id', res.__('Invalid booking_id')).notEmpty();
    var data = {};
    data.status = '0';
    var errors = req.validationErrors();
    if (errors) {
      data.response = errors[0].msg;
      res.send(data);
      return;
    }
    var request = {};
    request.tasker_id = req.body.user_id;
    request.booking_id = req.body.booking_id;
    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
      if (err) {
        data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
        res.send(data);
      } else {
        db.GetOneDocument('users', { '_id': request.tasker_id }, {}, {}, function (err, tasker) {
          if (err || !tasker) {
            data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
            res.send(data);
          } else {
            db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
              if (err || !currencies) {
                res.send({
                  "status": 0,
                  "message": res.__('Error')
                });
              }
              else {
                var query = {
                  'user': new mongoose.Types.ObjectId(request.tasker_id), 'status': { "$eq": 7 }, 'booking_id': request.booking_id
                };
                if (req.body.from && req.body.to) {
                  query = {
                    'user': new mongoose.Types.ObjectId(request.tasker_id),
                    'status': { "$eq": 7 },
                    'booking_id': request.booking_id,
                    "createdAt": {
                      '$gte': new Date(request.from),
                      '$lte': new Date(request.to)
                    }
                  };
                }
                data.status = '1';
                data.response = {};
                data.response.jobs = [];
                db.GetCount('task', query, function (err, count) {
                  if (err || count == 0) {
                    data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
                    res.send(data);
                  } else {
                    db.GetAggregation('task', [{ $match: query },
                    { "$lookup": { from: "tasker", localField: "tasker", foreignField: "_id", as: "user" } },
                    { "$lookup": { from: "categories", localField: "category", foreignField: "_id", as: "category" } },
                    { $unwind: "$user" },
                    { $unwind: "$category" }
                    ], function (err, bookings) {
                      if (err || bookings.length == 0) {
                        data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
                        res.send(data);
                      } else {
                        for (var i = 0; i < bookings.length; i++) {
                          var job = {};
                          job.job_id = bookings[i].booking_id;
                          job.category_name = bookings[i].category.name || '';
                          job.ratetype = bookings[i].category.ratetype || '';
                          job.ratetypestatus = bookings[i].category.ratetype == "Flat" ? 1 : 2;
                          job.total_amount = (bookings[i].invoice.amount.grand_total * currencies.value).toFixed(2) || '';
                          if (bookings[i].user) {
                            if (bookings[i].user.username) {
                              job.user_name = bookings[i].user.username;
                            } else {
                              job.user_name = "";
                            }
                          }
                          job.location = bookings[i].location || '';
                          job.currencycode = currencies.code;
                          job.location_lat = bookings[i].location.lat || '';
                          job.location_lng = bookings[i].location.log || '';
                          job.exactaddress = bookings[i].task_address.exactaddress || '';
                          job.service_address = bookings[i].service_address || '';
                          if (bookings[i].payment_type) {
                            job.payment_mode = bookings[i].payment_type;
                          }
                          else {
                            job.payment_mode = '';
                          }
                          job.total_hrs = bookings[i].invoice.worked_hours_human || '';
                          job.per_hour = (bookings[i].hourly_rate * currencies.value).toFixed(2) || '';
                          job.min_hrly_rate = (bookings[i].invoice.amount.minimum_cost * currencies.value).toFixed(2) || '';
                          job.task_amount = (bookings[i].invoice.amount.total * currencies.value).toFixed(2) || '';
                          job.service_tax = (bookings[i].invoice.amount.service_tax * currencies.value).toFixed(2) || '';
                          if (bookings[i].createdAt) {
                            job.booking_time = timezone.tz(bookings[i].booking_information.booking_date, settings.settings.time_zone).format(settings.settings.date_format + ',' + settings.settings.time_format);
                          } else {
                            job.booking_time = '';
                          }
                          if (bookings[i].invoice.amount.extra_amount) {
                            job.material_fee = bookings[i].invoice.amount.extra_amount.toFixed(2);
                          } else {
                            job.material_fee = '';
                          }
                          if (bookings[i].invoice.amount.discount) {
                            job.coupon_amount = bookings[i].invoice.amount.discount.toFixed(2);
                          } else {
                            job.coupon_amount = '';
                          }
                          data.response.jobs.push(job);
                        }
                        res.send(data);
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

  controller.userDetails = function (req, res) {

    var data = {};
    data.status = 0;

    req.checkBody('userId', res.__('Valid ' + CONFIG.USER + 'Id is required')).notEmpty();

    var errors = req.validationErrors();
    if (errors) { data.response = errors[0].msg; res.send(data); return; }
    req.sanitizeBody('userId').trim();
    var user = req.body.userId;


    db.GetOneDocument('users', { '_id': user }, {}, {}, function (err, user) {
      if (err || !user) {
        data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
        res.send(data);
      } else {
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
          if (err) {
            data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
            res.send(data);
          }
          else {
            var avata = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
            if (user.avatar) {
              avata = settings.settings.site_url + user.avatar;
            }
            res.send({
              'status': 1,
              'user_name': user.username,
              'code': user.phone.code,
              'number': user.phone.number,
              'email': user.email,
              'image': avata
            });
          }
        });
      }
    });
  };

  return controller;
}
