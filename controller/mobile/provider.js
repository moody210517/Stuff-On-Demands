module.exports = function(io, i18n) {

    var htmlToText = require('html-to-text');
    var bcrypt = require('bcrypt-nodejs');
    var async = require("async");
    var CONFIG = require('../../config/config');
    var library = require('../../model/library.js');
    var twilio = require('../../model/twilio.js');
    var db = require('../../model/mongodb.js');
    var mongoose = require("mongoose");
    var moment = require("moment");
    var fs = require("fs");
    var attachment = require('../../model/attachments.js');
    var Jimp = require("jimp");
    var push = require('../../model/pushNotification.js')(io);
    var mail = require('../../model/mail.js');
    var mailcontent = require('../../model/mailcontent.js');
    var timezone = require('moment-timezone');
    var GoogleAPI = require('../../model/googleapis.js');
    var util = require('util');
    var taskLibrary = require('../../model/task.js')(io);
    var pdf = require('html-pdf');

    var controller = {};

    controller.checkTasker = function (req, res) {
      console.log("req.bod==========", req.body);
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

      db.GetDocument('tasker', { 'phone.code': request.country_code, 'phone.number': request.phone_number }, {}, {}, function (err, tasker) {
        if (err) {
          res.send(err);
        } else {
            if (tasker.length > 0) { //existing tasker
              db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
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
                    if (settings.settings.twilio.mode == 'production') {
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
                      status: 1
                    });
                }
              });
            } else { // new tasker
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
                      date_format: settings[0].settings.date_format,
                      radius: settings[0].settings.tasker_radius
                    });
                  }
              });
            }
          }
      });
    };

    controller.login = function(req, res) {
      console.log("req.body", req.body);
      var data = {};
      data.status = '0';

      req.checkBody('phone_number', res.__('Phone number is Required')).notEmpty();
      req.checkBody('deviceToken', res.__('Invalid Device Token')).optional();
      req.checkBody('gcm_id', res.__('Invalid Device Token')).optional();
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }

      req.sanitizeBody('phone_number').trim();
      req.sanitizeBody('gcm_id').trim();

      var request = {};
      request.phone = req.body.phone_number;
      request.deviceToken = req.body.deviceToken;
      request.gcm = req.body.gcm_id;
      db.GetDocument('tasker', { 'phone.number': request.phone }, {}, {}, function(err, tasker) {
        if (err) {
          data.response = res.__("Sorry you are not a valid " + CONFIG.TASKER);
          res.send(data);
        } else {
          if (tasker[0].status == 1 || tasker[0].status == 2 || tasker[0].status == 3) {
            db.UpdateDocument('tasker', {'phone.number': request.phone }, { 'activity.last_login': new Date() }, {}, function(err, response) {
              if (err || response.nModified == 0) {
                res.send({
                  "status": 0,
                  "message": res.__('Please check the Credential and try again')
                });
              } else {
                db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function(err, currencies) {
                  if (err) {
                  res.send(err);
                  } else {
                    if (request.deviceToken) {
                      db.UpdateDocument('tasker', { 'phone.number': request.phone }, {
                      'device_info.device_type': 'ios',
                      'device_info.device_token': request.deviceToken,
                      'activity.last_login': new Date()
                      }, {}, function(err, response) {
                        if (err || response.nModified == 0) {
                          res.send({
                          "status": 0,
                          "message": res.__('Please check the Credential and try again')
                          });
                        } else {
                          data.status = tasker[0].status;
                          data.response = {};
                          data.response.provider_id = tasker[0]._id;

                          if (tasker[0].avatar) {
                            data.response.provider_image = GLOBAL_CONFIG.site_url + tasker[0].avatar;
                          } else {
                            data.response.provider_image = GLOBAL_CONFIG.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                          }

                          data.response.provider_name = tasker[0].username;
                          data.response.firstname = tasker[0].firstname;
                          data.response.lastname = tasker[0].lastname;
                          data.response.email = tasker[0].email;
                          data.response.currency = currencies.code;
                          data.verified_status = 3;
                          data.response.message = res.__('You are Logged In successfully');
                          res.send(data);
                        }
                      });
                    } else {
                      db.UpdateDocument('tasker', {'phone.number': request.phone }, {
                      'device_info.device_type': 'android',
                      'device_info.gcm': request.gcm,
                      'activity.last_login': new Date()
                      }, {}, function(err, response) {
                        if (err || response.nModified == 0) {
                          res.send({
                          "status": 0,
                          "message": res.__('Please check the Credential and try again')
                          });
                        } else {
                          data.status = '1';
                          data.response = {};
                          data.response.provider_id = tasker[0]._id;

                          if (tasker[0].avatar) {
                            data.response.provider_image = GLOBAL_CONFIG.site_url + tasker[0].avatar;
                          } else {
                            data.response.provider_image = GLOBAL_CONFIG.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                          }

                          data.response.provider_name = tasker[0].username;
                          data.response.firstname = tasker[0].firstname;
                          data.response.lastname = tasker[0].lastname;
                          data.response.email = tasker[0].email;
                          data.response.currency = currencies.code;
                          data.verified_status = 3;
                          data.response.message = res.__('You are Logged In successfully');
                          res.send(data);
                        }
                      });
                    }
                  }
                });
              }
            });
          }
        }
      });
    };



    controller.logout = function(req, res) {

      var data = {};
      data.status = 0;

      req.checkBody('provider_id', res.__(CONFIG.TASKER + '_id ID is Required')).notEmpty();
      req.checkBody('device_type', res.__('device_type  is Required')).notEmpty();
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }

      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('device_type').trim();

      var request = {};
      request.provider_id = req.body.provider_id;
      request.device = req.body.device_type;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, user) {
        if (err || !user) {
          data.response = res.__('Invalid ' + CONFIG.TASKER);
          res.send(data);
        } else {
          if (request.device == 'android') {
            db.UpdateDocument('tasker', {
              '_id': request.provider_id,
              'device_info.device_type': request.device
            }, {
              'device_info.gcm': '',
              'activity.last_logout': new Date()
            }, {}, function(err, response) {
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

            db.UpdateDocument('tasker', {
              '_id': request.provider_id,
              'device_info.device_type': request.device
            }, {
              'device_info.device_token': '',
              'activity.last_logout': new Date()
            }, {}, function(err, response) {
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

    controller.newJob = function(req, res) {


      // taskLibrary.taskExpired({}, function (err, response) {


      //validation
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('page', res.__('Enter Page Info')).optional();
      req.checkBody('perPage', res.__('Enter Perpage Info')).optional();
      req.checkBody('orderby', res.__('Enter valid order')).optional();
      req.checkBody('sortby', res.__('Enter valid option')).optional();
      req.checkBody('from', res.__('Enter valid from date')).optional(); //yyyy-mm-dd hh:mm:ss
      req.checkBody('to', res.__('Enter valid to date')).optional();
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
      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('perPage').trim();
      req.sanitizeBody('page').trim();
      req.sanitizeBody('orderby').trim();
      req.sanitizeBody('sortby').trim();
      req.sanitizeBody('from').trim();
      req.sanitizeBody('to').trim();

      var request = {};
      request.orderby = parseInt(req.body.orderby) || -1;
      request.sortby = req.body.sortby || 'booking_information.booking_date';
      data.from = req.body.from + ' 00:00:00';
      data.to = req.body.to + ' 23:59:59';
      if (request.sortby == 'name') {
        request.sortby = 'user.username'
      } else if (request.sortby == 'date') {
        request.sortby = 'booking_information.booking_date'
      }

      var sorting = {};
      sorting[request.sortby] = request.orderby;
      request.provider_id = req.body.provider_id;
      request.page = parseInt(req.body.page) || 1;
      request.perPage = parseInt(req.body.perPage) || 20;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          data.status = '1';
          data.response = {};
          data.response.current_page = 0;
          data.response.next_page = request.page + 1;
          data.response.perPage = 0;
          data.response.total_jobs = 0;
          data.response.jobs = [];
          var query = {
            'tasker': new mongoose.Types.ObjectId(req.body.provider_id),
            'status': 1
          };
          db.GetCount('task', query, function(err, count) {
            if (err || count == 0) {
              res.send(data);
            } else {
              var extension = {};
              extension.options = {
                limit: parseInt(request.perPage),
                skip: request.perPage * (request.page - 1)
              };
              extension.populate = 'user';
              extension.sort = sorting;
              if (req.body.from && req.body.to) {
                query = {
                  'tasker': new mongoose.Types.ObjectId(req.body.provider_id),
                  'status': 1,
                  "booking_information.booking_date": {
                    '$gte': new Date(data.from),
                    '$lte': new Date(data.to)
                  }
                };
              }
              db.GetDocument('task', query, {}, extension, function(err, bookings) {
                if (err || bookings.length == 0) {
                  res.send(data);
                } else {
                  db.GetOneDocument('settings', {
                    'alias': 'general'
                  }, {}, {}, function(err, settings) {
                    if (err) {
                      res.send(data);
                    } else {
                      for (var i = 0; i < bookings.length; i++) {
                        var job = {};

                        if (bookings[i].user) {
                          job.user_name = bookings[i].user.username;
                          job.firstname = bookings[i].user.firstname;
                          job.lastname = bookings[i].user.lastname;
                        } else {
                          job.user_name = "";
                        }
                        if (bookings[i].user) {
                          if (bookings[i].user.avatar) {
                            job.user_image = GLOBAL_CONFIG.site_url + bookings[i].user.avatar;
                          } else {
                            job.user_image = GLOBAL_CONFIG.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                          }
                        } else {
                          job.user_image = GLOBAL_CONFIG.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                        }
                        job.job_id = bookings[i].booking_id;
                        //job.job_status = bookings[i].status || '';
                        job.job_status = 'New';
                        job.btn_group = 1;
                        job.category_name = bookings[i].booking_information.service_type || '';
                        job.location = bookings[i].booking_information.location || '';
                        job.exactaddress = bookings[i].task_address.exactaddress || '';
                        job.service_address = bookings[i].service_address || '';

                        job.location_lat = bookings[i].task_address.lat || '';
                        job.location_lng = bookings[i].task_address.lng || '';

                        var a = moment(bookings[i].booking_information.booking_date);
                        var b = moment(new Date());
                        job.job_time = library.timeDifference(a, b);
                        job.booking_time = timezone.tz(bookings[i].booking_information.booking_date, settings.settings.time_zone).format(settings.settings.date_format + ',' + settings.settings.time_format) || '';
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

      // });
    }

    controller.rejectJobs = function(req, res) {
      //validation
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('page', res.__('Enter Page Info')).optional();
      req.checkBody('perPage', res.__('Enter Perpage Info')).optional();
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
      request.provider_id = req.body.provider_id;
      request.page = parseInt(req.body.page) || 1;
      request.perPage = parseInt(req.body.perPage) || 20;

      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          db.GetOneDocument('tasker', {
            '_id': request.provider_id
          }, {}, {}, function(err, provider) {
            if (err || !provider) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
              res.send(data);
            } else {
              data.status = '1';
              data.response = {};
              data.response.current_page = 0;
              data.response.next_page = request.page + 1;
              data.response.perPage = 0;
              data.response.total_jobs = 0;
              data.response.jobs = [];

              var query = {
                'tasker': new mongoose.Types.ObjectId(req.body.provider_id),
                'status': 1
              };
              db.GetCount('task', query, function(err, count) {
                if (err || count == 0) {
                  res.send(data);
                } else {
                  var extension = {};
                  extension.options = {
                    limit: parseInt(request.perPage),
                    skip: request.perPage * (request.page - 1)
                  };
                  extension.populate = 'user';
                  db.GetDocument('task', query, {}, extension, function(err, bookings) {
                    if (err || bookings.length == 0) {
                      res.send(data);
                    } else {
                      for (var i = 0; i < bookings.length; i++) {
                        var job = {};
                        if (bookings[i].user) {
                          job.user_name = bookings[i].user.username;
                        } else {
                          job.user_name = "";
                        }

                        if (bookings[i].user) {
                          if (bookings[i].user.avatar) {
                            job.user_image = settings.settings.site_url + bookings[i].user.avatar;
                          } else {
                            job.user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                          }
                        } else {
                          job.user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                        }


                        job.job_id = bookings[i].booking_id;
                        //job.job_status = bookings[i].status || '';
                        job.job_status = 'Booked';
                        job.category_name = bookings[i].booking_information.service_type || '';
                        job.location = bookings[i].booking_information.location || '';

                        var a = moment(bookings[i].booking_information.booking_date);
                        var b = moment(new Date());
                        job.job_time = library.timeDifference(a, b);
                        //job.booking_time = moment(new Date(bookings[i].booking_information.booking_date)).format('MMMM D, YYYY, h:mm a') || '';
                        job.booking_time = timezone.tz(bookings[i].booking_information.booking_date, settings.settings.time_zone).format(settings.settings.date_format + ',' + settings.settings.time_format) || '';
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

    controller.updateAvailability = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('availability', res.__('Please Select Your Availability')).notEmpty();
      var data = {};
      data.status = 0;
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      var request = {};
      request.provider_id = req.body.provider_id;
      request.availability = req.body.availability.toLowerCase();

      db.UpdateDocument('users', {
        '_id': request.provider_id,
        'role': 'tasker'
      }, {
        'availability': request.availability
      }, {}, function(err, response) {
        if (err || response.nModified == 0) {
          data.response = res.__('Invalid ' + CONFIG.TASKER);
          res.send(data);
        } else {
          data.status = 1;
          data.response = res.__('Availability Updated');
          res.send(data);
        }
      });
    };

    controller.getBankingInfo = function(req, res) {

      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      req.sanitizeBody('provider_id').trim();
      var request = {};
      request.provider_id = req.body.provider_id;
      var banking = {};
      banking.acc_holder_name = '';
      banking.acc_number = '';
      banking.bank_name = '';
      banking.routing_number = '';

      db.GetOneDocument('tasker', {
        '_id': request.provider_id,
        'status': {
          $ne: 0
        }
      }, {}, {}, function(err, bookings) {
        if (err || !bookings) {
          data.response = res.__('Invalid ' + CONFIG.TASKER);
          res.send(data);
        } else {
          data.status = '1';
          if (bookings.banking) {
            data.response = {
              'banking': bookings.banking
            };
          } else {
            data.response = {
              'banking': banking
            };
          }
          res.send(data);
        }
      });
    };

    controller.savebankingInfo = function(req, res) {

      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('acc_holder_name', res.__('Invalid Account Name')).notEmpty();
      req.checkBody('acc_number', res.__('Invalid Account Number')).notEmpty();
      req.checkBody('bank_name', res.__('Invalid Bank Name')).notEmpty();
      req.checkBody('routing_number', res.__('Invalid Routing Number')).optional();
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

      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('acc_holder_name').trim();
      req.sanitizeBody('acc_number').trim();
      req.sanitizeBody('bank_name').trim();
      req.sanitizeBody('routing_number').trim();


      var request = {};
      request.provider_id = req.body.provider_id;
      request.banking = {};
      request.banking.acc_holder_name = req.body.acc_holder_name;
      request.banking.acc_number = req.body.acc_number;
      request.banking.bank_name = req.body.bank_name;
      request.banking.routing_number = req.body.routing_number;

      db.UpdateDocument('tasker', {
        '_id': request.provider_id
      }, {
        'banking': request.banking
      }, {}, function(err, response) {
        if (err || response.nModified == 0) {
          data.response = res.__('Invalid ' + CONFIG.TASKER);
          res.send(data);
        } else {
          data.status = '1';
          data.response = {
            'message': res.__('Your bank details added Successfully'),
            'banking': request.banking
          };
          res.send(data);
        }
      });
    }

    controller.updateProviderModeo = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('mode', res.__('Please Enter the mode')).optional();
      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('mode').trim();

      var request = {};
      request.provider_id = req.body.provider_id;
      request.type = req.body.mode;
      if (!request.type) {
        request.type = 'Available';
      }

      db.UpdateDocument('tasker', {
        '_id': request.provider_id,
        'role': 'tasker'
      }, {
        'mode': request.type
      }, {}, function(err, response) {
        if (err || response.nModified == 0) {
          data.response = res.__('Invalid ' + CONFIG.TASKER);
          res.send(data);
        } else {
          data.status = '1';
          data.response = res.__('Mode Updated');
          res.send(data);
        }
      });
    };

    controller.providerHomeInfo = function(req, res) {
      console.log("req.body", req.body);
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('task_date', res.__('Invalid Task Date')).notEmpty();

      var data = {};
      data.status = '0';

      var errors = req.validationErrors();
      if (errors) {
      data.response = errors[0].msg;
      res.send(data);
      return;
      }
      req.sanitizeBody('provider_id').trim();

      var extension = {};
      extension.populate = 'taskerskills.categoryid';

      db.GetOneDocument('tasker', { '_id': req.body.provider_id }, {}, extension, function(err, providers) {
        if (err) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function(err, settings) {
            if (err) {
              data.response = res.__('Unable to fetch settings data');
              res.send(data);
            } else {
              db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function(err, currencies) {
                if (err || !currencies) {
                  data.response = res.__('Unable to fetch currencies data');
                  res.send(data);
                } else {
                  data.status = providers.status;
                  data.response = {};

                  var category = providers.taskerskills.map(function(item) {
                    if (item.categoryid) {
                      var catdet = {};
                      catdet._id = item.categoryid._id;
                      catdet.name = item.categoryid.name;
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
                  }

                  if (providers.total_review && providers.avg_review) {
                    data.response.avg_review = providers.avg_review.toString();
                  } else {
                    data.response.avg_review = '0';
                  }

                  if (providers.avatar) {
                    data.response.image = settings.settings.site_url + providers.avatar;
                  } else {
                    data.response.image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                  }

                  data.response.username = providers.username;

                  data.response.Working_location = providers.availability_address;

                  if (providers.radius) {
                    data.response.radius = providers.radius;
                  } else {
                    data.response.radius = '0';
                  }

                  data.response.distanceby = settings.settings.distanceby;
                  data.response.category_Details = catdet;
                  data.response.currency = {};
                  data.response.currency.symbol = currencies.symbol;
                  data.response.currency.code = currencies.code;
                  data.response.taskdetails = {};
                  data.response.newleads = '0';

                  var query = {
                    'tasker': new mongoose.Types.ObjectId(req.body.provider_id),
                    'status': 1,
                    //'task_date': req.body.task_date
                  };

                  db.GetCount('task', query, function(err, newleads) {
				  console.log("newleads", newleads);
                    if (err) {
                      data.response = res.__('Unable to fetch newleads count');
                      res.send(data);
                    } else {
                      data.response.newleads = newleads;
                    }
                  });

                  var query = {
                    'tasker': new mongoose.Types.ObjectId(req.body.provider_id),
                    'status': {
                      $ne: 10
                    },
                    'task_date': req.body.task_date
                  };

                  db.GetCount('task', query, function(err, count) {
				  console.log("count", count);
                    if (err) {
                      data.response = res.__('Unable to fetch task count');
                      res.send(data);
                    } else if(count == 0) {
                      res.send(data);
                    } else {
                      var pipeline = [{
                        $match: {
                        'tasker': new mongoose.Types.ObjectId(req.body.provider_id),
                        'task_date': req.body.task_date,
                        'status': 7
                        }
                        },
                        {
                        $group: {
                        _id: '$tasker',
                        'last_task_start': { "$last": "$history.job_started_time" },
                        'last_task_end': { "$last": "$history.job_completed_time" },
                        'last_task_earning': { "$last": "$invoice.amount.tasker_earning" },
                        'total_workedhours': {
                        $sum: '$invoice.worked_hours'
                        },
                        'today_earnings': {
                        $sum: "$invoice.amount.tasker_earning"
                        },
                        'today_count': {
                        $sum: 1
                        }
                        }
                        }
                      ];

                      db.GetAggregation('task', pipeline, function (err, task) {
					  console.log("task", task);
                      if (err || !task) {
                        data.response = res.__('Unable to fetch task data');
                        res.send(data);
                      } else if(task.length == 0) {
                        res.send(data);
                      } else {
						var last_time = timezone.tz(task[0].last_task_start, settings.settings.time_zone).format('HH:mm');
                        var startTime = moment(moment(task[0].last_task_start).format('HH:mm:ss'), "HH:mm:ss");
                        var endTime = moment(moment(task[0].last_task_end).format('HH:mm:ss'), "HH:mm:ss");
                        var duration = moment.duration(endTime.diff(startTime));
                        var hours = parseInt(duration.asHours());
                        var minutes = parseInt(duration.asMinutes())-hours*60;
                        var seconds = parseInt(duration.asSeconds())-minutes*60;

                        data.response.taskdetails = {};
                        data.response.taskdetails.last_task_starttime = '@' + last_time;
                        data.response.taskdetails.last_task_hours = hours+'h'+' '+minutes+'m'+' '+seconds+'s';
                        data.response.taskdetails.last_task_earning = parseFloat(task[0].last_task_earning * 100) / 100;
                        data.response.taskdetails.task_count = task[0].today_count;
                        data.response.taskdetails.task_hours = task[0].total_workedhours;
                        data.response.taskdetails.task_earnings = parseFloat(task[0].today_earnings * 100) / 100;
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
  };


    controller.providerInfo = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      req.sanitizeBody('provider_id').trim();
      var request = {};
      request.provider_id = req.body.provider_id;
      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          var extension = {};
          extension.populate = 'taskerskills.childid';
          db.GetOneDocument('tasker', {
            '_id': request.provider_id
          }, {}, extension, function(err, providers) {

            if (err) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
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

                  if (providers) {
                    var category = providers.taskerskills.map(function(item) {
                      if (item.childid) {

                        var catdet = {};
                        catdet._id = item.childid._id;
                        catdet.name = item.childid.name;
                        catdet.icon = item.childid.icon;
                        catdet.hourlyrate = item.hour_rate;
                          catdet.ratetype =  item.childid.ratetype;
                          catdet.ratetypestatus =  catdet.ratetype == 'Flat' ? 1 : 2;

                        return catdet;
                      } else {
                        return "";
                      }
                    });

                    var catdet = [];
                    for (i = 0; i < category.length; i++) {
                      var id = category[i]._id;
                      var categoryname = category[i].name;
                      var hourlyrate = category[i].hourlyrate;
                      var ratetype = category[i].ratetype;
                      var ratetypestatus = category[i].ratetypestatus;
                      var icon = category[i].icon;



                      catdet.push({
                        'categoryname': categoryname,
                        'hourlyrate': hourlyrate,
                        'ratetype' : ratetype,
                        'ratetypestatus' : ratetypestatus,
                        'icon': icon,
                        '_id': id
                      });
                    }


                    /* var temp = JSON.stringify(providers.address);
                     var address = Object.keys(JSON.parse(temp)).map(function (key) { return providers.address[key] }).join(', ');*/

                    var address = ''
                    if (providers.address) {
                      if (providers.address.line1) {
                        address += providers.address.line1 + ', ';
                      }
                      if (providers.address.line2 && providers.address.line2 != providers.address.line1) {
                        address += providers.address.line2 + ', ';
                      }
                      if (providers.address.city && providers.address.city != providers.address.line2) {
                        address += providers.address.city + ', ';
                      }
                      if (providers.address.state) {
                        address += providers.address.state + ', ';
                      }
                      if (providers.address.zipcode) {
                        address += providers.address.zipcode + ', ';
                      }
                      if (providers.address.country) {
                        address += providers.address.country;
                      }
                    }
                    var geocode = {
                      'latitude': providers.location.lat,
                      'longitude': providers.location.lng
                    };

                        request.working_location = providers.availability_address;

                      if (providers.total_review && providers.avg_review) {
                        request.avg_review = providers.avg_review;
                      } else {
                        request.avg_review = '0';
                      }
                      if (providers.avatar) {
                        request.image = settings.settings.site_url + providers.avatar;
                      } else {
                        request.image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                      }
                      data.status = providers.status;
                      data.response = {};
                      data.response.firstname = providers.firstname;
                      data.response.lastname = providers.lastname;
                      data.response.provider_name = providers.firstname + ' ' + providers.lastname;
                      data.response.designation = '';
                      data.response.email = providers.email;
                      //
                      //
                      // data.response.bio = request.bio || "";
                      if (providers.profile_details[1] && providers.profile_details[1].answer) {
                        data.response.bio = providers.profile_details[1].answer || "";
                      } else {
                        data.response.bio = '';
                      }
                      if (providers.profile_details[0] && providers.profile_details[0].answer) {
                        data.response.experience = providers.profile_details[0].answer || "";
                      } else {
                        data.response.experience = '';
                      }
                      if (category.length != 0) {
                        data.response.category = category.join(', ');
                      } else {
                        data.response.category = '';
                      }


                      data.response.Working_location = request.working_location;
                      if (providers.radius) {
                        var radi = providers.radius + settings.settings.distanceby;
                      } else {
                        radi = '0' + settings.settings.distanceby;
                      }
                      data.response.radius = radi;
                      data.response.radius = radi;
                      //  data.response.category = category.join(',');
                      data.response.avg_review = request.avg_review.toString();
                      data.response.image = request.image;

                      var availableTimingSlotList = [{ slot: 0, time: "12AM - 1AM", selected: false }, { slot: 1, time: "1AM - 2AM", selected: false }, { slot: 2, time: "2AM - 3AM", selected: false }, { slot: 3, time: "3AM - 4AM", selected: false }, { slot: 4, time: "4AM - 5AM", selected: false }, { slot: 5, time: "5AM - 6AM", selected: false }, { slot: 6, time: "6AM - 7AM", selected: false }, { slot: 7, time: "7AM - 8AM", selected: false }, { slot: 8, time: "8AM - 9AM", selected: false }, { slot: 9, time: "9AM - 10AM", selected: false }, { slot: 10, time: "10AM - 11AM", selected: false }, { slot: 11, time: "11AM - 12PM", selected: false }, { slot: 12, time: "12PM - 1PM", selected: false }, { slot: 13, time: "1PM - 2PM", selected: false }, { slot: 14, time: "2PM - 3PM", selected: false }, { slot: 15, time: "3PM - 4PM", selected: false }, { slot: 16, time: "4PM - 5PM", selected: false }, { slot: 17, time: "5PM - 6PM", selected: false }, { slot: 18, time: "6PM - 7PM", selected: false }, { slot: 19, time: "7PM - 8PM", selected: false }, { slot: 20, time: "8PM - 9PM", selected: false }, { slot: 21, time: "9PM - 10PM", selected: false }, { slot: 22, time: "10PM - 11PM", selected: false }, { slot: 23, time: "11PM - 12AM", selected: false }];

                      var workingDays = [
                          { day: "Sunday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
                          { day: "Monday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
                          { day: "Tuesday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
                          { day: "Wednesday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
                          { day: "Thursday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
                          { day: "Friday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
                          { day: "Saturday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false }];

                      workingDays.forEach(function (item) {
                          providers.working_days.forEach(function (selecteditem) {
                              if(item.day == selecteditem.day) {
                                  if(selecteditem.slots.length > 0) {
                                      item.slot.forEach(function (slots, skey) {
                                          if(selecteditem.slots.includes(skey)) {
                                              slots.selected = selecteditem.wholeday == 1 ? false : true;
                                          }
                                      });
                                  }
                                  item.selected = selecteditem.selected == 1 ? true : false;
                                  item.wholeday = selecteditem.wholeday == 1 ? true : false;
                              }
                          });
                      });

                      data.response.availability_days = workingDays;
                      data.response.details = [{
                          title: 'Bio',
                          question: 'About you',
                          desc: data.response.bio
                        },
                        {
                          title: 'Experience',
                          question: 'About your work experience',
                          desc: data.response.experience
                        },
                        {
                          title: 'Email',
                          desc: providers.email
                        },
                        {
                          title: 'Mobile',
                          desc: (providers.phone.code + ' ' + providers.phone.number).toString()
                        },
                        {
                          title: 'Address',
                          desc: address
                        },
                        {
                          title: 'Category',
                          desc: category.join(', ')
                        },
                        {
                          title: 'Working location',
                          desc: request.working_location
                        },
                        {
                          title: 'Radius',
                          desc: radi
                        }
                      ];

                      data.response.dial_code = "";
                      data.response.mobile_number = "";

                      if (providers.phone) {
                        // data.response.dial_code = providers.phone.code.toString();
                        data.response.dial_code = providers.phone.code;
                        data.response.mobile_number = providers.phone.number;
                      } else {
                        data.response.dial_code = '';
                        data.response.mobile_number = '';
                      }

                      data.response.address = address;
                      data.response.address_str = address;
                      data.response.currencycode = currencies.code;
                      data.response.currencysymbol = currencies.symbol;
                      data.response.about = providers.profile_details;
                      /*  if (category.length != 0) {
                           data.response.category_name = category.join(', ');
                       } else {
                           data.response.category_name = '';
                       } */

                      var fullCatList = [];

                      for (var i = 0; i < providers.taskerskills.length; i++) {
                        var cat = {};
                        cat._id = providers.taskerskills[i].childid._id;
                        cat.name = providers.taskerskills[i].childid.name;
                        fullCatList.push(cat);
                      }
                      // data.response.category_details = fullCatList;
                      data.response.category_Details = catdet;
                      res.send(data);
                      // res.send({'dsdsd':fullCatList,'asdasa':catdet});
                  } else {
                    data.response = res.__('Invalid ' + CONFIG.TASKER);
                    res.send(data);

                  }
                }
              });
            }
          });
        }
      });
    };


    controller.getEditInfo = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      req.sanitizeBody('provider_id').trim();
      var request = {};
      request.provider_id = req.body.provider_id;

      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          db.GetOneDocument('tasker', {
            '_id': request.provider_id
          }, {}, {}, function(err, providers) {
            if (err) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
              res.send(data);
            } else {
              if (providers) {
                var geocode = {
                  'latitude': providers.location.lat,
                  'longitude': providers.location.lng
                };
                  var  working_location = providers.availability_address;
                  for (var key = 0; key < providers.profile_details.length; key++) {
                    if (providers.profile_details[key].question == '57518be5dc9026c80c333ca7') {
                      var texthtml = providers.profile_details[key].answer;
                      request.bio = htmlToText.fromString(texthtml);
                    }
                  }

                  if (providers.avatar) {
                    request.image = settings.settings.site_url + providers.avatar;
                  } else {
                    request.image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                  }

                  /*if (providers.address.country) {
                    request.country = providers.address.country;
                  } else {
                    request.country = '';
                  }*/

                  data.status = '1';
                  data.response = {};
                  // data.response.bio = request.bio || '';
                  data.response.bio = '';
                  data.response.image = request.image;
                  data.response.dial_code = providers.phone.code;
                  data.response.mobile_number = providers.phone.number;
                  data.response.email = providers.email;

                  /*var provider_address = ''
                  if (providers.address) {
                    if (providers.address.line1) {
                      provider_address += providers.address.line1 + ', ';
                    }
                    if (providers.address.line2 && providers.address.line2 != providers.address.line1) {
                      provider_address += providers.address.line2 + ', ';
                    }
                    if (providers.address.city && providers.address.city != providers.address.line2) {
                      provider_address += providers.address.city + ', ';
                    }
                    if (providers.address.state) {
                      provider_address += providers.address.state + ', ';
                    }
                    if (providers.address.country) {
                      provider_address += providers.address.country + ', ';
                    }
                    if (providers.address.zipcode) {
                      provider_address += providers.address.zipcode;
                    }

                  }
                  //data.response.address = providers.address.line1 + '\n' + providers.address.line2 + '\n' + providers.address.city + '\n' + providers.address.state + '\n' + providers.address.country + '\n' + providers.address.zipcode;
                  data.response.address = provider_address;
                  data.response.state = providers.address.state;
                  data.response.city = providers.address.city;
                  data.response.country = request.country;*/
                  data.response.radius = providers.radius || "";
                  data.response.distane_by = settings.settings.distanceby || "";



                  data.response.firstname = providers.firstname;
                  data.response.lastname = providers.lastname;
                  data.response.working_location = working_location || "";
                  /*if (providers.address.zipcode) {
                    data.response.postal_code = providers.address.zipcode.toString();
                  } else {
                    data.response.postal_code = '';
                  }*/
                  res.send(data);
              } else {
                data.response = res.__('Invalid ' + CONFIG.TASKER);
                res.send(data);
              }
            }
          });
        }
      });
    };

    controller.updateBio = function(req, res) {

      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('bio', res.__('Please Enter Bio')).notEmpty();
      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('bio').trim();
      var request = {};
      request.provider_id = req.body.provider_id;
      request.bio = req.body.bio;
      //providers.profile_details[0].answer

      db.GetDocument('question', {}, {}, {}, function(err, question) {
        if (err) {
          res.send({
            "status": "0",
            "response": res.__("Error")
          });
        } else {

          db.UpdateDocument('tasker', {
            '_id': request.provider_id,
            'profile_details.question': '57518be5dc9026c80c333ca7'
          }, {
            'profile_details.$.answer': request.bio
          }, {}, function(err, response) {
            if (err || response.nModified == 0) {
              data.response = res.__('Invalid ' + CONFIG.TASKER);
              res.send(data);
            } else {
              data.status = '1';
              data.response = res.__('Updated Successfully !!');
              res.send(data);
            }
          });
        }
      });
    };

    controller.updateEmail = function(req, res) {

      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('email', res.__('Please Enter Valid Email')).notEmpty().withMessage('Email is Required').isEmail();
      //validation

      //Sanitization
      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('email').normalizeEmail();
      //Sanitization

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
      request.provider_id = req.body.provider_id;
      request.email = req.body.email;

      db.UpdateDocument('tasker', {
        '_id': request.provider_id,
        "role": "tasker"
      }, {
        'email': request.email
      }, {}, function(err, response) {
        if (err || response.nModified == 0) {
          data.response = res.__('Invalid ' + CONFIG.TASKER);
          res.send(data);
        } else {
          data.status = '1';
          data.response = res.__('Updated Successfully !!');
          res.send(data);
        }
      });
    };

    controller.updateMobile = function(req, res) {
      var data = {};
      data.status = '0';

      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER + ' id')).notEmpty();
      req.checkBody('country_code', res.__('Valid Country code is required')).notEmpty();
      req.checkBody('mobile_number', res.__('Valid Phone number is required')).notEmpty();
      req.checkBody('otp').optional();
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }

      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('country_code').trim();
      req.sanitizeBody('mobile_number').trim();
      req.sanitizeBody('otp').trim();

      var request = {};
      request.provider_id = req.body.provider_id;
      request.country_code = req.body.country_code;
      request.phone_number = req.body.mobile_number;
      request.otp = req.body.otp;
      console.log('req.body.otp', req.body.otp);

      data.country_code = req.body.country_code;
      data.phone_number = req.body.mobile_number;

      var phone = {};
      phone.code = req.body.country_code;
      phone.number = req.body.mobile_number;

      db.GetOneDocument('tasker', {
        '_id': {
          '$ne': req.body.provider_id
        },
        'phone.number': request.phone_number
      }, {}, {}, function(err, CheckPhone) {
        if (err || CheckPhone) {
          data.response = res.__('Phone Number Already Exist');
          res.send(data);
        } else {
          db.GetOneDocument('tasker', {
            '_id': request.provider_id
          }, {}, {}, function(err, user) {
            if (err && !user) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', ' + CONFIG.TASKER + ' Not Found');
              res.send(data);
            } else {
              if (request.otp) {
                if (user.otp == request.otp && user.otp && request.otp) {
                  db.UpdateDocument('tasker', {
                    '_id': request.provider_id
                  }, {
                    'phone': phone,
                    'otp': ''
                  }, {}, function(err, response) {
                    if (err) {
                      data.response = res.__('Unable to Change your Mobile Number');
                      res.send(data);
                    } else {
                      data.status = '1';
                      data.response = res.__(CONFIG.TASKER + ' Mobile Number Changed Successfully');
                      res.send(data);
                    }
                  });
                } else {
                  data.status = '0';
                  data.response = res.__('OTP is incorrect!!');
                  res.send(data);
                }
              } else {
                var to = request.country_code + request.phone_number;
                var new_otp = library.randomString(6, '#');
                console.log('new_otp', new_otp);
                var message = util.format(CONFIG.SMS.UPDATE_MOBILE_NUMBER, user.username, new_otp);
                twilio.createMessage(to, '', message, function(err, response) {
                  db.UpdateDocument('tasker', {
                    '_id': request.provider_id
                  }, {
                    'otp': new_otp
                  }, {}, function(err, users) {
                    if (err) {
                      data.response = res.__('Unable to Sent OTP for you');
                      res.send(data);
                    } else {
                      db.GetOneDocument('settings', {
                        'alias': 'sms'
                      }, {}, {}, function(err, settings) {
                        if (err || !settings) {
                          data.response = 'Unable to Sent OTP for you';
                          res.send(data);
                        } else {
                          if (settings.settings.twilio.mode == 'development') {
                            var otp_status = 'development';
                          } else {
                            var otp_status = 'production';
                          }
                          data.status = '1';
                          data.otp = new_otp.toString();
                          data.otp_status = otp_status;
                          data.response = res.__('OTP Sent Successfully');
                          res.send(data);
                        }
                      });
                    }
                  });
                });
              }
            }
          });
        }
      });
    };

    controller.updateImage = function(req, res) {
      req.checkBody('provider_id', 'Invalid ' + CONFIG.TASKER).notEmpty();


      var data = {};
      data.status = '0';

      console.log("req.filereq.filereq.file", req.file)

      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }

      req.sanitizeBody('provider_id').trim();

      var request = {};
      request.provider_id = req.body.provider_id;

      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          db.GetOneDocument('tasker', {
            '_id': request.provider_id
          }, {}, {}, function(err, IsVaid) {
            if (err) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
              res.send(data);
            } else {
              if (IsVaid) {
                if (req.file) {
                  data.image = attachment.get_attachment(req.file.destination, req.file.filename)
                  data.img_name = req.file.filename;
                  data.img_path = req.file.destination.substring(2);

                  db.UpdateDocument('tasker', {
                    '_id': request.provider_id
                  }, {
                    'avatar': 'uploads/images/tasker/' + data.img_name,
                    'img_name': data.img_name,
                    'img_path': data.img_path
                  }, {}, function(err, result) {

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
                      data.response = settings.settings.site_url + "uploads/images/tasker/" + req.file.filename;


                      console.log("settings.settings.site_url=+ req.file.filename", settings.settings.site_url + "uploads/images/tasker/" + req.file.filename)

                      res.send({
                        status: "1",
                        response: {
                          "image": settings.settings.site_url + "uploads/images/tasker/" + req.file.filename,
                          "msg": res.__("Image uploaded successfully...")
                        }
                      });
                    }
                  });
                } else {
                  data.response = res.__('File not found');
                  res.send(data);
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

    controller.updateRadius = function(req, res) {

      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('radius', res.__('Invalid Radius')).optional();

      var data = {};
      data.status = '0';

      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('radius').trim();

      var request = {};
      request.provider_id = req.body.provider_id;
      request.radius = req.body.radius;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, IsVaid) {
        if (err || !IsVaid) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          db.UpdateDocument('tasker', {
            '_id': request.provider_id
          }, {
            'radius': request.radius
          }, {}, function(err, response) {
            if (err || response.nModified == 0) {
              data.response = res.__('Unable to save your data');
              res.send(data);
            } else {
              data.status = '1';
              data.response = res.__('Radius Updated Successfully !!');
              res.send(data);
            }
          });
        }
      });
    }

    controller.updateuserName = function(req, res) {

      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('firstname', res.__('Invalid firstname')).notEmpty();
      req.checkBody('lastname', res.__('Invalid lastname')).notEmpty();

      var data = {};
      data.status = '0';

      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }

      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('firstname').trim();
      req.sanitizeBody('lastname').trim();

      var request = {};
      request.provider_id = req.body.provider_id;
      request.firstname = req.body.firstname;
      request.lastname = req.body.lastname;
      request.username = req.body.firstname + ' ' + req.body.lastname;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, IsVaid) {
        if (err || !IsVaid) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          var specialChars = "<>@!#$%^&*()_+[]{}?:;|'\"\\,./~`-=";
          var checkForSpecialChar = function(string) {
            for (var i = 0; i < specialChars.length; i++) {
              if (string.indexOf(specialChars[i]) > -1) {
                return true
              }
            }
            return false;
          }
          /*var str = (request.username).toString();
          if (checkForSpecialChar(str)) {
            res.send({
              "status": "0",
              "errors": res.__("Special characters are not allowed.!")
            });
          } else {
            if (4 > (request.user_name).length) {
              res.send({
                "status": "0",
                "errors": res.__("User Name must be min of 4 characters.!")
              });
            } else if ((request.user_name).length > 25) {
              res.send({
                "status": "0",
                "errors": res.__("User Name must be max of 25 characters.!")
              });
            } else {*/
              db.UpdateDocument('tasker', {
                '_id': request.provider_id
              }, {
                'username': request.username,
                'firstname':request.firstname,
                'lastname': request.lastname
              }, {}, function(err, response) {
                if (err || response.nModified == 0) {
                  res.send({
                    "status": "0",
                    "errors": res.__("Unable to save your data.!")
                  });
                } else {
                  data.status = '1';
                  data.response = res.__('Username Updated Successfully !!');
                  res.send(data);
                }
              });
            /*}
          }*/
        }
      });
    }
    controller.updateWorklocation = function(req, res) {

      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('availability_address', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();

      req.checkBody('lat', res.__('Latitude is Required')).notEmpty();
      req.checkBody('long', res.__('Longitude is Required')).notEmpty();

      var data = {};
      data.status = '0';

      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }

      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('availability_address').trim();
      req.sanitizeBody('lat').trim();
      req.sanitizeBody('long').trim();

      var request = {};
      request.provider_id = req.body.provider_id;
      request.provider_lat = req.body.lat;
      request.provider_lng = req.body.long;
      request.availability_address = req.body.availability_address;
      /*request.long = req.body.long;
      var geocode = {
        'latitude': req.body.lat,
        'longitude': req.body.long
      };
      GoogleAPI.geocode(geocode, function(response) {
        console.log("response", response);
        if (response.length > 0) {
          if (response[0].formatted_address) {
            request.availability_address = response[0].formatted_address;

          } else {
            request.availability_address = '';
          }
        } else {
          request.availability_address = '';
        }*/


        db.GetOneDocument('tasker', {
          '_id': request.provider_id
        }, {}, {}, function(err, IsVaid) {
          if (err || !IsVaid) {
            data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
            res.send(data);
          } else {

            db.UpdateDocument('tasker', {
              '_id': request.provider_id
            }, {
              'availability_address': request.availability_address,
              'location.lng': request.provider_lng,
              'location.lat': request.provider_lat

            }, {}, function(err, response) {

              if (err || response.nModified == 0) {
                data.response = res.__('Unable to save your data');
                res.send(data);
              } else {
                data.status = '1';
                data.response = res.__('Address Updated Successfully !!');
                res.send(data);
              }
            });
          }
        });
      //});
    }

    controller.updateAddress = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('address', res.__('Invalid Address')).notEmpty();
      //req.checkBody('line2', 'Enter line2').notEmpty();
      req.checkBody('city', res.__('Enter city')).optional();
      req.checkBody('state', res.__('Enter state')).optional();
      req.checkBody('postal_code', res.__('Enter Valid zipcode')).optional();
      req.checkBody('country', res.__('Enter Country')).optional();
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
      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('address').trim();
      //req.sanitizeBody('line2').trim();
      req.sanitizeBody('city').trim();
      req.sanitizeBody('state').trim();
      req.sanitizeBody('postal_code').trim();
      req.sanitizeBody('country').trim();
      var request = {};
      request.provider_id = req.body.provider_id;
      request.providerAddress = {};


      var a = req.body.address;
      var words = a.split(", ");
      var wlength = words.length;

      var line_1 = 0;
      var line_2 = 1;

      request.providerAddress.line1 = words[line_1];
      request.providerAddress.line2 = words[line_2];
      request.providerAddress.city = req.body.city;
      request.providerAddress.state = req.body.state;
      request.providerAddress.zipcode = req.body.postal_code;
      request.providerAddress.country = req.body.country;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id,
        "role": "tasker"
      }, {}, {}, function(err, IsVaid) {
        if (err || !IsVaid) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          db.UpdateDocument('tasker', {
            '_id': request.provider_id
          }, {
            'address': request.providerAddress
          }, {}, function(err, response) {
            if (err || response.nModified == 0) {
              data.response = res.__('Unable to save your data');
              res.send(data);
            } else {
              data.status = '1';
              data.response = res.__('Updated Successfully !!');
              res.send(data);
            }
          });
        }
      });
    }


    controller.changePassword = function(req, res) {
      var data = {};
      data.status = 0;

      req.checkBody('provider_id', res.__(CONFIG.TASKER + ' is Invalid')).notEmpty();
      req.checkBody('password', res.__('Old Password is Invalid')).notEmpty();
      req.checkBody('new_password', res.__('New Password is Invalid')).notEmpty();
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }

      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('password').trim();
      req.sanitizeBody('new_password').trim();

      var request = {};
      request.provider_id = req.body.provider_id;
      request.old_password = req.body.password;
      request.new_password = req.body.new_password;
      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {
        password: 1
      }, {}, function(err, docdata) {
        if (err) {
          res.send(err);
        } else {
          bcrypt.compare(request.old_password, docdata.password, function(err, result) {
            if (result == true) {
              var input = (req.body.new_password).toString();
              var string = input;
              var firstcheck = new RegExp("^(?=.*[a-z])(?=.*[A-Z])");
              if (firstcheck.test(string)) {
                var recheck = new RegExp("^(?=.*[0-9]).{6,12}$");
                if (recheck.test(string)) {
                  var password = bcrypt.hashSync(request.new_password, bcrypt.genSaltSync(8), null);
                  bcrypt.compare(request.old_password, password, function(err, results) {
                    if (results == false) {
                      db.UpdateDocument('tasker', {
                        '_id': request.provider_id
                      }, {
                        'password': password
                      }, function(err, docdata) {
                        if (err) {
                          res.send(err);
                        } else {
                          data.status = 1;
                          data.response = res.__(CONFIG.TASKER + ' Password Changed Successfully');
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
              data.response = res.__('Please Check the Current Password You Entered');
              res.send(data);
            }
          });
        }
      });
    };

    controller.forgotPassword = function(req, res) {
      var data = {};
      data.status = '0';
      req.checkBody('email', res.__('Phone or Email is Required')).notEmpty().withMessage('Valid Phone or Email is Required');
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      req.sanitizeBody('email').trim();
      var request = {};
      request.email = req.body.email;
      request.reset = library.randomString(8, '#A');
      async.waterfall([
        function(callback) {
          db.GetOneDocument('tasker', {
            $or: [{
              'email': request.email
            }, {
              'phone.number': request.email
            }]
          }, {}, {}, function(err, user) {
            if (err || !user) {
              data.response = res.__('No ' + CONFIG.TASKER + ' Found for this Phone or Email');
              res.send(data);
            } else {
              callback(err, user);
            }
          });
        },
        function(user, callback) {
          db.UpdateDocument('tasker', {
            '_id': user._id
          }, {
            'reset_code': request.reset
          }, {}, function(err, response) {
            if (err || response.nModified == 0) {
              data.response = res.__('Unable to update your reset code');
              res.send(data);
            } else {
              callback(err, user);
            }
          });
        },
        function(user, callback) {
          db.GetOneDocument('tasker', {
            '_id': user._id
          }, {}, {}, function(err, user) {
            if (err || !user) {
              data.response = res.__('No ' + CONFIG.TASKER + ' Found for this Phone or Email');
              res.send(data);
            } else {
              callback(err, user);
            }
          });
        },
        function(user, callback) {
          db.GetOneDocument('settings', {
            'alias': 'general'
          }, {}, {}, function(err, settings) {
            if (err) {
              callback(err, callback);
            } else {
              callback(err, user, settings);
            }
          });
        }
      ], function(err, user, settings) {
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
        mailData.html.push({
          name: 'name',
          value: name || ""
        });
        mailData.html.push({
          name: 'email',
          value: user.email || ""
        });
        mailData.html.push({
          name: 'site_url',
          value: settings.settings.site_url || ""
        });
        mailData.html.push({
          name: 'site_title',
          value: settings.settings.site_title || ""
        });
        mailData.html.push({
          name: 'logo',
          value: settings.settings.logo || ""
        });
        mailData.html.push({
          name: 'url',
          value: settings.settings.site_url + 'reset-password/tasker' + '/' + user._id + '/' + user.reset_code
        });
        mailcontent.sendmail(mailData, function(err, response) {});

        var to = user.phone.code + user.phone.number;
        var message = util.format(CONFIG.SMS.FORGOT_PASSWORD, user.username, request.reset);
        twilio.createMessage(to, '', message, function(err, response) {});
        data.status = '1';
        data.verification_code = request.reset;
        data.email_address = user.email;
        data.response = res.__('Password reset mail has been sent to your registered mail ID');
        res.send(data);
      });
    }

    controller.getmainCategoryListformobile = function(req, res) {
      var data = {};
      data.status = '0';

      db.GetDocument('category', {
        'status': 1,
        'parent': {
          $exists: false
        }
      }, {}, {}, function(err, maincategories) {
        if (err) {
          res.send({
            "status": "0",
            "errors": res.__("Category Not Available")
          });
        } else {
          db.GetDocument('experience', {
            status: 1
          }, {}, {}, function(err, experiences) {
            if (err) {
              res.send({
                "status": "0",
                "errors": res.__("Experience Not Available")
              });
            } else {
              var maincategorylist = [];
              var experiencelist = [];
              for (var i = 0; i < maincategories.length; i++) {
                var maincats = {};
                maincats.name = maincategories[i].name;
                maincats.id = maincategories[i]._id;
                maincategorylist.push(maincats);
              }
              for (var j = 0; j < experiences.length; j++) {
                var experience = {};
                experience.name = experiences[j].name;
                experience.id = experiences[j]._id;
                experiencelist.push(experience);
              }
              res.send({
                status: "1",
                response: maincategorylist,
                experiencelist
              });
            }
          });
        }
      });
    }

    controller.getsubCategoryListformobile = function(req, res) {
      req.checkBody('category_id', res.__('Invalid Category Id')).notEmpty();

      var data = {};
      data.status = '0';
      data.catid = req.body.category_id;

      db.GetDocument('category', {
        'status': 1,
        'parent': data.catid
      }, {}, {}, function(err, subcategories) {
        if (err) {
          res.send({
            "status": "0",
            "errors": res.__("Sub Category Not Available")
          });
        } else {
          var subcategorylist = [];
          for (var i = 0; i < subcategories.length; i++) {
            var subcats = {};
            subcats.name = subcategories[i].name;
            subcats.id = subcategories[i]._id;
            subcategorylist.push(subcats);
          }
          res.send({
            status: "1",
            response: subcategorylist
          });
        }
      });
    };


    controller.getsubCategoryDetailsformobile = function(req, res) {
      req.checkBody('subcategory_id', res.__('Invalid Sub Category Id')).notEmpty();

      var data = {};
      data.status = '0';
      data.subcatid = req.body.subcategory_id;

      db.GetDocument('category', {
        'status': 1,
        '_id': data.subcatid
      }, {}, {}, function(err, subdocdata) {
        if (err) {
          res.send({
            "status": "0",
            "errors": res.__("Sub Category Details Not Available")
          });
        } else {
            db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function(err, currencies) {
              if (err) {
                res.send(err);
              } else {
                  var subcategorydetailslist = [];
                  for (var i = 0; i < subdocdata.length; i++) {
                    var subcatdets = {};
                    subcatdets.name = subdocdata[i].name;
                    subcatdets.id = subdocdata[i]._id;
                    subcatdets.minrate = subdocdata[i].commision;
                    subcatdets.ratetype = subdocdata[i].ratetype;
                    subcatdets.ratetypestatus = subdocdata[i].ratetype == 'Flat' ? 1 : 2;
                    subcatdets.currency_code = currencies.code;
                    subcategorydetailslist.push(subcatdets);
                  }

                  res.send({
                    status: "1",
                    response: subcategorydetailslist
                  });
              }
            });
          }
      });
    };

    controller.registerGetLocationList = function(req, res) {
      var data = {};
      data.status = '0';

      var pipeline = [{
          $match: {
            'status': 1
          }
        },
        {
          $project: {
            _id: 0,
            'id': '$_id',
            'city': '$city'
          }
        },
        {
          $sort: {
            city: 1
          }
        }
      ];

      db.GetAggregation('locations', pipeline, function(err, locations) {
        if (err || !locations) {
          data.response = res.__('Locations unavailable');
          res.send(data);
        } else {
          data.status = '1';
          data.response = {};
          data.response.locations = locations;
          res.send(data);
        }
      });
    }

    controller.registerGetCategoryList = function(req, res) {
      //Validation
      req.checkBody('location_id', res.__('Invalid Location enter location_id')).notEmpty();
      //Validation

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
      request.location_id = req.body.location_id;

      db.GetOneDocument('locations', {
        '_id': request.location_id
      }, {}, {}, function(err, locations) {
        if (err || !locations) {
          data.response = res.__('Location unavailable');
          res.send(data);
        } else {
          var pipeline = [{
              $match: {
                'status': 1,
                '_id': {
                  $in: locations.avail_category.map(function(id) {
                    return new mongoose.Types.ObjectId(id);
                  })
                }
              }
            },
            {
              $sort: {
                position: 1
              }
            },
            {
              $project: {
                _id: 0,
                'id': '$_id',
                'category': '$name'
              }
            }
          ];
          db.GetAggregation('category', pipeline, function(err, category) {
            if (err || !category) {
              data.response = res.__('Categories unavailable');
              res.send(data);
            } else {
              data.status = '1';
              data.response = {};
              data.response.category = category;
              res.send(data);
            }
          });
        }
      });
    }

    controller.registerGetCountryList = function(req, res) {
      var data = {};
      data.status = '0';

      var pipeline = [{
          $match: {
            'status': 1
          }
        },
        {
          $project: {
            _id: 1,
            'name': '$name',
            'dial_code': '$code'
          }
        },
        {
          $sort: {
            name: 1
          }
        }
      ];

      db.GetAggregation('countries', pipeline, function(err, country) {
        if (err || !country) {
          data.response = res.__('Countries not found');
          res.send(data);
        } else {
          data.status = '1';
          data.response = {};
          data.response.countries = country;
          res.send(data);
        }
      });
    }

    controller.registerGetLocationwithCategory = function(req, res) {
      var data = {};
      data.status = '0';

      var extension = {};
      extension.populate = {
        path: 'avail_category',
        select: 'name'
      };
      extension.sort = {
        'city': 1,
        'avail_category.name': 1
      };
      db.GetDocument('locations', {}, {
        city: 1,
        avail_category: 1
      }, extension, function(err, locations) {
        if (err || !locations) {
          data.response = res.__('Location not found');
          res.send(data);
        } else {
          data.status = '1';
          data.response = {};
          data.response.values = [];

          for (var i = 0; i < locations.length; i++) {
            var LocationCategory = {};
            LocationCategory.id = locations[i]._id;
            LocationCategory.city = locations[i].city;
            LocationCategory.category = [];
            for (var j = 0; j < locations[i].avail_category.length; j++) {
              LocationCategory.category.push({
                'id': locations[i].avail_category[j]._id,
                'category': locations[i].avail_category[j].name
              });
            }
            data.response.values.push(LocationCategory);
          }
          res.send(data);
        }
      });
    };

    controller.cancellationReason = function(req, res) {
      req.checkBody('provider_id', res.__('Please enter ' + CONFIG.TASKER + ' id')).notEmpty();
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
      request.provider_id = req.body.provider_id;
      db.GetOneDocument('tasker', {
        '_id': request.provider_id,
        "role": "tasker"
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          db.GetDocument('cancellation', {
            'status': 1,
            'type': 'tasker'
          }, {}, {}, function(err, cancellationReason) {
            if (err || cancellationReason.length == 0) {
              data.response = res.__('No Reasons Available to Cancelling Job');
              res.send(data);
            } else {
              data.status = '1';
              data.response = {
                reason: []
              };
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

    controller.cancelJob = function(req, res) {
      //validation
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('job_id', res.__('Enter valid Job Details')).notEmpty();
      req.checkBody('reason', res.__('Enter valid Reason')).notEmpty();
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
      request.provider_id = req.body.provider_id;
      request.job_id = req.body.job_id;
      request.reason = req.body.reason;
      request.bookings = {};
      request.bookings.cancelled_providers = [];
      request.doAction = false;
      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          var options = {};
          options.populate = 'category user tasker';
          db.GetOneDocument('task', {
            'booking_id': request.job_id
          }, {}, options, function(err, bookings) {
            //db.GetOneDocument('task', { 'booking_id': request.job_id }, {}, {}, function (err, bookings) {
            if (err || !bookings) {
              data.response = res.__('Task Not Available');
              res.send(data);
            } else {
              db.GetOneDocument('settings', {
                'alias': 'general'
              }, {}, {}, function(err, settings) {
                if (err || !settings) {
                  res.send({
                    "status": "0",
                    "response": res.__("Configure your website settings")
                  });
                } else {
                  var JobStatus = [1, 2];
                  if (bookings.status == 1 || bookings.status == 2 || bookings.status == 3 || bookings.status == 4) {
                    var cancelData = {};
                    cancelData.reason = request.reason;
                    cancelData.type = 'tasker';
                    cancelData.date = new Date();
                    cancelData.status = 1;
                    db.UpdateDocument('task', {
                      'booking_id': request.job_id
                    }, {
                      'cancellation': cancelData,
                      'status': 8,
                      'history.job_cancellation_time': new Date()
                    }, {}, function(err, response) {
                      if (err || response.nModified == 0) {
                        data.response = res.__('Invalid ' + CONFIG.TASKER + ', Unable to Save your data');
                        res.send(data);
                      } else {

                        if (bookings.bookingmode == 'booknow' && bookings.status != 1) {
                          db.UpdateDocument('tasker', {
                            _id: request.provider_id
                          }, {
                            $unset: {
                              current_task: ""
                            }
                          }, function(err, taskerreslut) {
                            {}
                          });
                        }

                        var message = provider.username + ' cancelled this job.';
                        /*  var options = { 'job_id': req.body.job_id };
                          push.sendPushnotification(bookings.user, message, 'job_reassign', 'ANDROID', options, 'USER', function (err, response, body) { }); */
                        var options = {
                          'job_id': req.body.job_id,
                          'user_id': bookings.user
                        };
                        push.sendPushnotification(bookings.user._id, message, 'job_reassign', 'ANDROID', options, 'USER', function(err, response, body) {});
                        data.status = '1';
                        data.response = {};
                        data.response.job_id = request.job_id;
                        data.response.message = 'Job Cancelled';
                        data.response.btn_group = '8';
                        res.send(data);

                        var job_date = timezone.tz(bookings.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.date_format);
                        var job_time = timezone.tz(bookings.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.time_format);

                        var mailData = {};
                        mailData.template = 'Taskrejectedmailtouser';
                        mailData.to = bookings.user.email;
                        mailData.html = [];
                        mailData.html.push({ name: 'username', value: bookings.user.username });
                        mailData.html.push({ name: 'taskername', value: bookings.tasker.username });
                        mailData.html.push({ name: 'bookingid', value: bookings.tasker.booking_id });
                        mailData.html.push({ name: 'startdate', value: job_date });
                        mailData.html.push({ name: 'cancelreason', value: req.body.reason });

                        mailcontent.sendmail(mailData, function (err, response) { });
                      }
                    });
                  } else {
                    data.response = res.__('Already this Job has been Cancelled.');
                    res.send(data);
                  }
                }
              });
            }
          });
        }
      });
    };


    controller.recentBooking = function(req, res) {
      var status = '0';
      var response = '';
      var errors = [];
      req.checkBody('provider_id', res.__(CONFIG.TASKER + '_id ID is Required')).notEmpty();
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
      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('perPage').trim();
      req.sanitizeBody('page').trim();
      req.sanitizeBody('orderby').trim();
      req.sanitizeBody('sortby').trim();
      try {
        var data = {};
        data.user_id = req.body.provider_id.trim();
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
          db.GetOneDocument('tasker', {
            _id: req.body.provider_id
          }, {}, {}, function(userErr, userRespo) {
            if (userErr || !userRespo) {
              res.send({
                "status": "0",
                "response": res.__('Invalid ' + CONFIG.TASKER + ', Please check your data')
              });
            } else {
              if (data.type == 'today') {
                var currdate = moment(Date.now()).format('MM/DD/YYYY');
                var t1 = currdate + ' 00:00:00';
                var t2 = currdate + ' 23:59:59';
                var query = {
                  'tasker': new mongoose.Types.ObjectId(req.body.provider_id),
                  'status': {
                    "$ne": 10
                  },
                  "booking_information.booking_date": {
                    '$gte': new Date(t1),
                    '$lte': new Date(t2)
                  }
                };
              } else if (data.type == 'upcoming') {
                var query = {
                  'tasker': new mongoose.Types.ObjectId(req.body.provider_id),
                  'status': {
                    "$ne": 10
                  },
                  "booking_information.booking_date": {
                    '$gt': new Date()
                  }
                };
              } else if (data.type == 'recent') {
                var today = new Date();
                var yesterday = new Date(today.setDate(today.getDate() - 1))
                var sdate = moment(yesterday).format('MM/DD/YYYY');
                var yesdat = sdate + ' 00:00:00';
                var query = {
                  'tasker': new mongoose.Types.ObjectId(req.body.provider_id),
                  'status': {
                    "$ne": 10
                  },
                  "booking_information.booking_date": {
                    '$gte': new Date(yesdat),
                    '$lte': new Date()
                  }
                };
              }
              db.GetCount('task', query, function(err, count) {
                if (err || count == 0) {
                  res.send({
                    "status": "0",
                    "response": res.__("No New Task Found")
                  });
                } else {
                  db.GetOneDocument('settings', {
                    'alias': 'general'
                  }, {}, {}, function(err, settings) {
                    if (err || !settings) {
                      data.response = res.__('Configure your website settings');
                      res.send(data);
                    } else {
                      db.GetAggregation('task', [{
                          $match: query
                        },
                        {
                          "$lookup": {
                            from: "users",
                            localField: "user",
                            foreignField: "_id",
                            as: "tasker"
                          }
                        },
                        {
                          "$lookup": {
                            from: "categories",
                            localField: "category",
                            foreignField: "_id",
                            as: "icon_normal"
                          }
                        },
                        {
                          $unwind: {
                            path: "$tasker",
                            preserveNullAndEmptyArrays: true
                          }
                        },
                        {
                          $unwind: {
                            path: "$icon_normal",
                            preserveNullAndEmptyArrays: true
                          }
                        },
                        {
                          "$group": {
                            "_id": "$_id",
                            "job_id": {
                              "$first": "$booking_id"
                            },
                            "user_id": {
                              "$first": "$tasker._id"
                            },
                            "user_name": {
                              "$first": "$tasker.username"
                            },
                            "image": {
                              "$first": "$tasker.avatar"
                            },
                            "status": {
                              "$first": "$status"
                            },
                            "task_id": {
                              "$first": "$_id"
                            },
                            "booking_time": {
                              "$first": "$booking_information.est_reach_date"
                            },
                            "job_date": {
                              "$first": "$booking_information.est_reach_date"
                            },
                            "category_name": {
                              "$first": "$booking_information.service_type"
                            },
                            "location": {
                              "$first": "$booking_information.location"
                            },
                            "service_icon": {
                              "$first": {
                                $cond: ["$icon_normal", "$icon_normal.image", {
                                  $literal: settings.settings.site_url + CONFIG.CATEGORY_DEFAULT_IMAGE
                                }]
                              }
                            },
                            "booking_date": {
                              "$first": "$booking_information.booking_date"
                            },
                            "job_status": {
                              "$first": "$status"
                            },
                            "country_code": {
                              "$first": "$tasker.phone.code"
                            },
                            "contact_number": {
                              "$first": "$tasker.phone.number"
                            },
                            "doCall": {
                              "$first": {
                                $cond: {
                                  if: {
                                    $and: [{
                                      $ne: ["$status", 7]
                                    }, {
                                      $ne: ["$status", 8]
                                    }]
                                  },
                                  then: {
                                    $literal: "Yes"
                                  },
                                  else: {
                                    $literal: "No"
                                  }
                                }
                              }
                            },
                            "isSupport": {
                              "$first": {
                                $cond: {
                                  if: "$tasker.phone.number",
                                  then: {
                                    $literal: "No"
                                  },
                                  else: {
                                    $literal: "Yes"
                                  }
                                }
                              }
                            },
                            "doMsg": {
                              "$first": {
                                $cond: {
                                  if: {
                                    $and: [{
                                      $ne: ["$status", 7]
                                    }, {
                                      $ne: ["$status", 8]
                                    }]
                                  },
                                  then: {
                                    $literal: "Yes"
                                  },
                                  else: {
                                    $literal: "No"
                                  }
                                }
                              }
                            },
                            "doCancel": {
                              "$first": {
                                $cond: {
                                  if: {
                                    $and: [{
                                      $ne: ["$status", 6]
                                    }, {
                                      $ne: ["$status", 7]
                                    }, {
                                      $ne: ["$status", 8]
                                    }]
                                  },
                                  then: {
                                    $literal: "Yes"
                                  },
                                  else: {
                                    $literal: "No"
                                  }
                                }
                              }
                            },
                          }
                        },
                        {
                          "$sort": sorting
                        },
                        {
                          "$skip": (data.perPage * (data.page - 1))
                        },
                        {
                          "$limit": data.perPage
                        }
                      ], function(err, bookings) {

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
                            bookings[i].user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            if (bookings[i].image) {
                              bookings[i].user_image = settings.settings.site_url + bookings[i].image;
                            }
                            var bookdate = bookings[i].booking_date;
                            bookings[i].booking_date = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.date_format);
                            bookings[i].job_date = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.date_format);
                            bookings[i].booking_time = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.date_format + ',' + settings.settings.time_format);
                            if (bookings[i].booking_time) {
                              var a = moment(bookings[i].booking_time);
                              var b = moment(new Date());
                              bookings[i].job_time = library.timeDifference(a, b);
                            } else {
                              bookings[i].job_time = '';
                            }
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



    controller.jobsList = function(req, res) {

      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('type', res.__('Enter valid Type')).notEmpty();
      req.checkBody('orderby', res.__('Enter valid order')).optional();
      req.checkBody('sortby', res.__('Enter valid option')).optional();
      req.checkBody('from', res.__('Enter valid from date')).optional(); //yyyy-mm-dd hh:mm:ss
      req.checkBody('to', res.__('Enter valid to date')).optional(); //yyyy-mm-dd hh:mm:ss
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
      request.tasker_id = req.body.provider_id;
      //request.type = parseFloat(req.body.type) || 1;

      if (parseInt(req.body.type) == 2) {
        request.type = [2, 3, 4, 5];
      } else if (parseInt(req.body.type) == 4) {
        request.type = [6, 7];
      } else if (parseInt(req.body.type) == 5) {
        request.type = 8;
      } else {
        request.type = 1;
      }
      request.page = parseInt(req.body.page) || 1;
      request.perPage = parseInt(req.body.perPage) || 20;
      request.orderby = parseInt(req.body.orderby) || -1;
      request.sortby = req.body.sortby || 'createdAt';
      request.from = req.body.from + ' 00:00:00';
      request.to = req.body.to + ' 23:59:59';

      var sorting = {};
      if (request.sortby == 'name') {
        sorting[request.sortby] = 'user.username'
      } else if (request.sortby == 'date') {
        sorting[request.sortby] = 'createdAt'
      }
      sorting[request.sortby] = request.orderby;

      //  { $sort : { age : -1, posts: 1 } }


      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          db.GetOneDocument('tasker', {
            '_id': request.tasker_id
          }, {}, {}, function(err, tasker) {
            if (err || !tasker) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
              res.send(data);
            } else {
              var query = {
                'tasker': new mongoose.Types.ObjectId(req.body.provider_id),
                'status': {
                  "$in": request.type
                }
              };
              if (req.body.from && req.body.to) {
                query = {
                  'tasker': new mongoose.Types.ObjectId(req.body.provider_id),
                  'status': {
                    "$in": request.type
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
              db.GetCount('task', query, function(err, count) {
                if (err || count == 0) {
                  res.send(data);
                } else {
                  data.response.total_jobs = count;
                  db.GetAggregation('task', [{
                      $match: query
                    },
                    {
                      "$sort": sorting
                    },
                    {
                      "$lookup": {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "user"
                      }
                    },
                    {
                      "$lookup": {
                        from: "categories",
                        localField: "category",
                        foreignField: "_id",
                        as: "category"
                      }
                    },
                    {
                      $unwind: "$user"
                    },
                    {
                      $unwind: "$category"
                    },
                    {
                      "$skip": (request.perPage * (request.page - 1))
                    },
                    {
                      "$limit": request.perPage
                    }
                  ], function(err, bookings) {
                    if (err || bookings.length == 0) {
                      res.send(data);
                    } else {

                      for (var i = 0; i < bookings.length; i++) {
                        var job = {};
                        if (bookings[i].user) {
                          if (bookings[i].user.username) {
                            job.user_name = bookings[i].user.username;
                          } else {
                            job.user_name = "Unknown";
                          }
                          if (bookings[i].user.avatar) {
                            job.user_image = settings.settings.site_url + bookings[i].user.avatar;
                          } else {
                            job.user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                          }
                        }
                        job.job_id = bookings[i].booking_id;
                        switch (bookings[i].status) {
                          case 1:
                            request.job_status = 'Request Sent';
                            request.btn_group = 1;

                            break;
                          case 2:
                            request.job_status = 'Accepted';
                            request.btn_group = 2;
                            break;
                          case 3:
                            request.job_status = 'Started Off';
                            request.btn_group = 3;
                            break;
                          case 4:
                            request.job_status = 'Arrived';
                            request.btn_group = 4;
                            break;
                          case 5:
                            request.job_status = 'Job Started';
                            request.btn_group = 5;
                            break;
                          case 6:
                            request.job_status = 'Payment Pending';
                            request.btn_group = 6;
                            break;
                          case 7:
                            request.job_status = 'Completed';
                            request.btn_group = 7;
                            break;
                          case 8:
                            request.job_status = 'Cancelled';
                            request.btn_group = 8;
                            break;
                          case 9:
                            request.job_status = 'Dispute';
                            request.btn_group = 9;
                            break;
                          default:
                            request.job_status = 'Onprogress';
                            break;
                        }
                        job.job_status = request.job_status;
                        job.btn_group = request.btn_group;
                        job.category_name = bookings[i].category.name || '';
                        job.location = bookings[i].booking_information.location || '';
                        job.exactaddress = bookings[i].task_address.exactaddress || '';
                        job.service_address = bookings[i].service_address || '';
                        job.location_lat = bookings[i].task_address.lat || '';
                        job.location_lng = bookings[i].task_address.lng || '';

                        if (bookings[i].booking_information.est_reach_date) {
                          var a = moment(bookings[i].booking_information.est_reach_date);
                          var b = moment(new Date());
                          job.job_time = library.timeDifference(a, b);
                        } else {
                          job.job_time = '';
                        }
                        if (bookings[i].booking_information.booking_date) {
                          job.booking_time = timezone.tz(bookings[i].booking_information.booking_date, settings.settings.time_zone).format(settings.settings.date_format + ', ' + settings.settings.time_format);
                        } else {
                          job.booking_time = '';
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


    controller.viewJob = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('job_id', res.__('Invalid Job Info')).notEmpty();

      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      req.sanitizeBody('provider_id').trim();
      var request = {};
      request.provider_id = req.body.provider_id;
      request.job_id = req.body.job_id;
	  request.timelineArr = [{
          'key': 'job_booking_time',
          'value': 'New Request'
        },
        {
          'key': 'provider_assigned',
          'value': 'Job Accepted'
        },
        {
          'key': 'provider_start_off_time',
          'value': CONFIG.NOTIFICATION.PROVIDER_START_OFF_FROM_HIS_LOCATION
        },
        {
          'key': 'location_arrived_time',
          'value': 'Reached Job Location'
        },
        {
          'key': 'job_started_time',
          'value': 'Job Started'
        },
        {
          'key': 'job_completed_time',
          'value': 'Job Completed'
        },
        {
          'key': 'job_closed_time',
          'value': CONFIG.NOTIFICATION.JOB_HAS_BEEN_CLOSED
        },
        {
          'key': 'job_cancellation_time',
          'value': CONFIG.NOTIFICATION.JOB_HAS_BEEN_CANCELLED
        }
      ];

      async.waterfall([
        function(callback) {
          db.GetOneDocument('tasker', {
            '_id': request.provider_id
          }, {}, {}, function(err, tasker) {
            if (err || !tasker) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
              res.send(data);
            } else {
              callback(err, tasker);
            }
          });
        },
        function(tasker, callback) {
          db.GetAggregation('review', [{
            $match: {
              tasker: new mongoose.Types.ObjectId(request.provider_id)
            }
          }, {
            $group: {
              _id: '$tasker',
              total: {
                $avg: '$rating'
              }
            }
          }], function(err, ratings) {
            if (err || ratings.length == 0) {
              callback(err, tasker, 0);
            } else {
              callback(err, tasker, ratings[0].total);
            }
          });
        },
        function(tasker, ratings, callback) {
          var extension = {};
          extension.populate = 'user category';
          db.GetOneDocument('task', {
            'booking_id': request.job_id
          }, {}, extension, function(err, task) {

            if (err || !task) {
              data.response = res.__('Jobs Not Available');
              res.send(data);
            } else {
              callback(err, tasker, ratings, task);
            }
          });
        },
        function(tasker, ratings, task, callback) {
          db.GetOneDocument('settings', {
            'alias': 'general'
          }, {}, {}, function(err, settings) {
            if (err || !settings) {
              data.response = res.__('Jobs Not Available');
              res.send(data);
            } else {
              callback(err, tasker, ratings, task, settings);
            }
          });
        },
        function(tasker, ratings, task, settings, callback) {
          db.GetOneDocument('currencies', {
            'default': 1
          }, {}, {}, function(err, currencies) {
            if (err || !currencies) {
              data.response = res.__('Jobs Not Available');
              res.send(data);
            } else {
              callback(err, tasker, ratings, task, settings, currencies);
            }
          });
        },
        function(tasker, ratings, task, settings, currencies, callback) {
          db.GetCount('review', {
            'tasker': new mongoose.Types.ObjectId(request.provider_id),
            type: 'tasker',
            'task': tasker._id
          }, function(err, count) {
            if (err) {
              data.response = res.__('Jobs Not Available');
              res.send(data);
            } else {
              callback(err, tasker, ratings, task, settings, currencies, count);
            }
          });
        },
        function(tasker, ratings, task, settings, currencies, count, callback) {
          db.GetCount('review', {
            'tasker': new mongoose.Types.ObjectId(request.provider_id),
            type: 'tasker',
            'task': task._id
          }, function(err, count) {
            if (err) {
              data.response = res.__('Jobs Not Available');
              res.send(data);
            } else {
              callback(err, tasker, ratings, task, settings, currencies, count, count);
            }
          });
        }
      ], function(err, tasker, ratings, task, settings, currencies, count) {
        if (task.status == 2) {
          if (task.mobile_status) {
            task.status = task.mobile_status;
          }
        }
        switch (task.status.toString()) {
          case '1':
          request.status = 'New Lead';
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

        var address = ''
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

        data.status = '1';
        data.response = {};
        data.response.job = {};
        data.response.job.billing = [];
        data.response.job.job_id = task.booking_id;
        data.response.job.currency = 'usd';

        if(task.invoice) {

          if (task.invoice.worked_hours_human) {
            var response = {
              'title': 'Total Hours Worked',
              'dt': '0',
              'amount': task.invoice.worked_hours_human
            };
            data.response.job.billing.push(response);
          }

          if (task.invoice.amount.total) {
            var calc = task.invoice.amount.total;
            var response = {
              'title': 'Task amount',
              'dt': '1',
              'amount': (calc * currencies.value).toFixed(2)
            };
            data.response.job.billing.push(response);
          }

          if (task.invoice.amount.admin_commission) {
            var response = {
              'title': 'HFA commission',
              'dt': '1',
              'amount': (task.invoice.amount.admin_commission * currencies.value).toFixed(2)
            };
            data.response.job.billing.push(response);
          }

          if (task.invoice.amount.extra_amount) {
            var billing = {
              'title': 'Material amount',
              'dt': '1',
              'amount': (task.invoice.amount.extra_amount * currencies.value).toFixed(2)
            };
            data.response.job.billing.push(billing);
          }

          if (task.invoice.amount.total) {
            if(task.invoice.amount.extra_amount > 0) {
              var amount_final = task.invoice.amount.total + task.invoice.amount.extra_amount - task.invoice.amount.admin_commission;
              var response = {
              'title': 'Your Earnings',
              'dt': '1',
              'amount': (amount_final * currencies.value).toFixed(2)
              };
              data.response.job.billing.push(response);
            } else {
              var amount_final = task.invoice.amount.total - task.invoice.amount.admin_commission;
              var response = {
              'title': 'Your Earnings',
              'dt': '1',
              'amount': (amount_final * currencies.value).toFixed(2)
              };
              data.response.job.billing.push(response);
            }
          }

          if (task.payment_type) {
            var response = {
              'title': 'Payment mode',
              'dt': '0',
              'amount': task.payment_type
            };
            data.response.job.billing.push(response);
          }
        }

		console.log("billingggggg", data.response.job.billing);

        if (task.booking_information.booking_date) {
          data.response.job.job_date = timezone.tz(task.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.date_format);
        } else {
          data.response.job.job_date = '';
        }
        if (task.booking_information.booking_date) {
          var a = timezone.tz(task.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.time_format);
          var b = timezone.tz(task.booking_information.booking_date, settings.settings.time_zone).add(1, 'hour').format(settings.settings.time_format);
          data.response.job.job_time = a /*  + '-' + b */ ;
        } else {
          data.response.job.job_time = '';
        }
        var instruc = task.booking_information.instruction;
        data.response.job.job_type = task.category.name || '';

        data.response.job.currency_code = currencies.code;

        data.response.job.instruction = htmlToText.fromString(instruc) || '';
        data.response.job.job_status = task.status;
        if (task.user) {
          data.response.job.user_name = task.user.username;
          data.response.job.user_id = task.user._id;
        } else {
          data.response.job.user_name = "";
          data.response.job.user_id = "";
        }

        if (task.user) {
          if (task.user.avatar) {
            data.response.job.user_image = settings.settings.site_url + task.user.avatar;
          } else {
            data.response.job.user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
          }
        } else {
          data.response.job.user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
        }
        data.response.job.user_ratings = ratings;
        data.response.job.user_email = task.user ? task.user.email : "";
        data.response.job.task_id = task._id || "";



        if (task.user && task.user.phone) {
          data.response.job.user_mobile = task.user.phone.code + task.user.phone.number;
        } else {
          data.response.job.user_mobile = '';
        }
        data.response.job.distance_by = settings.settings.distanceby;
        data.response.job.job_location = address;
        data.response.job.exactaddress = task.task_address.exactaddress;
        data.response.job.service_address = task.service_address;

        data.response.job.location_lat = task.location.lat.toString();
        data.response.job.location_lon = task.location.log.toString();
        if (task.cancellation && task.cancellation != 'undefined') {
          data.response.job.cancelreason = task.cancellation.reason;
        }

        data.response.job.btn_group = request.btn_group;
        data.response.job.status = request.status;
        var val = 0;
        if (settings.settings.pay_by_cash.status == 1) {
          val = 1;
        }
        data.response.job.cash_option = val;

        if (!count) {
          var review = 'Yes'; //1
        } else {
          review = 'No'; //0
        }
        data.response.job.submit_ratings = review;
		data.response.timeline = [];
		var newData = JSON.stringify(task.history);
		var tempData = JSON.parse(newData);
		for (var i = 0; i < request.timelineArr.length; i++) {
		var timeline = {};
		if (request.timelineArr[i].key in tempData) {
		  timeline.title = request.timelineArr[i].value;
		  if (task.history[request.timelineArr[i].key]) {
			timeline.date = timezone.tz(task.history[request.timelineArr[i].key], settings.settings.time_zone).format(settings.settings.date_format) || '';
			timeline.time = timezone.tz(task.history[request.timelineArr[i].key], settings.settings.time_zone).format(settings.settings.time_format) || '';
		  } else {
			timeline.date = '';
			timeline.time = '';
		  }
		  timeline.check = '1';
		}
		data.response.timeline.push(timeline);
		}
      console.log("data.response.job.btn_group", data.response.job.btn_group);
        res.send(data);
      });
    }

    controller.providerRating = function(req, res) {

      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      var request = {};
      request.provider_id = req.body.provider_id;
      request.page = req.body.page || 1;
      request.perPage = req.body.perPage || 20;
      async.waterfall([
        function(callback) {
          db.GetOneDocument('tasker', {
            '_id': request.provider_id
          }, {}, {}, function(err, tasker) {
            if (err || !tasker) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
              res.send(data);
            } else {
              callback(err, tasker);
            }
          });
        },
        function(tasker, callback) {
          db.GetAggregation('review', [{
              $match: {
                tasker: new mongoose.Types.ObjectId(request.provider_id)
              }
            },
            {
              $group: {
                _id: '$tasker',
                average: {
                  $avg: '$rating'
                },
                total: {
                  $sum: 1
                }
              }
            }
          ], function(err, ratings) {
            if (err || !ratings) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
              res.send(data);
            } else {
              callback(err, tasker, ratings);

            }
          });
        },
        function(tasker, ratings, callback) {
          var extension = {};
          extension.options = {
            limit: parseInt(request.perPage),
            skip: request.perPage * (request.page - 1)
          };
          extension.populate = 'user task';
          db.GetDocument('review', {
            'tasker': request.provider_id,
            'type': 'user'
          }, {}, extension, function(err, reviews) {
            if (err || !reviews) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
              res.send(data);
            } else {
              callback(err, tasker, ratings, reviews);

            }
          });
        },
        function(tasker, ratings, reviews, callback) {
          db.GetOneDocument('settings', {
            'alias': 'general'
          }, {}, {}, function(err, settings) {
            if (err) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
              res.send(data);
            } else {
              callback(err, tasker, ratings, reviews, settings);
            }
          });
        }
      ], function(err, tasker, ratings, reviews, settings) {
        data.status = '1';
        data.response = {};
        data.response.current_page = request.page;
        data.response.perPage = request.perPage;
        if (ratings[0]) {
          data.response.total_review = ratings[0].total.toString() || "0";
          data.response.avg_review = ratings[0].average.toString() || "0";
        }
        data.response.rated_users = [];



        for (var i = 0; i < reviews.length; i++) {
          var rated_users = {};
          //rated_users.job_id = reviews[i].task.booking_id;

          if (reviews[i].user) {
            //

            rated_users.user_name = reviews[i].user.username;

            if (reviews[i].user.avatar) {
              rated_users.user_image = settings.settings.site_url + reviews[i].user.avatar;
            } else {
              rated_users.user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
            }
          }

          if (reviews[i].image) {
            rated_users.ratting_image = settings.settings.site_url + reviews[i].image;
          } else {
            rated_users.ratting_image = '';
          }

          if (reviews[i].comments) {
            rated_users.comments = reviews[i].comments || '';
          } else {
            rated_users.comments = '';
          }

          rated_users.ratings = reviews[i].rating ? reviews[i].rating.toString() : '0';
          if (reviews[i].task) {
            rated_users.desc = reviews[i].task.task_description || '';
          } else {
            rated_users.desc = '';
          }
          if (reviews[i].createdAt) {
            var a = timezone.tz(reviews[i].createdAt, settings.settings.time_zone).format(settings.settings.date_format);
            var b = timezone.tz(reviews[i].createdAt, settings.settings.time_zone).format(settings.settings.time_format);
            // var b = timezone.tz(reviews[i].createdAt, settings.settings.time_zone).add(1, 'hour').format(settings.settings.time_format);
            rated_users.rating_time = a /*  + '-' + b */ ;
            // rated_users.rating_time = moment(new Date(reviews[i].createdAt)).format('hh:mm A') + ' - ' + moment(new Date(reviews[i].createdAt)).add(1, 'hour').format('hh:mm A');
          } else {
            rated_users.rating_time = '';
          }
          data.response.rated_users.push(rated_users);

        }
        if (reviews.length > 0) {
          res.send(data);
        } else {
          res.send({
            "status": "0",
            "message": res.__('You Have Not Received Any Reviews Yet')
          });
        }

      });
    }

    controller.jobsStats = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      req.sanitizeBody('provider_id').trim();
      var request = {};
      request.provider_id = req.body.provider_id;
      db.GetOneDocument('task', {
        'tasker': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('No task available to show statistics');
          res.send(data);
        } else {
          async.parallel({
            TotalJobs: function(callback) {
              db.GetCount('task', { 'tasker': request.provider_id , $and : [{'status' : {'$ne' : 1}} , {'status' :{'$ne' : 11}},{'status' : {'$ne' : 0}}] }, function (err, count) {
                if (err || count == 0) {
                  var count = 0;
                  callback(err, count);
                } else {
                  callback(err, count);
                }
              });
            },
            ClosedJobs: function(callback) {
              db.GetCount('task', {
                'tasker': request.provider_id,
                'status': {
                  '$in': [6, 7]
                }
              }, function(err, count) {
                if (err || count == 0) {
                  var count = 0;
                  callback(err, count);
                } else {
                  callback(err, count);
                }
              });
            },
            OngoingJobs: function(callback) {
              db.GetCount('task', {
                'tasker': request.provider_id,
                'status': {
                  '$in': [2, 3, 4, 5]
                }
              }, function(err, count) {
                if (err || count == 0) {
                  var count = 0;
                  callback(err, count);
                } else {
                  callback(err, count);
                }
              });
            },
            UserCancelledJobs: function(callback) {
              db.GetCount('task', {
                'tasker': request.provider_id,
                'status': 8,
                $or: [{ 'cancellation': {$exists : false} }, { 'cancellation.type': 'user' }]
              }, function(err, count) {
                if (err || count == 0) {
                  var count = 0;
                  callback(err, count);
                } else {
                  callback(err, count);
                }
              });
            },
            CancelledMyselfJobs: function(callback) {
              db.GetCount('task', {
                'tasker': request.provider_id,
                'status': 8,
                'cancellation.type': 'tasker'
              }, function(err, count) {
                if (err || count == 0) {
                  var count = 0;
                  callback(err, count);
                } else {
                  callback(err, count);
                }
              });
            },
            MyJobs: function(callback) {
              db.GetCount('task', {
                'tasker': request.provider_id
              }, function(err, count) {
                if (err || count == 0) {
                  var count = 0;
                  callback(err, count);
                } else {
                  callback(err, count);
                }
              });
            }
          }, function(err, result) {
            if (err || !result) {
              data.response = res.__('Your Records are Currently not Available');
              res.send(data);
            } else {
              var MyJobs = result.TotalJobs;
              var manipulation = {};
              manipulation.TotalJobsRatio = '0';
              manipulation.ClosedJobsRatio = '0';
              manipulation.OngoingJobsRatio = '0';
              manipulation.UserCancelledJobsRatio = '0';
              manipulation.CancelledMyselfJobsRatio = '0';
              if (result.TotalJobs > 0) {
                manipulation.TotalJobsRatio = ((result.TotalJobs * 100) / result.TotalJobs);
              }
              if (result.ClosedJobs > 0) {
                manipulation.ClosedJobsRatio = ((result.ClosedJobs / MyJobs) * 100);
              }
              if (result.OngoingJobs > 0) {
                manipulation.OngoingJobsRatio = ((result.OngoingJobs / MyJobs) * 100);
              }
              if (result.UserCancelledJobs > 0) {
                manipulation.UserCancelledJobsRatio = ((result.UserCancelledJobs / MyJobs) * 100);
              }
              if (result.CancelledMyselfJobs > 0) {
                manipulation.CancelledMyselfJobsRatio = ((result.CancelledMyselfJobs / MyJobs) * 100);
              }
              data.status = '1';
              data.response = {};
              data.response.jobs = [];
              data.response.jobs.push({
                'title': 'Total Jobs',
                'jobs_count': result.TotalJobs.toString(),
                'ratio': manipulation.TotalJobsRatio.toString()
              });
              data.response.jobs.push({
                'title': 'Completed Jobs',
                'jobs_count': result.ClosedJobs.toString(),
                'ratio': manipulation.ClosedJobsRatio.toString()
              });
              data.response.jobs.push({
                'title': 'Ongoing Jobs',
                'jobs_count': result.OngoingJobs.toString(),
                'ratio': manipulation.OngoingJobsRatio.toString()
              });
              data.response.jobs.push({
                'title': 'User Cancelled',
                'jobs_count': result.UserCancelledJobs.toString(),
                'ratio': manipulation.UserCancelledJobsRatio.toString()
              });
              data.response.jobs.push({
                'title': 'Cancelled Myself',
                'jobs_count': result.CancelledMyselfJobs.toString(),
                'ratio': manipulation.CancelledMyselfJobsRatio.toString()
              });
              res.send(data);
            }
          });
        }
      });
    }

    controller.acceptJob = function(req, res) {
      //validation
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('job_id', res.__('Invalid Job Info')).notEmpty();
      req.checkBody('provider_lat', res.__('Please Enter Valid Latitude')).notEmpty();
      req.checkBody('provider_lon', res.__('Please Enter Valid Longitude')).notEmpty();
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

      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('job_id').trim();
      req.sanitizeBody('provider_lat').trim();
      req.sanitizeBody('provider_lon').trim();

      var request = {};
      request.provider_id = req.body.provider_id;
      request.job_id = req.body.job_id;
      request.provider_lat = req.body.provider_lat;
      request.provider_lon = req.body.provider_lon;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          var extension = {};
          extension.populate = {
            path: 'user category tasker'
          };
          db.GetOneDocument('task', {
            'booking_id': request.job_id
          }, {}, extension, function(err, bookings) {
            if (err || !bookings) {
              data.response = res.__("Jobs Not Available");
              res.send(data);
            } else {

              db.GetOneDocument('task', {
                'task_date': bookings.task_date,
                'tasker': request.provider_id,
                'task_hour': bookings.task_hour,
                'status': {
                  '$in': [2, 3, 4, 5]
                }
              }, {}, {}, function(err, existingbookings) {
                if (existingbookings) {
                  data.status = 0;
                  data.response = res.__("You Cannot accept More than one task for a session");
                  res.send(data);
                } else {
                  if (bookings.status == 1) {
                    request.est_reach_time = new Date().getTime();
                    //request.base_cost = { 'service_tax': 0, 'min_cost': 0 };
                    request.history = {};
                    request.history.job_booking_time = bookings.createdAt;
                    request.history.provider_assigned = new Date();

                    request.jobDetails = {};
                    request.jobDetails.status = 2;
                    request.jobDetails.tasker = provider._id;
                    request.jobDetails.history = request.history;
                    var currentdate = moment(Date.now()).format('MM/DD/YYYY');

                    async.parallel({
                      settings: function(callback) {
                        db.GetOneDocument('settings', {
                          'alias': 'general'
                        }, {}, {}, function(err, response) {
                          if (err || response) {
                            callback(err, response);
                          } else {
                            callback(err, response);
                          }
                        });
                      },
                      booking: function(callback) {
                        db.UpdateDocument('task', {
                          'booking_id': request.job_id
                        }, request.jobDetails, {}, function(err, response) {
                          if (err || response) {
                            callback(err, response);
                          } else {
                            callback(err, response);
                          }
                        });
                      },
                      providers: function(callback) {
                        // if (bookings.bookingmode == "booknow") {
                        db.UpdateDocument('tasker', {
                          '_id': request.provider_id
                        }, {
                          'mode': 'Booked',
                          'current_task': bookings._id,
                          'current_task_date': currentdate,
                          'current_task_hour': bookings.task_hour
                        }, {}, function(err, response) {
                          if (err || response) {
                            callback(err, response);
                          } else {
                            callback(err, response);
                          }
                        });
                        // }
                        // else {
                        //     callback(null, '');
                        // }
                      },
                      UserReview: function(callback) {
                        if (bookings.user._id) {
                          db.GetAggregation('review', [{
                              $match: {
                                user: new mongoose.Types.ObjectId(bookings.user._id),
                                type: 'user'
                              }
                            },
                            {
                              $group: {
                                _id: '$user',
                                total: {
                                  $avg: '$rating'
                                }
                              }
                            }
                          ], function(err, UserReview) {
                            if (err || UserReview[0]) {
                              callback(err, UserReview[0]);
                            } else {
                              callback(err, UserReview[0]);
                            }
                          });
                        } else {
                          callback(null, '');
                        }
                      },
                      TaskerReview: function(callback) {
                        db.GetAggregation('review', [{
                            $match: {
                              tasker: new mongoose.Types.ObjectId(request.provider_id),
                              type: 'tasker'
                            }
                          },
                          {
                            $group: {
                              _id: '$tasker',
                              total: {
                                $avg: '$rating'
                              }
                            }
                          }
                        ], function(err, TaskerReview) {
                          if (err || TaskerReview[0]) {
                            callback(err, TaskerReview[0]);
                          } else {
                            callback(err, TaskerReview[0]);
                          }
                        });
                      }
                    }, function(err, result) {
                      if (err) {
                        data.response = res.__('You Cannot Cancel this Job Right Now. Please try again later.');
                        res.send(data);
                      } else {
                        if (result.TaskerReview) {
                          var TaskerReview = result.TaskerReview.total;
                        } else {
                          var TaskerReview = 0;
                        }

                        if (provider.avatar) {
                          request.image = result.settings.settings.site_url + provider.avatar;
                        } else {
                          request.image = result.settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                        }
                        request.provider_profile = {};
                        request.provider_profile.job_id = request.job_id;
                        request.provider_profile.provider_id = provider._id;
                        request.provider_profile.provider_name = provider.username;
                        request.provider_profile.provider_email = provider.email;
                        request.provider_profile.provider_image = request.image;
                        request.provider_profile.provider_review = TaskerReview.toString();
                        request.provider_profile.provider_lat = request.provider_lat;
                        request.provider_profile.provider_lon = request.provider_lon;
                        request.provider_profile.min_reach_duration = '';
                        request.provider_profile.phone_number = provider.phone.number;

                        if (bookings.user.avatar) {
                          request.userimage = result.settings.settings.site_url + bookings.user.avatar;
                        } else {
                          request.userimage = result.settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                        }

                        if (result.UserReview) {
                          var UserReview = result.UserReview.total;
                        } else {
                          var UserReview = 0;
                        }
                        request.user_profile = {};
                        request.user_profile.user_name = bookings.user.user_name;
                        request.user_profile.user_email = bookings.user.email;
                        request.user_profile.phone_number = bookings.user.phone.code + bookings.user.phone.number;
                        request.user_profile.user_image = request.userimage;
                        request.user_profile.user_review = UserReview.toString();
                        request.user_profile.job_id = request._id;
                        request.user_profile.job_location = bookings.booking_information.location;

                        if (bookings.booking_information.user_latlong.lat && bookings.booking_information.user_latlong.lon) {
                          request.user_profile.job_lat = {
                            'value': bookings.booking_information.user_latlong.lat.toString()
                          };
                          request.user_profile.job_lon = {
                            'value': bookings.booking_information.user_latlong.lon.toString()
                          };
                        }

                        // request.user_profile.job_time = moment(new Date(bookings.booking_information.est_reach_date)).format('hh:mm A Do MMM, YYYY');
                        request.user_profile.job_time = timezone.tz(bookings.booking_information.est_reach_date, result.settings.settings.time_zone).format(result.settings.settings.date_format + ',' + result.settings.settings.time_format) || '';


                        var message = provider.username +' accepted your job';
                        var options = {
                          'job_id': bookings.booking_id,
                          'user_id': bookings.user._id
                        };
                        push.sendPushnotification(bookings.user._id, message, 'job_accepted', 'ANDROID', options, 'USER', function(err, response, body) {
                          console.log("errerr", err)
                          console.log("response", response)
                        });


                        var job_date = timezone.tz(bookings.booking_information.booking_date, result.settings.settings.time_zone).format(result.settings.settings.date_format);
                        var mail_job_time = timezone.tz(bookings.booking_information.booking_date, result.settings.settings.time_zone).format(result.settings.settings.time_format);

                        var mailData = {};
                        mailData.template = 'Taskselected';
                        mailData.to = bookings.user.email;
                        mailData.html = [];
                        mailData.html.push({ name: 'username', value: bookings.user.username });
                        mailData.html.push({ name: 'taskername', value: bookings.tasker.username });

                        mailcontent.sendmail(mailData, function (err, response) {});

                        data.status = '1';
                        data.response = {};
                        data.response.user_profile = request.user_profile;
                        data.response.message = 'Job Accepted';
                        data.response.btn_group = '2';
                        res.send(data);
                      }
                    });
                  } else {
                    data.response = res.__('You are too late, this job has been hired.');
                    res.send(data);
                  }
                }
              });
            }
          });
        }
      });
    }



    controller.updateAvailability = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('availability', res.__('Please Select Your Availability')).notEmpty();
      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      req.sanitizeBody('provider_id').trim();
      req.sanitizeBody('availability').trim();
      var request = {};
      request.provider_id = req.body.provider_id;
      request.availability = req.body.availability;
      db.UpdateDocument('tasker', {
        '_id': request.provider_id
      }, {
        'availability': request.availability,
        'activity.last_active_time': new Date()
      }, {}, function(err, response) {
        if (err || response.nModified == 0) {
          data.response = res.__('Invalid ' + CONFIG.TASKER);
          res.send(data);
        } else {
          data.status = '1';
          data.response = res.__('Availability Updated');
          res.send(data);
        }
      });
    }

    controller.getAvailability = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      req.sanitizeBody('provider_id').trim();
      var request = {};
      request.provider_id = req.body.provider_id;
      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {
        'availability': 1
      }, {}, function(err, response) {
        if (err || !response) {
          data.response = res.__('Invalid ' + CONFIG.TASKER);
          res.send(data);
        } else {
          data.status = response.status;
          data.availability = response.availability;
          res.send(data);
        }
      });
    }


    controller.startOff = function(req, res) {

      //validation
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('job_id', res.__('Enter Valid Job Info')).notEmpty();
      req.checkBody('provider_lon', res.__('Enter Valid ' + CONFIG.TASKER + '_lng')).notEmpty();
      req.checkBody('provider_lat', res.__('Enter Valid ' + CONFIG.TASKER + '_lat')).notEmpty();
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
      request.provider_id = req.body.provider_id;
      request.job_id = req.body.job_id;

      request.provider_lng = req.body.provider_lon;
      request.provider_lat = req.body.provider_lat;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          var extension = {};
          extension.populate = {
            path: 'user'
          };
          db.GetOneDocument('task', {
            'booking_id': request.job_id
          }, {}, extension, function(err, bookings) {
            if (err || !bookings) {
              data.response = res.__("Jobs Not Available");
              res.send(data);
            } else {
              if (bookings.status == 2) {
                db.UpdateDocument('task', {
                  'booking_id': request.job_id
                }, {
                  'status': 3,
                  'history.provider_start_off_time': new Date()
                }, {}, function(err, response) {

                  if (err || response.nModified == 0) {
                    data.response = res.__('Jobs Not Available, Unable to update your data');
                    res.send(data);
                  } else {
                    db.UpdateDocument('tasker', {
                      '_id': request.provider_id
                    }, {
                      'provider_location.provider_lng': request.provider_lng,
                      'provider_location.provider_lat': request.provider_lat
                    }, {}, function(err, response) {
                      if (err || response.nModified == 0) {
                        data.response = res.__('Unable to update your data');
                        res.send(data);
                      } else {
                        db.GetOneDocument('settings', {
                          'alias': 'general'
                        }, {}, {}, function(err, settings) {
                          if (err) {
                            res.send({
                              "status": "0",
                              "response": res.__("Error in settings")
                            });
                          } else {

                            var message = provider.username +' is arriving soon in your location';
                            var options = {
                              'job_id': bookings.booking_id,
                              'user_id': bookings.user._id
                            };

                            push.sendPushnotification(bookings.user._id, message, 'start_off', 'ANDROID', options, 'USER', function(err, response, body) {});

                            var job_date = timezone.tz(bookings.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.date_format);
                            var mail_job_time = timezone.tz(bookings.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.time_format);

                            data.status = '1';
                            data.response = {};
                            data.response.message = 'Your current status Updated';
                            data.response.btn_group = '3';
                            res.send(data);
                          }
                        });
                      }
                    });

                  }
                });
              } else {
                data.response = res.__('You cannot do any action in this job right now.');
                res.send(data);
              }
            }
          });
        }
      });
    };

    controller.arrived = function(req, res) {

      //validation
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('job_id', res.__('Enter Valid Job Info')).notEmpty();
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
      request.provider_id = req.body.provider_id;
      request.job_id = req.body.job_id;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          var extension = {};
          extension.populate = {
            path: 'user tasker'
          };
          db.GetOneDocument('task', {
            'booking_id': request.job_id
          }, {}, extension, function(err, bookings) {

            if (err || !bookings) {
              data.response = res.__("Jobs Not Available");
              res.send(data);
            } else {

              db.GetOneDocument('settings', {
                'alias': 'general'
              }, {}, {}, function(err, settings) {
                if (err) {
                  res.send({
                    "status": "0",
                    "response": res.__("please check " + CONFIG.TASKER + " id")
                  });
                } else {

                  if (bookings.status == 3) {
                    db.UpdateDocument('task', {
                      'booking_id': request.job_id
                    }, {
                      'status': 4,
                      'history.location_arrived_time': new Date()
                    }, {}, function(err, response) {
                      if (err || response.nModified == 0) {
                        data.response = 'Jobs Not Available, Unable to update your data';
                        res.send(data);
                      } else {
                        var message = provider.username +' arrived on your location';
                        var options = {
                          'job_id': bookings.booking_id,
                          'user_id': bookings.user._id
                        };
                        push.sendPushnotification(bookings.user._id, message, 'provider_reached', 'ANDROID', options, 'USER', function(err, response, body) {

                        });

                        data.status = '1';
                        data.response = {};
                        data.response.message = res.__('Your current status Updated');
                        data.response.btn_group = '4';
                        res.send(data);
                      }
                    });
                  } else {
                    data.response = res.__('You cannot do any action in this job right now.');
                    res.send(data);
                  }
                }
              });
            }
          });
        }
      });
    };

    controller.startJob = function(req, res) {

      //validation
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('job_id', res.__('Enter Valid Job Info')).notEmpty();
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
      request.provider_id = req.body.provider_id;
      request.job_id = req.body.job_id;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          var extension = {};
          extension.populate = {
            path: 'user'
          };
          db.GetOneDocument('task', {
            'booking_id': request.job_id
          }, {}, extension, function(err, bookings) {
            if (err || !bookings) {
              data.response = res.__("Jobs Not Available");
              res.send(data);
            } else {

              db.GetOneDocument('settings', {
                'alias': 'general'
              }, {}, {}, function(err, settings) {
                if (err) {
                  res.send({
                    "status": "0",
                    "response": res.__("Error in settings")
                  });
                } else {
                  //var bookTime = new Date(bookings.booking_information.booking_date).getTime();
                  //var timeNow = new Date().getTime();
                  var bookTime = new Date(bookings.booking_information.booking_date);
                  var timeNow = new Date();



                  /*var formatedDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
                  var job_started_time = timezone.tz(formatedDate, settings.settings.time_zone);*/
                  var job_started_time = timezone.tz(new Date(), settings.settings.time_zone).utc().format();
                  //(bookTime < timeNow) &&
                  if (bookings.status == 4) {
                    db.UpdateDocument('task', {
                      'booking_id': request.job_id
                    }, {
                      'status': 5,
                      'history.job_started_time': job_started_time
                    }, {}, function(err, response) {
                      if (err || response.nModified == 0) {
                        data.response = res.__('Jobs Not Available, Unable to update your data');
                        res.send(data);
                      } else {



                        var message = provider.username + ' has started your job.';
                        var options = {
                          'job_id': bookings.booking_id,
                          'user_id': bookings.user._id
                        };
                        push.sendPushnotification(bookings.user._id, message, 'job_started', 'ANDROID', options, 'USER', function(err, response, body) {});

                        var job_date = timezone.tz(bookings.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.date_format);
                        var mail_job_time = timezone.tz(bookings.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.time_format);

                        data.status = '1';
                        data.response = {};
                        data.response.message = res.__('Your current status Updated');
                        data.response.btn_group = '5';
                        res.send(data);
                      }
                    });
                  } else {
                    res.send({
                      'status': 0,
                      'response': res.__('You cannot start this job right now')
                    });
                  }
                }
              });
            }
          });
        }
      });
    };

    controller.completejob = function(req, res) {
      //validation
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('job_id', res.__('Enter Valid Job Info')).notEmpty();
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
      request.provider_id = req.body.provider_id;
      request.job_id = req.body.job_id;

      db.GetOneDocument('task', {
        'booking_id': request.job_id
      }, {}, {}, function(err, task) {
        if (err || !task) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          taskLibrary.completeTask({
            'task': task._id,
            'request': req.body.miscellaneous
          }, function(err, response) {
            if (err || !response) {
              data.response = res.__('Jobs Not Available, Unable to update your data');
              res.send(data);
            } else {

              data.status = '1';
              data.response = {};
              data.response.message = res.__('Job has been completed successfully');
              data.response.provider_response = {};
              data.response.provider_response.need_payment = '1';
              data.response.provider_response.currency = response.currency.code;
              data.response.provider_response.job_summary = request.summary;
              data.response.provider_response.billing = [];
              data.response.btn_group = request.btn_group;
              data.response.btn_group = '6';

              if (response.invoice.amount.minimum_cost) {
                var key = {
                  'title': 'Minimum cost ' + response.currency.symbol + '(' + response.currency.code + ')',
                  'dt': '0',
                  'amount': (response.invoice.amount.minimum_cost * response.currency.value).toFixed(2)
                };
                data.response.provider_response.billing.push(key);
              }
              if (response.invoice.amount.task_cost) {
                var key = {
                  'title': 'Task cost per hour' + response.currency.symbol + '(' + response.currency.code + ')',
                  'dt': '0',
                  'amount': (response.invoice.amount.task_cost * response.currency.value).toFixed(2)
                };
                data.response.provider_response.billing.push(key);
              }
              if (response.invoice.worked_hours) {
                var key = {
                  'title': 'Hours Worked',
                  'dt': '0',
                  'amount': response.invoice.worked_hours_human
                };
                data.response.provider_response.billing.push(key);
              }
              if (response.invoice.amount.total) {
                var key = {
                  'title': 'Total cost ' + response.currency.symbol + '(' + response.currency.code + ')',
                  'dt': '0',
                  'amount': (response.invoice.amount.total * response.currency.value).toFixed(2)
                };
                data.response.provider_response.billing.push(key);
              }

              if (response.invoice.amount.admin_commission) {
                var key = {
                  'title': 'Admin commission (' + response.settings.admin_commission + '%) ' + response.currency.symbol + '(' + response.currency.code + ')',
                  'dt': '0',
                  'amount': (response.invoice.amount.admin_commission * response.currency.value).toFixed(2)
                };
                data.response.provider_response.billing.push(key);
              }

              if (response.invoice.amount.extra_amount) {
                var key = {
                  'title': 'Miscellaneous amount' + response.currency.symbol + '(' + response.currency.code + ')',
                  'dt': '0',
                  'amount': (response.invoice.amount.extra_amount * response.currency.value).toFixed(2)
                };
                data.response.provider_response.billing.push(key);
              }

              if (response.invoice.amount.grand_total) {
                var earnings = parseFloat(response.invoice.amount.grand_total - response.invoice.amount.admin_commission).toFixed(2);
                var lastearnings = parseFloat(earnings - response.invoice.amount.service_tax).toFixed(2);
                var key = {
                  'title': 'Grand Total' + response.currency.symbol + '(' + response.currency.code + ')',
                  'dt': '1',
                  'amount': (lastearnings * response.currency.value).toFixed(2)
                };
                data.response.provider_response.billing.push(key);
              }

              res.send(data);
            }
          });
        }
      });

    }

    controller.updateGeocode = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('latitude', res.__('Please Enter Valid Latitude')).notEmpty();
      req.checkBody('longitude', res.__('Please Enter Valid Longitude')).notEmpty();
      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      var request = {};
      request.provider_id = req.body.provider_id;
      request.longitude = req.body.longitude;
      request.latitude = req.body.latitude;
      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, providers) {
        if (err) {
          data.response = res.__('Invalid ' + CONFIG.TASKER);
          res.send(data);
        } else {
          if (providers) {
            var location = {
              'lon': request.longitude,
              'lat': request.latitude
            };
            db.UpdateDocument('tasker', {
              '_id': request.provider_id
            }, {
              'location.lng': request.longitude,
              'location.lat': request.latitude
            }, {}, function(err, response) {
              if (err || response.nModified == 0) {
                data.response = res.__('Invalid ' + CONFIG.TASKER + ', Unable to Save your data');
                res.send(data);
              } else {
                data.status = '1';
                data.response = {};
                data.response.message = res.__('Geo Location Updated');

                data.response.availability = 'Available';
                data.response.job_id = '';
              }
            });
          } else {
            data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your details');
            res.send(data);
          }
        }
      });
    }

    controller.missedJobs = function(req, res) {

      //validation
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('type', res.__('Enter valid Type')).optional();
      req.checkBody('page', res.__('Enter Page Info')).optional();
      req.checkBody('perPage', res.__('Enter Perpage Info')).optional();
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
      request.provider_id = req.body.provider_id;
      request.type = req.body.type;
      request.page = req.body.page || 1;
      request.perPage = req.body.perPage || 20;

      request.orderby = parseInt(req.body.orderby) || -1;
      request.sortby = req.body.sortby || 'createdAt';
      if (request.sortby == 'name') {
        request.sortby = 'user.username'
      } else if (request.sortby == 'date') {
        request.sortby = 'createdAt'
      }
      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          var sorting = {};
          sorting[request.sortby] = request.orderby;

          db.GetOneDocument('tasker', {
            '_id': request.provider_id
          }, {}, {}, function(err, provider) {
            if (err || !provider) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
              res.send(data);
            } else {

              data.status = '1';
              data.response = {};
              data.response.current_page = 0;
              data.response.next_page = 0;
              data.response.perPage = 0;
              data.response.total_jobs = 0;
              data.response.jobs = [];

              var extension = {};
              extension.options = {
                limit: parseInt(request.perPage),
                skip: request.perPage * (request.page - 1)
              };
              extension.populate = {
                path: 'user'
              };
              extension.sort = sorting;

              db.GetCount('task', {
                'tasker': {
                  $ne: request.provider_id
                },
                status: {
                  '$in': [1, 2]
                }
              }, function(err, count) {
                if (err || count <= 0) {
                  res.send(data);
                } else {
                  db.GetDocument('task', {
                    'tasker': {
                      $ne: request.provider_id
                    },
                    status: {
                      '$in': [1, 2]
                    }
                  }, {}, extension, function(err, bookings) {
                    if (err) {
                      res.send(data);
                    } else {
                      for (var i = 0; i < bookings.length; i++) {
                        var job = {};

                        job.user_name = bookings[i].user.username;
                        if (bookings[i].user.avatar) {
                          job.user_image = settings.settings.site_url + bookings[i].user.avatar.substr(2);
                        } else {

                          job.user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                        }
                        job.job_id = bookings[i].booking_id;
                        //job.job_status = bookings[i].status || '';
                        job.job_status = 'Missed Job';
                        job.category_name = bookings[i].booking_information.service_type || '';
                        job.location = bookings[i].booking_information.location || '';

                        var a = moment(bookings[i].booking_information.est_reach_date);
                        var b = moment(new Date());

                        job.job_time = library.timeDifference(a, b);
                        job.booking_time = timezone.tz(bookings[i].booking_information.est_reach_date, settings.settings.time_zone).format(settings.settings.date_format + ',' + settings.settings.time_format);

                        //job.booking_time1 = moment(new Date(bookings[i].booking_information.est_reach_date)).format('MMMM D, YYYY, h:mm a') || '';
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



    controller.jobMoreInfo = function(req, res) {
      //validation
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
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
      request.provider_id = req.body.provider_id;
      request.job_id = req.body.job_id;
      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
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
              var extension = {};
              extension.populate = {
                path: 'user category',
                select: 'image avg_review _id ratetype'
              };
              db.GetOneDocument('task', {
                'booking_id': request.job_id
              }, {}, extension, function(err, bookings) {


                console.log("bookings" , bookings)

                if (err || !bookings) {
                  data.response = res.__("Jobs Not Available");
                  res.send(data);
                } else {
                  // , 'taskerskills.categoryid': category_id
                  var category_id = bookings.category._id;
                  db.GetOneDocument('tasker', {
                    '_id': request.provider_id
                  }, {}, {}, function(err, provider) {
                    if (err || !provider) {
                      data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
                      res.send(data);
                    } else {
                      db.GetOneDocument('settings', {
                        'alias': 'general'
                      }, {}, {}, function(err, settings) {
                        if (err || !settings) {
                          res.send({
                            "status": "0",
                            "response": res.__("Error")
                          });
                        } else {
                          db.GetCount('review', {
                            'tasker': new mongoose.Types.ObjectId(request.provider_id),
                            type: 'tasker',
                            'task': provider._id
                          }, function(err, count) {

                            if (err) {
                              res.send({
                                "status": "0",
                                "response": res.__("Error")
                              });
                            } else {
                              db.GetCount('review', {
                                'tasker': new mongoose.Types.ObjectId(request.provider_id),
                                type: 'tasker',
                                'task': bookings._id
                              }, function(err, count) {

                                if (err) {
                                  res.send({
                                    "status": "0",
                                    "response": res.__("Error")
                                  });
                                } else {

                                  if (bookings.tasker && (bookings.status == 6 || bookings.status == 3 || bookings.status == 7)) {
                                    data.status = 1;
                                    data.response = {};
                                    data.response.job = {};
                                    data.response.job.need_payment = 1;
                                    if (bookings.pay_status == "paid" || bookings.invoice.status == 1) {
                                      data.response.job.need_payment = 0;
                                    }
                                    var val = 0;
                                    if (settings.settings.pay_by_cash.status == 1) {
                                      val = 1;
                                    }
                                    if (!count) {
                                      var review = '1';
                                    } else {
                                      review = '0';
                                    }
                                    data.response.job.cash_option = val;
                                    data.response.job.currency = currencies.code;
                                    data.response.job.job_summary = bookings.invoice.summary || "";
                                    data.response.job.review = review;
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

                                    /* if (bookings.invoice.amount.minimum_cost >= 0) {
                                      var billing = {
                                        'title': 'Base Price',
                                        'dt': '1',
                                        'amount': (bookings.invoice.amount.minimum_cost * currencies.value).toFixed(2)
                                      };
                                      data.response.job.billing.push(billing);
                                    } */
                                    if (bookings.invoice.worked_hours_human) {
                                      var response = {
                                        'title': 'Total Hours Worked',
                                        'dt': '0',
                                        'amount': bookings.invoice.worked_hours_human
                                      };
                                      data.response.job.billing.push(response);
                                    }

                                    function deciHours(time) {
                                      return (function(i) {
                                        return i + (Math.round(((time - i) * 60), 10) / 100);
                                      })(parseFloat(time, 10));
                                    }

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

                                    /* if (finaldata > 0) {
                                         var response = { 'title': 'Remaining Hours', 'dt': '0', 'amount': display(finaldata) };
                                         data.response.job.billing.push(response);
                                     }*/
                                    if (bookings.category.ratetype == 'Flat' & bookings.hourly_rate) {
                                      var billing = {
                                        'title': 'Rate',
                                        'dt': '1',
                                        'amount': (bookings.hourly_rate * currencies.value).toFixed(2)
                                      };
                                      data.response.job.billing.push(billing);
                                    }
                                    else{
                                      if(bookings.hourly_rate){
                                        var billing = {
                                          'title': 'Hourly Rate',
                                          'dt': '1',
                                          'amount': (bookings.hourly_rate * currencies.value).toFixed(2)
                                        };
                                        data.response.job.billing.push(billing);
                                    }
                                    }

                                    if (bookings.invoice.amount.discount > 0) {
                                      var billing = {
                                        'title': 'Coupon discount',
                                        'dt': '1',
                                        'amount': (bookings.invoice.amount.discount * currencies.value).toFixed(2)
                                      };
                                      data.response.job.billing.push(billing);
                                    }

                                    if (bookings.invoice.amount.total) {
                                      //  var calc = bookings.invoice.amount.service_tax + bookings.invoice.amount.total;
                                      var calc = bookings.invoice.amount.total;
                                      var response = {
                                        'title': 'Task amount',
                                        'dt': '1',
                                        'amount': (calc * currencies.value).toFixed(2)
                                      };
                                      data.response.job.billing.push(response);
                                    }

                                    /*if (bookings.invoice.amount.service_tax >= 0) {
                                             var billing = { 'title': 'Service tax', 'dt': '0', 'amount': (bookings.invoice.amount.service_tax * currencies.value).toFixed(2) };
                                             data.response.job.billing.push(billing);
                                         }*/

                                    if (bookings.invoice.amount.admin_commission) {
                                      var response = {
                                        'title': 'Admin commission',
                                        'dt': '1',
                                        'amount': (bookings.invoice.amount.admin_commission * currencies.value).toFixed(2)
                                      };
                                      data.response.job.billing.push(response);
                                    }




                                    if (bookings.invoice.amount.wallet_usage > 0) {
                                      var billing = {
                                        'title': 'Wallet used amount',
                                        'dt': '1',
                                        'amount': (bookings.invoice.amount.wallet_usage * currencies.value).toFixed(2)
                                      };
                                      data.response.job.billing.push(billing);
                                    }
                                    if (bookings.invoice.amount.paid_amount > 0) {
                                      var billing = {
                                        'title': 'Paid amount',
                                        'dt': '1',
                                        'amount': (bookings.invoice.amount.paid_amount * currencies.value).toFixed(2)
                                      };
                                      data.response.job.billing.push(billing);
                                    }

                                    if (bookings.invoice.amount.extra_amount) {
                                      var billing = {
                                        'title': 'Miscellaneous amount',
                                        'dt': '1',
                                        'amount': (bookings.invoice.amount.extra_amount * currencies.value).toFixed(2)
                                      };
                                      data.response.job.billing.push(billing);
                                    }
                                    if (bookings.invoice.amount.total && bookings.invoice.amount.discount) {
                                      if (bookings.payment_type == "wallet-other") {
                                        var amount_final = bookings.invoice.amount.balance_amount - bookings.invoice.amount.admin_commission;
                                      } else {
                                        var amount_final = bookings.invoice.amount.grand_total - bookings.invoice.amount.admin_commission;
                                      }

                                      // var amount_final = bookings.invoice.amount.grand_total - bookings.invoice.amount.admin_commission;
                                      var lastamount_final = bookings.invoice.amount.total - bookings.invoice.amount.admin_commission;
                                      // var lastamount_final = amount_final - bookings.invoice.amount.service_tax;
                                      var finalCoupon = lastamount_final;
                                      var response = {
                                        'title': 'Grand Total',
                                        'dt': '1',
                                        'amount': (finalCoupon * currencies.value).toFixed(2)
                                      };
                                      data.response.job.billing.push(response);
                                    }

                                    if (bookings.invoice.amount.total && !bookings.invoice.amount.discount) {
                                      if (bookings.payment_type == "wallet-other") {
                                        var amount_final = bookings.invoice.amount.balance_amount - bookings.invoice.amount.admin_commission;
                                      } else {
                                        var amount_final = bookings.invoice.amount.grand_total - bookings.invoice.amount.admin_commission;
                                      }
                                      //var amount_final = bookings.invoice.amount.grand_total - bookings.invoice.amount.admin_commission;
                                      // var lastamount_final = amount_final - bookings.invoice.amount.service_tax;
                                      var lastamount_final = bookings.invoice.amount.total - bookings.invoice.amount.admin_commission;
                                      var response = {
                                        'title': 'Grand Total',
                                        'dt': '1',
                                        'amount': (lastamount_final * currencies.value).toFixed(2)
                                      };
                                      data.response.job.billing.push(response);
                                    }

                                    if (bookings.payment_type) {
                                      var billing = {
                                        'title': 'Payment mode',
                                        'dt': '0',
                                        'amount': bookings.payment_type
                                      };
                                      data.response.job.billing.push(billing);
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
                  });
                }
              });
            }
          });
        }
      });
    }

    controller.receiveCash = function(req, res) {

      //validation
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('job_id', res.__('Enter Valid Job Info')).notEmpty();
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
      request.provider_id = req.body.provider_id;
      request.job_id = req.body.job_id;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {

          db.GetOneDocument('settings', {
            "alias": "sms"
          }, {}, {}, function(err, settings) {
            if (err || !settings) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
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
                  var extension = {};
                  extension.populate = {
                    path: 'user tasker'
                  };
                  db.GetOneDocument('task', {
                    'booking_id': request.job_id
                  }, {}, extension, function(err, bookings) {
                    if (err || !bookings) {
                      data.response = res.__("Jobs Not Available");
                      res.send(data);
                    } else {
                      if (bookings.status == 6) {
                        var otpString = '';
                        async.waterfall([
                          function(callback) {
                            if (bookings.job_otp) {
                              otpString = bookings.job_otp;
                              callback(null, null);
                            } else {
                              otpString = library.randomString(5, '#');
                              db.UpdateDocument('task', {
                                'booking_id': request.job_id
                              }, {
                                'otp': otpString
                              }, {}, function(err, response) {
                                if (err || response.nModified == 0) {
                                  callback(err, response);
                                } else {
                                  var to = bookings.user.phone.code + bookings.user.phone.number;
                                  //var message = 'Your CRN ' + request.job_id + ' verification code is ' + otpString;
                                  var message = util.format(CONFIG.SMS.RECEIVE_CASH, request.job_id, otpString);
                                  twilio.createMessage(to, '', message, function(err, response) {});
                                  callback(err, response);
                                }
                              });
                            }
                          }
                        ], function(err, result) {
                          if (!err) {
                            var receive_amount = 0;
                            if (typeof bookings.invoice) {
                              if (bookings.invoice.amount.grand_total) {
                                receive_amount = (bookings.invoice.amount.balance_amount).toFixed(2);
                              }
                            }
                            data.status = 1;
                            data.response = {};
                            data.response.message = res.__('Waiting for job verification code');
                            data.response.currency = currencies.code;
                            if (settings.settings.twilio.mode == 'development') {
                              data.response.otp_status = 'development';
                            } else {
                              data.response.otp_status = 'production';
                            }
                            data.response.otp_string = otpString;
                            data.response.job_id = request.job_id;
                            data.response.receive_amount = (receive_amount * currencies.value).toFixed(2);

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
                                var MaterialFee, CouponCode, DateTime, BookingDate;
                                if (bookings.invoice.amount.extra_amount) {
                                  MaterialFee = (bookings.invoice.amount.extra_amount).toFixed(2);
                                } else {
                                  MaterialFee = '0.00';
                                }
                                if (bookings.invoice.amount.coupon) {
                                  CouponCode = bookings.invoice.amount.coupon;
                                  receive_amount = ((((bookings.invoice.amount.total + MaterialFee) - CouponCode) / 100) * bookings.invoice.amount.service_tax)
                                  data.response.receive_amount = (receive_amount * currencies.value).toFixed(2);
                                } else {
                                  CouponCode = 'Not assigned';
                                }
                                DateTime = moment(bookings.history.job_started_time).format('DD/MM/YYYY - HH:mm');
                                BookingDate = moment(bookings.history.booking_date).format('DD/MM/YYYY');


                                var userfirstname = bookings.user.username;

                                var html = template[0].email_content;
                                html = html.replace(/{{mode}}/g, bookings.payment_type);
                                html = html.replace(/{{materialfee}}/g, currencies.symbol + ' ' + MaterialFee);
                                html = html.replace(/{{coupon}}/g, CouponCode);
                                html = html.replace(/{{datetime}}/g, DateTime);
                                html = html.replace(/{{bookingdata}}/g, BookingDate);
                                html = html.replace(/{{site_url}}/g, settings.settings.site_url);
                                html = html.replace(/{{site_title}}/g, settings.settings.site_title);
                                html = html.replace(/{{logo}}/g, settings.settings.site_url + settings.settings.logo);
                                html = html.replace(/{{t_username}}/g, bookings.tasker.username);
                                html = html.replace(/{{taskeraddress}}/g, bookings.tasker.availability_address);
                                //html = html.replace(/{{taskeraddress1}}/g, bookings.tasker.address.city);
                                //html = html.replace(/{{taskeraddress2}}/g, bookings.tasker.address.state);
                                html = html.replace(/{{bookingid}}/g, bookings.booking_id);
                                html = html.replace(/{{u_username}}/g, userfirstname);
                                html = html.replace(/{{useraddress}}/g, bookings.service_address || ' ');
                                html = html.replace(/{{useraddress1}}/g, bookings.user.address.city || ' ');
                                html = html.replace(/{{useraddress2}}/g, bookings.user.address.state || ' ');
                                html = html.replace(/{{categoryname}}/g, bookings.booking_information.work_type);
                                html = html.replace(/{{hourlyrates}}/g, currencies.symbol + ' ' + (bookings.hourly_rate).toFixed(2));
                                html = html.replace(/{{hourlyrate}}/g, currencies.symbol + ' ' + (bookings.invoice.amount.minimum_cost).toFixed(2));
                                html = html.replace(/{{totalhour}}/g, bookings.invoice.worked_hours_human);
                                html = html.replace(/{{totalamount}}/g, currencies.symbol + ' ' + (bookings.invoice.amount.grand_total).toFixed(2));
                                html = html.replace(/{{total}}/g, currencies.symbol + ' ' + (bookings.invoice.amount.total).toFixed(2));
                                html = html.replace(/{{amount}}/g, currencies.symbol + ' ' + (bookings.invoice.amount.grand_total - bookings.invoice.amount.admin_commission).toFixed(2));
                                html = html.replace(/{{actualamount}}/g, currencies.symbol + ' ' + ((bookings.invoice.amount.grand_total - bookings.invoice.amount.admin_commission) - MaterialFee).toFixed(2));
                                html = html.replace(/{{adminamount}}/g, currencies.symbol + ' ' + (bookings.invoice.amount.admin_commission).toFixed(2));
                                html = html.replace(/{{privacy}}/g, settings.settings.site_url + 'pages/privacypolicy');
                                html = html.replace(/{{terms}}/g, settings.settings.site_url + 'pages/termsandconditions');
                                html = html.replace(/{{Servicetax}}/g, currencies.symbol + ' ' + bookings.invoice.amount.service_tax.toFixed(2));
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
                                        filename: 'adminpayment.pdf',
                                        path: './uploads/invoice/' + pdfname + '.pdf',
                                        contentType: 'application/pdf'
                                      }],
                                    };
                                  }
                                  mail.send(mailOptions, function(err, response) {});
                                });

                                var html2 = template[1].email_content;
                                html2 = html2.replace(/{{mode}}/g, bookings.payment_type);
                                html2 = html2.replace(/{{materialfee}}/g, currencies.symbol + ' ' + MaterialFee);
                                html2 = html2.replace(/{{coupon}}/g, CouponCode);
                                html2 = html2.replace(/{{datetime}}/g, DateTime);
                                html2 = html2.replace(/{{bookingdata}}/g, BookingDate);
                                html2 = html2.replace(/{{site_url}}/g, settings.settings.site_url);
                                html2 = html2.replace(/{{logo}}/g, settings.settings.site_url + settings.settings.logo);
                                html2 = html2.replace(/{{site_title}}/g, settings.settings.site_title);
                                html2 = html2.replace(/{{t_username}}/g, bookings.tasker.username);
                                html2 = html2.replace(/{{taskeraddress}}/g, bookings.tasker.availability_address);
                               // html2 = html2.replace(/{{taskeraddress1}}/g, bookings.tasker.address.city);
                               // html2 = html2.replace(/{{taskeraddress2}}/g, bookings.tasker.address.state);
                                html2 = html2.replace(/{{bookingid}}/g, bookings.booking_id);
                                html2 = html2.replace(/{{u_username}}/g, userfirstname);
                                html2 = html2.replace(/{{useraddress}}/g, bookings.service_address || ' ');
                                html2 = html2.replace(/{{useraddress1}}/g, bookings.user.address.city || ' ');
                                html2 = html2.replace(/{{useraddress2}}/g, bookings.user.address.state || ' ');
                                html2 = html2.replace(/{{categoryname}}/g, bookings.booking_information.work_type);
                                html2 = html2.replace(/{{hourlyrates}}/g, currencies.symbol + ' ' + (bookings.hourly_rate).toFixed(2));
                                html2 = html2.replace(/{{hourlyrate}}/g, currencies.symbol + ' ' + (bookings.invoice.amount.minimum_cost).toFixed(2));
                                html2 = html2.replace(/{{totalhour}}/g, bookings.invoice.worked_hours_human);
                                html2 = html2.replace(/{{totalamount}}/g, currencies.symbol + ' ' + (bookings.invoice.amount.grand_total - bookings.invoice.amount.service_tax).toFixed(2));
                                html2 = html2.replace(/{{total}}/g, currencies.symbol + ' ' + (bookings.invoice.amount.total).toFixed(2));
                                html2 = html2.replace(/{{amount}}/g, currencies.symbol + ' ' + (bookings.invoice.amount.grand_total - bookings.invoice.amount.admin_commission).toFixed(2));
                                html2 = html2.replace(/{{actualamount}}/g, currencies.symbol + ' ' + ((bookings.invoice.amount.grand_total - bookings.invoice.amount.admin_commission) - bookings.invoice.amount.service_tax).toFixed(2));
                                html2 = html2.replace(/{{admincommission}}/g, currencies.symbol + ' ' + bookings.invoice.amount.admin_commission.toFixed(2));
                                html2 = html2.replace(/{{privacy}}/g, settings.settings.site_url + 'pages/privacypolicy');
                                html2 = html2.replace(/{{terms}}/g, settings.settings.site_url + 'pages/termsandconditions');
                                html2 = html2.replace(/{{Servicetax}}/g, currencies.symbol + ' ' + bookings.invoice.amount.service_tax.toFixed(2));
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
                                      to: bookings.tasker.email,
                                      subject: template[1].email_subject,
                                      text: "Please Download the attachment to see Your Payment",
                                      html: '<b>Please Download the attachment to see Your Payment</b>',
                                      attachments: [{
                                        filename: CONFIG.TASKER + 'payment.pdf',
                                        path: './uploads/invoice/' + pdfname1 + '.pdf',
                                        contentType: 'application/pdf'
                                      }],
                                    };
                                  }
                                  mail.send(mailOptions1, function(err, response) {});
                                });

                                var html3 = template[2].email_content;
                                html3 = html3.replace(/{{mode}}/g, bookings.payment_type);
                                html3 = html3.replace(/{{materialfee}}/g, currencies.symbol + ' ' + MaterialFee);
                                html3 = html3.replace(/{{coupon}}/g, CouponCode);
                                html3 = html3.replace(/{{datetime}}/g, DateTime);
                                html3 = html3.replace(/{{bookingdata}}/g, BookingDate);
                                html3 = html3.replace(/{{site_url}}/g, settings.settings.site_url);
                                html3 = html3.replace(/{{site_title}}/g, settings.settings.site_title);
                                html3 = html3.replace(/{{logo}}/g, settings.settings.site_url + settings.settings.logo);
                                html3 = html3.replace(/{{t_username}}/g, bookings.tasker.username);
                                html3 = html3.replace(/{{taskeraddress}}/g, bookings.tasker.availability_address);
                                //html3 = html3.replace(/{{taskeraddress1}}/g, bookings.tasker.address.city);
                                //html3 = html3.replace(/{{taskeraddress2}}/g, bookings.tasker.address.state);
                                html3 = html3.replace(/{{bookingid}}/g, bookings.booking_id);
                                html3 = html3.replace(/{{u_username}}/g, userfirstname);
                                html3 = html3.replace(/{{useraddress}}/g, bookings.service_address || ' ');
                                html3 = html3.replace(/{{useraddress1}}/g, bookings.user.address.city || ' ');
                                html3 = html3.replace(/{{useraddress2}}/g, bookings.user.address.state || ' ');
                                html3 = html3.replace(/{{categoryname}}/g, bookings.booking_information.work_type);
                                html3 = html3.replace(/{{hourlyrates}}/g, currencies.symbol + ' ' + (bookings.hourly_rate).toFixed(2));
                                html3 = html3.replace(/{{hourlyrate}}/g, currencies.symbol + ' ' + (bookings.invoice.amount.minimum_cost).toFixed(2));
                                html3 = html3.replace(/{{totalhour}}/g, bookings.invoice.worked_hours_human);
                                html3 = html3.replace(/{{totalamount}}/g, currencies.symbol + ' ' + bookings.invoice.amount.grand_total.toFixed(2));
                                html3 = html3.replace(/{{total}}/g, currencies.symbol + ' ' + (bookings.invoice.amount.total).toFixed(2));
                                html3 = html3.replace(/{{amount}}/g, currencies.symbol + ' ' + (bookings.invoice.amount.grand_total - bookings.invoice.amount.admin_commission).toFixed(2));
                                html3 = html3.replace(/{{actualamount}}/g, currencies.symbol + ' ' + (bookings.invoice.amount.total - bookings.invoice.amount.grand_total).toFixed(2));
                                html3 = html3.replace(/{{admincommission}}/g, currencies.symbol + ' ' + bookings.invoice.amount.admin_commission.toFixed(2));
                                html3 = html3.replace(/{{privacy}}/g, settings.settings.site_url + 'pages/privacypolicy');
                                html3 = html3.replace(/{{terms}}/g, settings.settings.site_url + 'pages/termsandconditions');
                                html3 = html3.replace(/{{Servicetax}}/g, currencies.symbol + ' ' + bookings.invoice.amount.service_tax.toFixed(2));
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
                                      to: bookings.user.email,
                                      subject: template[2].email_subject,
                                      text: "Please Download the attachment to see Your Payment",
                                      html: '<b>Please Download the attachment to see Your Payment</b>',
                                      attachments: [{
                                        filename: CONFIG.USER + 'payment.pdf',
                                        path: './uploads/invoice/' + pdfname2 + '.pdf',
                                        contentType: 'application/pdf'
                                      }],
                                    };
                                  }
                                  mail.send(mailOptions2, function(err, response) {});
                                });

                              }
                            });
                            res.send(data);
                          } else {
                            data.response = res.__('You cannot do any action in this job right now.');
                            res.send(data);
                          }
                        });
                      } else {
                        data.response = res.__('You cannot do this action right now.');
                        res.send(data);
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


    controller.requestPayment = function(req, res) {
      //validation
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('job_id', res.__('Enter Valid Job Info')).notEmpty();
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
      request.provider_id = req.body.provider_id;
      request.job_id = req.body.job_id;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {

          var extension = {};
          extension.populate = {
            path: 'user'
          };
          db.GetOneDocument('task', {
            'booking_id': request.job_id
          }, {}, extension, function(err, bookings) {
            if (err || !bookings) {
              data.response = res.__("Jobs Not Available");
              res.send(data);
            } else {
              if (bookings.tasker && bookings.status == 6 && bookings.user.id) {
                var message = CONFIG.NOTIFICATION.PROVIDER_WANTS_PAYMENT_FOR_HIS_JOB;
                var options = {
                  'job_id': request.job_id,
                  'user_id': bookings.user._id
                };
                push.sendPushnotification(bookings.user._id, message, 'requesting_payment', 'ANDROID', options, 'USER', function(err, response, body) {

                });
                data.status = 1;
                data.response = res.__('Payment Request sent, please wait.');
                res.send(data);
                var mailData = {};
                db.GetOneDocument('currencies', {
                  'default': 1
                }, {}, {}, function(err, currencies) {
                  if (err) {
                    res.send(err);
                  } else {
                    db.GetOneDocument('settings', {
                      'alias': 'general'
                    }, {}, {}, function(err, settings) {
                      if (err || !settings) {
                        data.response = res.__('Configure your website settings');
                        res.send(data);
                      } else {
                        var job_date = timezone.tz(bookings.booking_information.booking_date, settings.settings.time_zone).format(settings.settings.date_format);
                        mailData.template = 'RequestPayment';
                        mailData.to = bookings.user.email;
                        mailData.html = [];
                        mailData.html.push({
                          name: 'username',
                          value: bookings.user.username || ""
                        });
                        mailData.html.push({
                          name: 'taskername',
                          value: provider.username || ""
                        });
                        mailData.html.push({
                          name: 'taskname',
                          value: bookings.booking_information.work_type || ""
                        });
                        mailData.html.push({
                          name: 'bookingid',
                          value: bookings.booking_id || ""
                        });
                        mailData.html.push({
                          name: 'date',
                          value: job_date || ""
                        });
                        mailData.html.push({
                          name: 'total',
                          value: currencies.symbol + ' ' + bookings.invoice.amount.grand_total || ""
                        });
                        mailData.html.push({
                          name: 'site_url',
                          value: settings.settings.site_url || ""
                        });
                        mailData.html.push({
                          name: 'site_title',
                          value: settings.settings.site_title || ""
                        });
                        mailData.html.push({
                          name: 'logo',
                          value: settings.settings.logo || ""
                        });
                        mailcontent.sendmail(mailData, function(err, response) {});
                      }
                    });
                  }
                });
              } else {
                data.response = res.__('You cannot do this action right now.');
                res.send(data);
              }
            }
          });
        }
      });
    };

    controller.earningsStats = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      var request = {};
      request.provider_id = req.body.provider_id;
      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {

          db.GetOneDocument('currencies', {
            'default': 1
          }, {}, {}, function(err, currencies) {
            if (err || !currencies) {
              res.send({
                "status": 0,
                "message": res.__('Invalid ' + CONFIG.TASKER + ', Please check your data')
              });
            } else {
              var CurrentDate = new Date();
              var StatsDate = CurrentDate.setMonth(CurrentDate.getMonth() - 6);
              var pipeline = [{
                  $match: {
                    'status': 7,
                    'tasker': new mongoose.Types.ObjectId(req.body.provider_id),
                    'booking_information.booking_date': {
                      $gt: CurrentDate,
                      $lt: new Date()
                    }
                  }
                },
                {
                  $project: {
                    'status': 1,
                    'booking_information': 1,
                    'invoice': 1,
                    'month': {
                      $month: "$booking_information.booking_date"
                    },
                    'year': {
                      $year: "$booking_information.booking_date"
                    }
                  }
                },
                {
                  $group: {
                    '_id': {
                      year: '$year',
                      month: '$month'
                    },
                    'status': {
                      $first: '$status'
                    },
                    'month': {
                      $first: '$month'
                    },
                    'year': {
                      $first: '$year'
                    },
                    'amount': {
                      $sum: '$invoice.amount.grand_total'
                    }
                  }
                },
                {
                  $group: {
                    '_id': '$status',
                    'status': {
                      $first: '$status'
                    },
                    'earnings': {
                      $push: {
                        'month': '$month',
                        'year': '$year',
                        'amount': {
                          $sum: '$amount'
                        }
                      }
                    },
                    'total_earnings': {
                      $sum: '$amount'
                    }
                  }
                }
              ];
              db.GetAggregation('task', pipeline, function(err, bookings) {
                if (err) {
                  data.response = res.__('Unable to get your stats, Please check your data');
                  res.send(data);
                } else {
                  var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  var earning = [];
                  for (var i = 0; i < 6; i++) {
                    var amount = 0;
                    var CurrentDate = new Date();
                    //var StatsDate = CurrentDate.setMonth(CurrentDate.getMonth() - i);
                    var StatsMonth = CurrentDate.getMonth() + 1;
                    var StatsYear = CurrentDate.getFullYear();

                    if (bookings[0]) {
                      for (var j = 0; j < bookings[0].earnings.length; j++) {
                        if (StatsMonth == bookings[0].earnings[j].month && StatsYear == bookings[0].earnings[j].year) {
                          amount = bookings[0].earnings[j].amount;
                        }
                      }
                    }
                    if (amount != 0) {
                      earning.push({
                        'month': monthNames[StatsMonth - 1],
                        'amount': (amount * currencies.value).toFixed(2)
                      });
                    } else {
                      earning.push({
                        'month': monthNames[StatsMonth - 1],
                        'amount': 0
                      });
                    }
                  }
                  data.status = '1';
                  data.response = {};
                  if (bookings[0]) {
                    //if (bookings[0].total_earnings > 0) { data.response.unit = '(In Thousands)'; } else { data.response.unit = '' }
                    data.response.total_earnings = Math.round(bookings[0].total_earnings);
                    data.response.interval = 1;
                    data.response.unit = "1";
                  } else {
                    data.response.unit = '';
                    data.response.total_earnings = 0;
                    data.response.interval = 0;
                  }
                  data.response.earnings = earning;
                  data.response.max_earnings = Math.round(Math.max.apply(Math, earning.map(function(o) {
                    return o.amount;
                  })));
                  //if (data.response.max_earnings > 0) { data.response.interval = Math.round(data.response.max_earnings / 10); }
                  data.response.currency_code = currencies.code;
                  res.send(data);
                }
              });
            }
          });
        }
      });
    }

    controller.earningsStats = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();

      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      var request = {};
      request.provider_id = req.body.provider_id;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          db.GetOneDocument('currencies', {
            'default': 1
          }, {}, {}, function(err, currencies) {
            if (err || !currencies) {
              res.send({
                "status": 0,
                "message": res.__('Invalid ' + CONFIG.TASKER + ', Please check your data')
              });
            } else {
              var booking_date = moment().subtract(3, 'months').format();
              var date = new Date(booking_date);

              console.log("booking_date", booking_date);

              db.GetAggregation('task', [{
                  $match: {
                    'status': 7,
                    'tasker': new mongoose.Types.ObjectId(req.body.provider_id)
                  }
                },
                {
                  $project: {
                    'history': 1
                  }
                },
                {
                  $group: {
                    '_id': '$',
                    'amount': {
                      $sum: '$invoice.amount.tasker_earning'
                    },
                    'task_count': {
                      $sum: 1
                    },
                    'worked_hours': {
                      $sum: '$invoice.worked_hours'
                    },
                  }
                }
              ], function (err, weekdata) {
                  if (err) {
                    res.send(err);
                  } else {
                    console.log("weekdata", weekdata);
                  }
              });
            }
          });
        }
      });
    };

    controller.weeklyEarningsStats = function(req, res) {
      console.log("req.body", req.body);
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('start_week', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('end_week', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      var data = {};
      data.response = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      var request = {};
      request.provider_id = req.body.provider_id;
      request.start_week = req.body.start_week;
      request.end_week = req.body.end_week;

      db.GetAggregation('task', [{
          $match: {
              'status': 7,
              'tasker': new mongoose.Types.ObjectId(req.body.provider_id)
          }
        },
        {
          $project: {
              'history': 1
          }
        },
        {
          $group: {
            '_id': null,
            'job_date': {
              $first: '$history.job_completed_time'
            }
          }
        }
      ], function (err, task) {
          if (err || !task || task.length == 0) {
            request.first_job_date = '';
          } else {
            request.first_job_date = moment(task[0].job_date).format('YYYY-MM-DD');
          }
      });

      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          db.GetOneDocument('currencies', {
            'default': 1
          }, {}, {}, function(err, currencies) {
            if (err || !currencies) {
              res.send({
                "status": 0,
                "message": res.__('Invalid ' + CONFIG.TASKER + ', Please check your data')
              });
            } else {
              /*var today = moment();
              var startDate = today.startOf('week').format();
              var endDate = today.endOf('week').format();*/

              var pipeline = [{
                  $match: {
                    'status': 7,
                    'tasker': new mongoose.Types.ObjectId(req.body.provider_id),
                    'history.job_completed_time': {
                      $gt: new Date(request.start_week),
                      $lt: new Date(request.end_week)
                    }
                  }
                },
                {
                  $project: {
                    'status': 1,
                    'invoice': 1,
                    'history': 1,
                    'booking_id': 1,
					'booking_information': 1,
                    'job_date': {
                       $dateFromParts: {
                           year: { $year: "$history.job_completed_time" },
                           month: { $month: "$history.job_completed_time" },
                           day: { $dayOfMonth: "$history.job_completed_time" }
                       }
                    }
                  }
                },
                {
                  $group: {
                    '_id': '$job_date',
                    /*'amount' : {$sum : { $cond: { if: {$and : [{$gt:["$invoice.amount.extra_amount", null]} ]} , then:{ $subtract :[{ $add: ['$invoice.amount.total',"$invoice.amount.extra_amount"] },'$invoice.amount.admin_commission']} , else: { $subtract : ['$invoice.amount.total','$invoice.amount.admin_commission'] } } } } ,*/
					          'amount': { $sum: '$invoice.amount.tasker_earning' },
                    'task_count': {
                      $sum: 1
                    },
                    'worked_hours': {
                      $sum: '$invoice.worked_hours'
                    },
                  }
                },
                {
                  $group: {
                    '_id': null,
                    'weekly_data': {
                      $push: {
                        'job_date': '$_id',
                        'earnings': '$amount',
                        'task_count': '$task_count'
                      }
                    },
                    'total_earnings': {
                      $sum: '$amount'
                    },
                    'total_task': {
                      $sum: '$task_count'
                    },
                    'total_worked_hours': {
                      $sum: '$worked_hours'
                    }
                  }
                }
              ];

              db.GetAggregation('task', pipeline, function(err, bookings) {
                if (err || bookings.length == 0) {
                  data.status = '2';
                  data.response = {};
                  data.response.weekly_earnings = [
                       {
                           "earnings" : [],
                           "total_earnings" : 0,
                           "total_task" : 0,
                           "total_worked_hours" : '0.00',
                           "currency": currencies.code
                       }
                   ];
                  data.response.message = "You haven't completed any job.";
                  data.response.first_job_date = request.first_job_date;
                  res.send(data);
                } else {
                  var weekdays = [];
                  var weekly_earnings = [];
                  var start = moment(request.start_week);
                  var end = moment(request.end_week);

                  while (start <= end) {
                      weekdays.push({
                       "job_date": start.toDate(),
                       "earnings": 0,
                       "task_count": 0
                        });
                      start = start.clone().add(1, 'd');
                  }

                  weekdays.forEach(function (weekdays) {
                    var count = 0;
                    bookings[0].weekly_data.forEach(function (selectedday) {
                      if(moment(weekdays.job_date).format('YYYY-MM-DD') == moment(selectedday.job_date).format('YYYY-MM-DD')) {
                        count++;
                        weekdays.job_date = moment(selectedday.job_date).format('YYYY-MM-DD');
                        weekdays.booking_id = selectedday.booking_id;
                        weekdays.category = selectedday.category;
                        weekdays.earnings = selectedday.earnings;
                        weekdays.task_count = selectedday.task_count;
                      }
                    });
                    if(count == 0) {
                      weekdays.job_date = moment(weekdays.job_date).format('YYYY-MM-DD');
                    }
                  });

                  weekly_earnings.push({'earnings': weekdays, 'total_earnings': bookings[0].total_earnings, 'total_task': bookings[0].total_task,
                    'total_worked_hours': (bookings[0].total_worked_hours).toFixed(2), 'currency': currencies.code});

                  data.status = '1';
                  data.response = {};
                  data.response.first_job_date = request.first_job_date;
                  data.response.weekly_earnings = weekly_earnings;

                  res.send(data);
                }
              });
            }
          });
        }
      });
    };

    controller.dailyEarningsStats = function(req, res) {
      console.log("req.body", req.body);
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('task_date', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();

      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      var request = {};
      request.provider_id = req.body.provider_id;
      request.task_date = req.body.task_date;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          db.GetOneDocument('currencies', {
            'default': 1
          }, {}, {}, function(err, currencies) {
            if (err || !currencies) {
              res.send({
                "status": 0,
                "message": res.__('Invalid ' + CONFIG.TASKER + ', Please check your data')
              });
            } else {
				db.GetOneDocument('settings', {
                    'alias': 'general'
                  }, {}, {}, function(err, settings) {
                    if (err || !currencies) {
                      res.send({
                        "status": 0,
                        "message": res.__('Invalid ' + CONFIG.TASKER + ', Please check your data')
                      });
                    } else {
					  db.GetAggregation('task', [{
						  $match: {
							  'status': 7,
							  'tasker': new mongoose.Types.ObjectId(req.body.provider_id),
							  'task_date': {
								$eq: request.task_date
							  }
						  }
						},
						{
						  $project: {
							  'booking_id': 1,
							  'task_date': 1,
							  'service_address': 1,
							  'invoice': 1,
							  'booking_information': 1
						  }
						}
					  ], function (err, earnings) {
						  if (err) {
							res.send(err);
						  } else {
							var daily_earnings = [];
							var tasker_earning = '';
							earnings.forEach(function (earnings) {
							  /*if(earnings.invoice.amount.extra_amount != undefined || earnings.invoice.amount.extra_amount != null || earnings.invoice.amount.extra_amount > 0 ) {
								tasker_earning = (earnings.invoice.amount.total + earnings.invoice.amount.extra_amount) - earnings.invoice.amount.admin_commission;
							  } else {
								tasker_earning = earnings.invoice.amount.total - earnings.invoice.amount.admin_commission;
							  }*/
							  daily_earnings.push({'booking_id': earnings.booking_id, 'category_name': earnings.booking_information.work_type, 'date': earnings.task_date, 'time': earnings.booking_information.booking_date, 'address': earnings.service_address,'amount': earnings.invoice.amount.tasker_earning});
							});
							data.response = {};
							data.status = '1';
							data.response.earnings = daily_earnings;
							data.response.currency = currencies.code;
							res.send(data);
						  }
					  });
					}
				});
            }
          });
        }
      });
    };



    controller.jobTimeline = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('job_id', res.__('Invalid Job Info')).notEmpty();
      var data = {};
      data.status = 0;
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      var request = {};
      request.provider_id = req.body.provider_id;
      request.job_id = req.body.job_id;
      request.timelineArr = [{
          'key': 'job_booking_time',
          'value': CONFIG.NOTIFICATION.JOB_BOOKED
        },
        {
          'key': 'provider_assigned',
          'value': CONFIG.NOTIFICATION.HIRED_JOB
        },
        {
          'key': 'provider_start_off_time',
          'value': CONFIG.NOTIFICATION.PROVIDER_START_OFF_FROM_HIS_LOCATION
        },
        {
          'key': 'location_arrived_time',
          'value': CONFIG.NOTIFICATION.PROVIDER_ARRIVED_ON_JOB_LOCATION
        },
        {
          'key': 'job_started_time',
          'value': CONFIG.NOTIFICATION.JOB_HAS_BEEN_STARTED
        },
        {
          'key': 'job_completed_time',
          'value': CONFIG.NOTIFICATION.JOB_HAS_BEEN_COMPLETED
        },
        {
          'key': 'job_closed_time',
          'value': CONFIG.NOTIFICATION.JOB_HAS_BEEN_CLOSED
        },
        {
          'key': 'job_cancellation_time',
          'value': CONFIG.NOTIFICATION.JOB_HAS_BEEN_CANCELLED
        }
      ];
      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('You are not a authorized person.');
          res.send(data);
        } else {
          db.GetOneDocument('task', {
            'booking_id': request.job_id
          }, {}, {}, function(err, bookings) {
            if (err) {
              data.response = res.__("This job informations is not available");
              res.send(data);
            } else if (bookings == null) {
              data.response = res.__('please check ' + CONFIG.TASKER + ' id');
              res.send(data);
            } else {
              db.GetOneDocument('settings', {
                'alias': 'general'
              }, {}, {}, function(err, settings) {
                if (err || !settings) {
                  data.response = res.__('Configure your website settings');
                  res.send(data);
                } else {
                  if (!bookings.history) {
                    bookings.history = {};
                  }

                  if ('est_reach_date' in bookings.history) {
                    delete bookings.history.est_reach_date

                  }


                  data.status = 1;
                  data.response = {};
                  data.response.job_status = bookings.status;
                  data.response.timeline = [];
                  var newData = JSON.stringify(bookings.history);
                  var tempData = JSON.parse(newData);
                  for (var i = 0; i < request.timelineArr.length; i++) {
                    var timeline = {};
                    if (request.timelineArr[i].key in tempData) {
                      timeline.title = request.timelineArr[i].value;
                      if (bookings.history[request.timelineArr[i].key]) {
                        timeline.date = timezone.tz(bookings.history[request.timelineArr[i].key], settings.settings.time_zone).format(settings.settings.date_format) || '';
                        timeline.time = timezone.tz(bookings.history[request.timelineArr[i].key], settings.settings.time_zone).format(settings.settings.time_format) || '';
                      } else {
                        timeline.date = '';
                        timeline.time = '';
                      }
                      timeline.check = '1';
                    }
                    /* else {
                                          timeline.title = request.timelineArr[i].value;
                                          timeline.date = '';
                                          timeline.time = '';
                                          timeline.check = '0';
                                      }  */
                    data.response.timeline.push(timeline);
                  }


                  var tempdatakeyname = Object.keys(tempData);

                  // tempdatakeyname.filter(function (a) {
                  //     for (var i = 0; i < request.timelineArr.length; i++) {
                  //         var timeline = {};
                  //         timeline.title = a;
                  //         console.log("aaaaa",a)
                  //         console.log("request.timelineArr[i].key",request.timelineArr[i].key)
                  //         if (a == request.timelineArr[i].key) {
                  //             console.log("-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/")
                  //             timeline.date = timezone.tz(bookings.history[request.timelineArr[i].key], settings.settings.time_zone).format(settings.settings.date_format) || '';
                  //             timeline.time = timezone.tz(bookings.history[request.timelineArr[i].key], settings.settings.time_zone).format(settings.settings.time_format) || '';
                  //         } /* else {
                  //             timeline.date = '';
                  //             timeline.time = '';
                  //         } */
                  //         timeline.check = '1';
                  //     }
                  //     data.response.timeline.push(timeline);

                  //    /*  else{
                  //         timeline.title = a.value;
                  //         timeline.date = '';
                  //         timeline.time = '';
                  //         timeline.check = '0';
                  //     } */
                  // });
                  res.send(data);
                }
              });
            }
          });
        }
      });
    }

    controller.cashReceived = function(req, res) {

      //validation
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('job_id', res.__('Enter Valid Job Info')).notEmpty();
      req.checkBody('otp', res.__('Enter Valid otp')).notEmpty();
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
      request.provider_id = req.body.provider_id;
      request.job_id = req.body.job_id;
      request.otp = req.body.otp;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id
      }, {}, {}, function(err, provider) {
        if (err || !provider) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {

          var extension = {};
          extension.populate = {
            path: 'user tasker'
          };
          db.GetOneDocument('task', {
            'booking_id': request.job_id,
            'otp': request.otp
          }, {}, extension, function(err, bookings) {

            if (err || !bookings) {
              data.response = res.__("Invalid Credentials");
              res.send(data);
            } else {
              if (bookings.status == 6) {
                var pay_summary = 'Cash';
                var paymentInfo = {
                  'invoice.status': 1,
                  status: 7,
                  'history.job_closed_time': new Date()
                };
                var transactions = {};
                var paymenttype;
                if (bookings.payment_type == "wallet-other") {
                  paymenttype = "wallet- receive cash "
                } else {
                  paymenttype = "cash"
                }

                transactions.type = paymenttype;
                transactions.trans_date = new Date();
                transactions.amount = bookings.invoice.amount.grand_total;
                transactions.user = bookings.user;
                transactions.task = bookings._id;

                async.waterfall([
                  function(callback) {
                    db.UpdateDocument('task', {
                      'booking_id': request.job_id
                    }, paymentInfo, {}, function(err, response) {
                      callback(err, response);
                    });
                  },
                  function(response, callback) {
                    db.InsertDocument('transaction', transactions, function(err, response) {
                      callback(err, response);
                    });
                  }
                ], function(err, result) {
                  if (err) {
                    data.response = res.__('You Cannot Cancel this Job Right Now. Please try again later. ');
                    res.send(data);
                  } else {
                    db.UpdateDocument('task', {
                      'booking_id': request.job_id
                    }, {
                      'payment_type': paymenttype
                    }, {}, function(err, responses) {
                      var message = CONFIG.NOTIFICATION.YOUR_BILLING_AMOUNT_PAID_SUCCESSFULLY;
                      var options = {
                        'job_id': request.job_id,
                        'user_id': bookings.user._id
                      };
                      push.sendPushnotification(bookings.user._id, message, 'payment_paid', 'ANDROID', options, 'USER', function(err, response, body) {});

                      var message = CONFIG.NOTIFICATION.YOUR_BILLING_AMOUNT_PAID_SUCCESSFULLY;
                      var options = {
                        'job_id': request.job_id,
                        'user_id': bookings.user._id
                      };
                      push.sendPushnotification(bookings.tasker._id, message, 'payment_paid', 'ANDROID', options, 'PROVIDER', function(err, response, body) {});

                      data.status = 1;
                      data.response = res.__('Cash received successfully');
                      res.send(data);
                    });
                  }
                });
              } else {
                data.response = ('You cannot do this action right now.');
                res.send(data);
              }
            }
          });
        }
      });
    }


    controller.taskerAvailability = function(req, res) {


      req.checkBody('tasker', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('availability', res.__('Please Select Your Availability')).notEmpty();
      var data = {};
      data.status = 0;
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      var request = {};
      request.tasker = req.body.tasker;
      request.availability = req.body.availability;
      db.UpdateDocument('tasker', {
        '_id': request.tasker,
        'role': 'tasker'
      }, {
        'availability': request.availability
      }, {}, function(err, response) {
        if (err || response.nModified == 0) {
          data.response = res.__('Invalid ' + CONFIG.TASKER);
          res.send(data);
        } else {
          db.GetOneDocument('tasker', { _id: request.tasker }, { 'status': 1 }, {}, function(err, tasker) {
            if (err || !tasker) {
              data.response = res.__("Unable to fetch data!");
              res.send(data);
            } else {
              data.status = tasker.status;
              data.response = {};
              data.response.tasker_status = request.availability;
              data.response.message = res.__('Availability Updated');
              console.log("data", data.response);
              res.send(data);
            }
          });
        }
      });
    }


    /* source code start */

    controller.registerStp1 = function(req, res) {
      console.log('req.body first call', req.body);
      req.checkBody({
        'firstname': {
          notEmpty: true,
          errorMessage: res.__('Firstname is required'),
        },
        'lastname': {
          notEmpty: true,
          errorMessage: res.__('Lastname is required'),
        },
        'email': {
          notEmpty: true,
          isEmail: {
            errorMessage: res.__('Invalid Email Address')
          },
          errorMessage: res.__('Email is required')
        },
        'gender': {
          notEmpty: true,
          errorMessage: res.__('Gender is required')
        },
        'dob': {
          notEmpty: true,
          errorMessage: res.__('dob is required')
        },
        'availability_address': {
          notEmpty: true,
          errorMessage: res.__('Availability address is required')
        },
        'location_lat': {
          notEmpty: true,
          errorMessage: res.__('Latitude is required')
        },
        'location_lng': {
          notEmpty: true,
          errorMessage: res.__('Longitude is required')
        }
      });

      var data = {};
      data.status = '0';

      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }

      var availableTimingSlotList = [{ slot: 0, time: "12AM - 1AM", selected: false }, { slot: 1, time: "1AM - 2AM", selected: false }, { slot: 2, time: "2AM - 3AM", selected: false }, { slot: 3, time: "3AM - 4AM", selected: false }, { slot: 4, time: "4AM - 5AM", selected: false }, { slot: 5, time: "5AM - 6AM", selected: false }, { slot: 6, time: "6AM - 7AM", selected: false }, { slot: 7, time: "7AM - 8AM", selected: false }, { slot: 8, time: "8AM - 9AM", selected: false }, { slot: 9, time: "9AM - 10AM", selected: false }, { slot: 10, time: "10AM - 11AM", selected: false }, { slot: 11, time: "11AM - 12PM", selected: false }, { slot: 12, time: "12PM - 1PM", selected: false }, { slot: 13, time: "1PM - 2PM", selected: false }, { slot: 14, time: "2PM - 3PM", selected: false }, { slot: 15, time: "3PM - 4PM", selected: false }, { slot: 16, time: "4PM - 5PM", selected: false }, { slot: 17, time: "5PM - 6PM", selected: false }, { slot: 18, time: "6PM - 7PM", selected: false }, { slot: 19, time: "7PM - 8PM", selected: false }, { slot: 20, time: "8PM - 9PM", selected: false }, { slot: 21, time: "9PM - 10PM", selected: false }, { slot: 22, time: "10PM - 11PM", selected: false }, { slot: 23, time: "11PM - 12AM", selected: false }];

      var workingDays = [
    { day: "Sunday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
    { day: "Monday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false },
    { day: "Tuesday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false},
    { day: "Wednesday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false},
    { day: "Thursday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false},
    { day: "Friday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false},
    { day: "Saturday", slot: JSON.parse(JSON.stringify( availableTimingSlotList )), selected: false, wholeday: false}];

      db.GetOneDocument('tasker', { email: req.body.email }, {}, {}, function(err, emaildocs) {
        if (err || emaildocs) {
          data.response = res.__("Email Already Exists!");
          res.send(data);
        } else {

          var birthday = moment(req.body.dob, "MM-DD-YYYY");
          var age = moment().diff(birthday, 'years');

          if (age < 18) {
            data.response = res.__("Yours Age Should Be 18+");
            res.send(data);
          } else {
            data.status = '1';
            data.response = req.body;
            data.working_days = workingDays;
            data.profile_details = req.body.profile_details ? req.body.profile_details: '';
            data.response.message = res.__("Success");
            res.send(data);
          }
        }
      });
    };

    controller.registerStp2 = function(req, res) {
      req.checkBody('work_address', res.__('Invalid address')).notEmpty();
      req.checkBody('work_lat', res.__('Lat is required')).notEmpty();
      req.checkBody('work_long', res.__('Long is required')).notEmpty();
      req.checkBody('radius', res.__('Invalid radius')).notEmpty();

      var data = {};
      data.status = '0';

      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }

      data.status = '1';
      data.response = req.body;
      data.response.message = res.__("Success");
      console.log("final available data", data);
      res.send(data);
    }

    controller.registerStp3 = function(req, res) {

      var data = {};
      data.status = '0';

      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }

      data.status = '1';
      data.response = req.body;
      data.response.message = res.__("Success");
      res.send(data);

    }

    controller.imageupload = function(req, res) {

      var data = {};
      data.response = {};
      var imagedata = {};
      if (req.files) {
        imagedata.image = attachment.get_attachment(req.files.image[0].destination, req.files.image[0].filename);
        imagedata.img_name = req.files.image[0].filename;
        imagedata.img_path = req.files.image[0].destination.substring(2);
        imagedata.filename = GLOBAL_CONFIG.site_url + 'uploads/images/tasker/' + imagedata.img_name;
        data.status = '1';
        data.response.image = imagedata.filename;
        data.response.message = res.__("Success");
        res.send(data);
      }
    };

    controller.taskerregister = function(req, res) {
      console.log("req.body", req.body);
      var data = {};
      data.status = '0';

      req.checkBody('avatar', res.__('Invalid Avatar')).optional();
      req.checkBody('firstname', res.__('Invalid Firstname')).notEmpty();
      req.checkBody('lastname', res.__('Invalid Lastname')).notEmpty();
      req.checkBody('phone', res.__('Phone number is required')).notEmpty();
      req.checkBody('email', res.__('Email is required')).notEmpty();
      req.checkBody('gender', res.__('Gender is required')).notEmpty();
      req.checkBody('dob', res.__('Invalid Birth Date')).notEmpty();
      req.checkBody('profile_details', res.__('Invalid Profile Details')).optional();
      req.checkBody('working_days', res.__('Invalid Working Days')).optional();
      req.checkBody('availability_address', res.__('Invalid Availability Address')).notEmpty();
      req.checkBody('radius', res.__('Invalid Radius')).optional();
      req.checkBody('location_lng', res.__('Invalid Location Latitude')).notEmpty();
      req.checkBody('location_lat', res.__('Invalid Location Longitude')).notEmpty();
      req.checkBody('taskerskills', res.__('Invalid Tasker Skills')).notEmpty();
      req.checkBody('deviceToken', res.__('Invalid Device Token')).optional();
      req.checkBody('gcm_id', res.__('Invalid Device Token')).optional();

      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }

      var tasker = {};
      tasker.username = req.body.firstname + ' ' + req.body.lastname;
      tasker.firstname = req.body.firstname;
      tasker.lastname = req.body.lastname;
      tasker.email = req.body.email;
      tasker.phone = req.body.phone;

      tasker.avatar = '';
      if (req.body.image) {
        var image1 = library.splitURL(req.body.image);
        tasker.avatar = image1.pathname.substr(1);
      }

      tasker.gender = req.body.gender.toLowerCase();

      var birthday = {};
      birthday.year = moment(req.body.dob, "MM-DD-YYYY").year();
      birthday.month = moment(req.body.dob, "MM-DD-YYYY").month() + 1;
      birthday.date = moment(req.body.dob, "MM-DD-YYYY").date();
      tasker.birthdate = birthday;

      tasker.radius = req.body.radius;
      tasker.availability_address = req.body.availability_address;
      tasker.location = {
        'lng': req.body.location_lng,
        'lat': req.body.location_lat
      };
      tasker.profile_details = req.body.profile_details;

      tasker.taskerskills = [];
      var raw_taskerskills = req.body.taskerskills;

      for (var i = 0; i < raw_taskerskills.length; i++) {
        var skills = {};
        skills.categoryid = raw_taskerskills[i].categoryid;
        skills.childid = raw_taskerskills[i].childid;
        //skills.quick_pitch = raw_taskerskills[i].quick_pitch;
        skills.hour_rate = raw_taskerskills[i].hour_rate;
        skills.experience = raw_taskerskills[i].experience;
        skills.status = 1;
        tasker.taskerskills.push(skills);
      }

      tasker.working_days = req.body.working_days;

      tasker.role = 'tasker';
      tasker.tasker_status = 1;
      tasker.status = 3;

      var request = {};
      request.phone = req.body.phone.number;
      request.deviceToken = req.body.deviceToken;
      request.gcm = req.body.gcm_id;

      db.InsertDocument('tasker', tasker, function(err, response) {
        if (err) {
          data.response = res.__("Unable to Register Tasker, Please Try Again");
          res.send(data);
        } else {
          db.GetDocument('tasker', { 'phone.number': request.phone }, {}, {}, function(err, tasker) {
        if (err) {
          data.response = res.__("Sorry you are not a valid " + CONFIG.TASKER);
          res.send(data);
        } else {
          if (tasker[0].status == 1 || tasker[0].status == 3) {
            db.UpdateDocument('tasker', {'phone.number': request.phone }, { 'activity.last_login': new Date() }, {}, function(err, response) {
              if (err || response.nModified == 0) {
                res.send({
                  "status": 0,
                  "message": res.__('Please check the Credential and try again')
                });
              } else {
                db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function(err, currencies) {
                  if (err) {
                  res.send(err);
                  } else {
                    if (request.deviceToken) {
                      db.UpdateDocument('tasker', { 'phone.number': request.phone }, {
                      'device_info.device_type': 'ios',
                      'device_info.device_token': request.deviceToken,
                      'activity.last_login': new Date()
                      }, {}, function(err, response) {
                        if (err || response.nModified == 0) {
                          res.send({
                          "status": 0,
                          "message": res.__('Please check the Credential and try again')
                          });
                        } else {
                          data.status = 1;
                          data.verified_status = 3;
                          data.response = {};
                          data.response.provider_id = tasker[0]._id;

                          if (tasker[0].avatar) {
                            data.response.provider_image = GLOBAL_CONFIG.site_url + tasker[0].avatar;
                          } else {
                            data.response.provider_image = GLOBAL_CONFIG.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                          }

                          data.response.provider_name = tasker[0].username;
                          data.response.firstname = tasker[0].firstname;
                          data.response.lastname = tasker[0].lastname;
                          data.response.email = tasker[0].email;
                          data.response.currency = currencies.code;

                          var mailData = {};
                          mailData.template = 'Taskersignupmessagetotasker';
                          mailData.to = tasker[0].email;
                          mailData.html = [];
                          mailData.html.push({
                            name: 'taskername',
                            value: tasker[0].username
                          });
                          mailcontent.sendmail(mailData, function(err, response) {});

                          data.response.message = res.__('You are Logged In successfully');
                          res.send(data);
                        }
                      });
                    } else {
                      db.UpdateDocument('tasker', {'phone.number': request.phone }, {
                      'device_info.device_type': 'android',
                      'device_info.gcm': request.gcm,
                      'activity.last_login': new Date()
                      }, {}, function(err, response) {
                        if (err || response.nModified == 0) {
                          res.send({
                          "status": 0,
                          "message": res.__('Please check the Credential and try again')
                          });
                        } else {
                          data.status = 1;
                          data.verified_status = 3;
                          data.response = {};
                          data.response.provider_id = tasker[0]._id;

                          if (tasker[0].avatar) {
                            data.response.provider_image = GLOBAL_CONFIG.site_url + tasker[0].avatar;
                          } else {
                            data.response.provider_image = GLOBAL_CONFIG.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                          }

                          data.response.provider_name = tasker[0].username;
                          data.response.firstname = tasker[0].firstname;
                          data.response.lastname = tasker[0].lastname;
                          data.response.email = tasker[0].email;
                          data.response.currency = currencies.code;

                          var mailData = {};
                          mailData.template = 'Taskersignupmessagetotasker';
                          mailData.to = tasker[0].email;
                          mailData.html = [];
                          mailData.html.push({
                            name: 'taskername',
                            value: tasker[0].username
                          });
                          mailcontent.sendmail(mailData, function(err, response) {});

                          data.response.message = res.__('You are Logged In successfully');
                          res.send(data);
                        }
                      });
                    }
                  }
                });
              }
            });
          }
        }
      });
          /*data.status = 1;
          data.verified_status = 3;
          data.response = res.__("Success");
          res.send(data);*/
        }
      });
    }

    /* controller.registerParentCategory = function (req, res) {

        var data = {};
        data.status = '1';
        data.response = req.body;

        db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
            if (err || !currencies) {
                res.send({
                    "status": 0,
                    "message": res.__('Error')
                });
            } else {
                db.GetAggregation('category', [
                    { $match: { 'status': { $eq: 1 }, parent: { $exists: false } } },
                    {
                        $project: {
                            _id: '$_id',
                            name: '$name',
                            icon: { '$cond': ["$activeicon", { $concat: [GLOBAL_CONFIG.site_url, "$activeicon"] }, { $literal: GLOBAL_CONFIG.site_url + CONFIG.CATEGORY_DEFAULT_IMAGE }] }
                        }
                    }
                ], function (err, categoryes) {
                    if (err) {
                        res.send(err);
                    } else {

                        data.response = {};
                        data.response.categories = categoryes;
                        data.response.currency = currencies.symbol;
                        res.send(data);
                    }
                });
            }
        });
    }

    controller.registerChildCategory = function (req, res) {
        var data = {};
        data.status = '1';
        data.response = req.body;

        req.checkBody('category', res.__('category id Required')).notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
            if (err || !currencies) {
                res.send({
                    "status": 0,
                    "message": res.__('Error')
                });
            } else {
                db.GetAggregation('category', [
                    { $match: { 'parent': new mongoose.Types.ObjectId(req.body.category) } },
                    {
                        $project: {
                            _id: '$_id',
                            name: '$name',
                            minimum_hourly_rate: '$commision',
                            icon: { '$cond': ["$activeicon", { $concat: [GLOBAL_CONFIG.site_url, "$activeicon"] }, { $literal: GLOBAL_CONFIG.site_url + CONFIG.CATEGORY_DEFAULT_IMAGE }] }
                        }
                    },
                ], function (err, category) {
                    if (err) {
                        res.send({ "status": "0", "errors": res.__("Check The Category Id Is Correct") });
                    } else {
                        data.response = {};
                        data.response.categories = category;
                        data.response.currency = currencies.symbol;
                        res.send(data);
                    }
                });
            }
        });
    }

    controller.registerExperience = function (req, res) {
        db.GetDocument('experience', { 'parent': req.body.category_id }, { 'name': 1 }, {}, function (err, experiences) {
            if (err || !experiences) {
                res.send(err);
            } else {
                res.send(experiences);
            }
        });
    }

    controller.registerQuestions = function (req, res) {
        var data = {};
        data.status = '0';

        db.GetDocument('question', { 'status': 1 }, { 'question': 1 }, {}, function (err, questions) {
            if (err || !questions) {
                res.send(err);
            } else {
                data.status = '1';
                data.response = questions;
                res.send(data);
            }
        });
    } */


    controller.registerParentCategory = function(req, res) {
      db.GetAggregation('category', [{
          $match: {
            'status': {
              $eq: 1
            },
            parent: {
              $exists: false
            }
          }
        },
        {
          $project: {
            _id: '$_id',
            name: '$name'
          }
        }
      ], function(err, categoryes) {
        if (err) {
          res.send(err);
        } else {
          res.send(categoryes);
        }
      });
    }

    controller.registerChildCategory = function(req, res) {
      req.checkBody('category', res.__('category id Required')).notEmpty();
      var errors = req.validationErrors();
      if (errors) {
        res.send({
          "status": "0",
          "errors": errors[0].msg
        });
        return;
      }

      db.GetAggregation('category', [{
          $match: {
            'parent': new mongoose.Types.ObjectId(req.body.category)
          }
        },
        {
          $project: {
            _id: '$_id',
            name: '$name',
            minimum_hourly_rate: '$commision',
            ratetype: '$ratetype'
          }
        }
      ], function(err, category) {
        if (err) {
          res.send({
            "status": "0",
            "errors": res.__("Check The Category Id Is Correct")
          });
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
                var data = {};
                data.category = category;
                data.currency = currencies;
                res.send(data);
            }
          });
        }
      });

    }

    controller.registerExperience = function(req, res) {
      db.GetDocument('experience', {
        'parent': req.body.category_id
      }, {
        'name': 1
      }, {}, function(err, experiences) {
        if (err || !experiences) {
          res.send(err);
        } else {
          res.send(experiences);
        }
      });
    }

    controller.registerQuestions = function(req, res) {

      var data = {};
      data.status = '0';

      db.GetDocument('question', {
        'status': 1
      }, {
        'question': 1
      }, {}, function(err, questions) {
        if (err || !questions) {
          res.send(err);
        } else {
          db.GetOneDocument('settings', {'alias': 'general'}, {}, {}, function(err, settings) {
            if (err || !settings) {
              data.response = res.__('Configure your website settings');
              res.send(data);
            } else {
                data.distanceby = settings.settings.distanceby;
                data.status = '1';
                data.response = questions;
                res.send(data);
            }
          });
        }
      });
    }

    controller.registerStep1 = function(req, res) {
      var lang = 'en'
      if (req.query.lang) {
        lang = req.query.lang;
      }
      res.setLocale(lang);
      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err || !settings) {
          data.response = res.__('Configure your website settings');
          res.send(data);
        } else {
          if (!req.session.tasker) {
            req.session.tasker = {};
          }

          if (!req.session.tasker.name) {
            req.session.tasker.name = {};
          }

          // req.session.tasker.name.first_name = req.body.firstname || req.session.tasker.name.first_name || '';
          // req.session.tasker.name.last_name = req.body.lastname || req.session.tasker.name.last_name || '';
          req.session.tasker.name = req.body.username || req.session.tasker.username || '';
          req.session.tasker.username = req.body.username || req.session.tasker.username || '';
          req.session.tasker.email = req.body.email || req.session.tasker.email || '';

          if (!req.session.tasker.phone) {
            req.session.tasker.phone = {};
          }
          req.session.tasker.phone.code = req.body.phoneno || req.session.tasker.phone.code || '';
          req.session.tasker.phone.number = req.body.phoneno || req.session.tasker.phone.number || '';

          if (!req.session.tasker.gender) {
            req.session.tasker.gender = {};
          }
          req.session.tasker.gender = req.body.gender || req.session.tasker.gender || '';
          req.session.tasker.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null) || '';


          var data = {};
          data.siteurl = settings.settings.site_url;
          data.logo = settings.settings.logo;
          data.formdata = req.session.tasker;
          data.lang = lang;
          data.Tasker = CONFIG.TASKER;
          res.render('mobile/register/step1', data);
        }
      });
    }

    controller.registerStep2 = function(req, res) {
      var lang = 'en'
      if (req.query.lang) {
        lang = req.query.lang;
      }
      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err || !settings) {
          data.response = res.__('Configure your website settings');
          res.send(data);
        } else {
          var data = {};
          data.siteurl = settings.settings.site_url;
          data.logo = settings.settings.logo;
          req.checkBody('username', res.__('Username Required')).notEmpty();
          req.checkBody('email', res.__('Email Required')).notEmpty();
          req.checkBody('password', res.__('Password Required')).notEmpty();
          req.checkBody('gender', res.__('Gender Required')).optional();
          req.checkBody('phonenumber', res.__('Phoneno Required')).notEmpty();
          req.session.tasker = {};
          req.session.tasker.name = {};
          // req.session.tasker.name.first_name = req.body.firstname || '';
          // req.session.tasker.name.last_name = req.body.lastname || '';
          req.session.tasker.name = req.body.username || '';
          req.session.tasker.username = req.body.username || '';
          req.session.tasker.email = req.body.email || '';
          req.session.tasker.role = 'tasker';
          req.session.tasker.phone = {};
          if (req.body.phone) {
            req.session.tasker.phone.code = req.body.phone.code || '';
            req.session.tasker.phone.number = req.body.phone.number || '';
          }
          req.session.tasker.gender = req.body.gender || '';
          req.session.tasker.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null) || '';

          data.formdata = req.session.tasker;
          data.lang = lang;
          data.Tasker = CONFIG.TASKER;
          data.errors = req.validationErrors();

          if (data.errors) {
            res.redirect('/mobile/provider/register');
          } else {
            db.GetDocument('tasker', {
              $or: [{
                'username': req.body.username
              }, {
                'email': req.body.email
              }, {
                'phone.number': req.body.phone.number
              }]
            }, {}, {}, function(err, emaildocs) {
              if (err) {
                res.redirect("http://" + req.headers.host + '/mobile/registration/failed');
              } else {
                db.GetDocument('tasker', {
                  $or: [{
                    'username': req.body.username
                  }, {
                    'email': req.body.email
                  }, {
                    'phone.number': req.body.phone.number
                  }]
                }, {}, {}, function(err, emaildocs) {
                  if (err) {
                    res.redirect("http://" + req.headers.host + '/mobile/registration/failed');
                  } else {
                    if (emaildocs.length >= 1) {
                      var value = '';
                      if (emaildocs.status != "Active") {
                        if (emaildocs[0].username == req.body.username) {
                          value = value + ' ' + "Username" + ' ';
                        }
                        if (emaildocs[0].email == req.body.email) {
                          value = value + ' ' + "Email Address" + ' ';
                        }
                        if ((emaildocs[0].phone.code == req.body.phone.code) && (emaildocs[0].phone.number == req.body.phone.number)) {
                          if (emaildocs[0].email == req.body.email || emaildocs[0].username == req.body.username) {
                            value = value + "And Phone Number ";
                          } else {
                            value = value + " Phone Number ";
                          }
                        }
                        res.redirect("http://" + req.headers.host + '/mobile/registration/failed?value=' + value);
                      } else {
                        // res.redirect("http://" + req.headers.host + '/mobile/registration/failed'+ value);
                      }
                    } else {
                      req.session.taskerStep1 = true;
                      res.render('mobile/register/step2', data);
                    }
                  }
                });
              }
            });
          }
        }
      });
    }

    controller.registerStep3 = function(req, res) {

      var lang = 'en'
      if (req.query.lang) {
        lang = req.query.lang;
      }
      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err || !settings) {
          res.redirect('/mobile/provider/register/step2');
        } else {
          var data = {};
          data.siteurl = settings.settings.site_url;
          data.logo = settings.settings.logo;
          data.lang = lang;
          data.Tasker = CONFIG.TASKER;
          req.checkBody('address', res.__('Address Required')).notEmpty();
          req.checkBody('unitnumber', res.__('Unitnumber Required')).optional();
          data.errors = req.validationErrors();

          if (req.body.address) {
            //res.render('register/step2', data);
            //res.redirect('/mobile/provider/register/step2');
            //} else {

            var a = req.body.address;
            var words = a.split(", ");
            var wlength = words.length;
            var countrye = wlength - 1;
            var state = wlength - 2;
            var city = wlength - 3;

            var line_1 = 0;
            var line_2 = 1;
            var line_3 = 2;

            var addressline1 = ''
            if (req.body.unitnumber) {
              addressline1 += req.body.unitnumber;
            }
            if (words[line_1] && !req.body.unitnumber) {
              addressline1 += words[line_1];
            }
            if (words[line_1] && req.body.unitnumber) {
              addressline1 += ', ' + words[line_1];
            }
            if (words[line_2]) {
              addressline1 += ', ' + words[line_2];
            }

            var addressline2 = ''
            if (words[line_3]) {
              addressline2 += words[line_3];
            }

            var birth_day = req.body.example4_.day || "";
            var birth_month = req.body.example4_.month || "";
            var birth_year = req.body.example4_.year || "";

            req.session.tasker.address = {};
            // req.session.tasker.address.line1 = req.body.unitnumber || req.session.tasker.unitnumber || '';
            req.session.tasker.address.formatted_address = req.body.address;
            req.session.tasker.address.line1 = addressline1;
            req.session.tasker.address.line2 = addressline2;
            req.session.tasker.address.city = words[city];
            req.session.tasker.address.state = words[state];
            req.session.tasker.address.country = words[countrye];
            req.session.tasker.address.zipcode = req.body.zipcode;

            req.session.tasker.birthdate = {};
            req.session.tasker.birthdate.year = req.body.example4_.year || "";
            req.session.tasker.birthdate.month = req.body.example4_.month || "";
            req.session.tasker.birthdate.date = req.body.example4_.day || "";
            data.formdata = req.session.tasker;

            req.session.taskerStep2 = true;
            res.render('mobile/register/step3', data);
          } else {
            res.render('mobile/register/step3', data);
          }
        }
      });
    }

    controller.registerStep4 = function(req, res) {


      var lang = 'en'
      if (req.query.lang) {
        lang = req.query.lang;
      }
      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err || !settings) {
          data.response = res.__('Configure your website settings');
          res.send(data);
        } else {
          var image = [];
          var data = {};

          if (req.body.userimage64) {
            var base64 = req.body.userimage64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            var fileName = Date.now().toString() + '.png';
            var file = './uploads/images/tasker/' + fileName;
            library.base64Upload({
              file: file,
              base64: base64[2]
            }, function(err, response) {
              Jimp.read(file).then(function(lenna) {
                lenna.resize(200, 200) // resize
                  .quality(100) // set JPEG quality
                  .write(settings.settings.site_url + './uploads/images/tasker/thumb/' + fileName); // save
              }).catch(function(err) {});
            });
            req.session.tasker.avatar = 'uploads/images/tasker/' + fileName;
            data.img_name = fileName;
            data.img_path = 'uploads/images/tasker/';
            data.lang = lang;
            data.Tasker = CONFIG.TASKER;
          }

          db.GetOneDocument('settings', {
            'alias': 'general'
          }, {}, {}, function(err, settings) {
            if (err || !settings) {
              data.response = res.__('Configure your website settings');
              res.send(data);
            } else {

              var data = {};
              data.siteurl = settings.settings.site_url;
              data.logo = settings.settings.logo;
              data.lang = lang;
              data.Tasker = CONFIG.TASKER;
              data.distanceby = settings.settings.distanceby;
              data.tasker_radius = settings.settings.tasker_radius;
              console.log("data.tasker_radius",data.tasker_radius);
              data.workingday = [{
                  day: 'Sunday',
                  label: 'Sun',
                  hour: {
                    morning: true,
                    afternoon: false,
                    evening: false
                  }
                },
                {
                  day: 'Monday',
                  label: 'Mon',
                  hour: {
                    morning: true,
                    afternoon: false,
                    evening: false
                  }
                },
                {
                  day: 'Tuesday',
                  label: 'Tue',
                  hour: {
                    morning: true,
                    afternoon: false,
                    evening: false
                  }
                },
                {
                  day: 'Wednesday',
                  label: 'Wed',
                  hour: {
                    morning: true,
                    afternoon: false,
                    evening: false
                  }
                },
                {
                  day: 'Thursday',
                  label: 'Thur',
                  hour: {
                    morning: true,
                    afternoon: false,
                    evening: false
                  }
                },
                {
                  day: 'Friday',
                  label: 'Fri',
                  hour: {
                    morning: true,
                    afternoon: false,
                    evening: false
                  }
                },
                {
                  day: 'Saturday',
                  label: 'Sat',
                  hour: {
                    morning: true,
                    afternoon: false,
                    evening: false
                  }
                }
              ];
              req.session.taskerStep3 = true;
              res.render('mobile/register/step4', data);
            }
          });
        }
      });
    }


    controller.registerStep5 = function(req, res) {



      var lang = 'en'
      if (req.query.lang) {
        lang = req.query.lang;
      }
      if (req.body.working_days) {
        for (var i = 0; i < req.body.working_days.length; i++) {
          if (req.body.working_days[i].hour) {
            req.body.working_days[i].hour.morning = req.body.working_days[i].hour.morning ? true : false;
            req.body.working_days[i].hour.afternoon = req.body.working_days[i].hour.afternoon ? true : false;
            req.body.working_days[i].hour.evening = req.body.working_days[i].hour.evening ? true : false;
          }
        }
        req.session.tasker.working_days = req.body.working_days;
      }

      req.session.tasker.location = {};
      req.session.tasker.location.lng = req.body.lng || '';
      req.session.tasker.location.lat = req.body.lat || '';

      if (!req.body.lng || !req.body.lat) {
        res.redirect("http://" + req.headers.host + '/mobile/registration/latlon');
      } else {
        req.session.tasker.radius = req.body.radius || '';
        db.GetDocument('experience', {
          status: 1
        }, {}, {}, function(err, experiences) {
          if (err) {
            data.response = res.__('Configure your Questions');
            res.send(data);
          } else {
            db.GetOneDocument('currencies', {
              'default': 1
            }, {}, {}, function(err, currencies) {
              if (err || !currencies) {
                data.response = res.__('Configure your Questions');
                res.send(data);
              } else {
                db.GetOneDocument('settings', {
                  'alias': 'general'
                }, {}, {}, function(err, settings) {
                  if (err || !settings) {
                    data.response = 'Configure your website settings';
                    res.send(data);
                  } else {
                    db.GetDocument('category', {
                      'status': 1
                    }, {}, {}, function(err, categorys) {
                      if (err || !settings) {
                        data.response = res.__('Configure your Questions');
                        res.send(data);
                      } else {
                        db.GetAggregation('category', [{
                            $match: {
                              'status': {
                                $eq: 1
                              },
                              parent: {
                                $exists: false
                              }
                            }
                          },
                          {
                            $lookup: {
                              from: 'categories',
                              localField: "_id",
                              foreignField: "parent",
                              as: "category"
                            }
                          },
                          {
                            $project: {
                              _id: '$_id',
                              name: '$name',
                              slug: '$slug',
                              parent: '$parent',
                              category: '$category',
                              category: {
                                $filter: {
                                  input: "$category",
                                  as: "category",
                                  cond: {
                                    $eq: ["$$category.status", 1]
                                  }
                                }
                              },
                              commision: '$commision',
                              skills: '$skills'
                            }
                          }
                        ], function(err, categorys) {

                          if (err) {
                            res.send(err);
                          } else {
                            var category = [];
                            var symbol = [];
                            var data = {};
                            data.symbol = currencies.symbol;
                            data.category = categorys;
                            data.siteurl = settings.settings.site_url;
                            data.logo = settings.settings.logo;
                            data.experiences = experiences;
                            data.lang = lang;
                            data.Tasker = CONFIG.TASKER;
                            req.session.taskerStep4 = true;
                            res.render('mobile/register/step6', data);
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
    }

    controller.registerStep6 = function(req, res) {
      var lang = 'en'
      if (req.query.lang) {
        lang = req.query.lang;
      }
      if (req.body.profiledetails) {
        for (var i = 0; i < req.body.profiledetails.length; i++) {
          req.body.profiledetails[i].question = req.body.profiledetails[i].question.replace(/^"(.*)"$/, '$1');
        }
        if (!req.session.tasker) {
          req.session.tasker = {};
        }
        req.session.tasker.profile_details = req.body.profiledetails;
      }

      db.GetDocument('experience', {
        status: 1
      }, {}, {}, function(err, experiences) {
        if (err) {
          data.response = res.__('Configure your Questions');
          res.send(data);
        } else {
          db.GetOneDocument('currencies', {
            'default': 1
          }, {}, {}, function(err, currencies) {
            if (err || !currencies) {
              data.response = res.__('Configure your Questions');
              res.send(data);
            } else {
              db.GetOneDocument('settings', {
                'alias': 'general'
              }, {}, {}, function(err, settings) {
                if (err || !settings) {
                  data.response = 'Configure your website settings';
                  res.send(data);
                } else {
                  db.GetDocument('category', {
                    'status': 1
                  }, {}, {}, function(err, categorys) {
                    if (err || !settings) {
                      data.response = res.__('Configure your Questions');
                      res.send(data);
                    } else {
                      db.GetAggregation('category', [{
                          $match: {
                            'status': {
                              $eq: 1
                            },
                            parent: {
                              $exists: false
                            }
                          }
                        },
                        {
                          $lookup: {
                            from: 'categories',
                            localField: "_id",
                            foreignField: "parent",
                            as: "category"
                          }
                        },
                        {
                          $project: {
                            _id: '$_id',
                            name: '$name',
                            slug: '$slug',
                            parent: '$parent',
                            category: '$category',
                            category: {
                              $filter: {
                                input: "$category",
                                as: "category",
                                cond: {
                                  $eq: ["$$category.status", 1]
                                }
                              }
                            },
                            commision: '$commision',
                            skills: '$skills'
                          }
                        }
                      ], function(err, categorys) {

                        if (err) {
                          res.send(err);
                        } else {
                          var category = [];
                          var symbol = [];
                          var data = {};
                          data.symbol = currencies.symbol;
                          data.category = categorys;
                          data.siteurl = settings.settings.site_url;
                          data.logo = settings.settings.logo;
                          data.experiences = experiences;
                          data.lang = lang;
                          data.Tasker = CONFIG.TASKER;
                          req.session.taskerStep6 = true;
                          res.render('mobile/register/step6', data);
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

    controller.registerSuccess = function(req, res) {
      var lang = 'en'
      if (req.query.lang) {
        lang = req.query.lang;
      }
      var data = {};
      data.lang = lang;
      data.Tasker = CONFIG.TASKER;
      if (req.body.taskerskills) {
        var taskerskillsJSON = JSON.parse(req.body.taskerskills);

        var taskerskills = [];
        for (var prop in taskerskillsJSON) {
          taskerskills.push(taskerskillsJSON[prop]);
        }

        if (!req.session.tasker) {
          req.session.tasker = {};
        } else {
          req.session.tasker.taskerskills = taskerskills;
          req.session.taskerStep6 = true;
        }
      }
      req.session.tasker.status = 3;
      console.log("req.session", req.session)
      if (req.session.taskerStep1 && req.session.taskerStep2 && req.session.taskerStep3 && req.session.taskerStep4 && req.session.taskerStep6) {
        db.InsertDocument('tasker', req.session.tasker, function(err, result) {
          console.log("errrrrr", err)
          if (err || !result) {
            res.redirect("http://" + req.headers.host + '/mobile/registration/finalfailed');
          } else {
            db.GetOneDocument('settings', {
              'alias': 'general'
            }, {}, {}, function(err, settings) {
              if (err || !settings) {
                data.response = res.__('Configure your website settings');
                res.send(data);
              } else {
                var data = {};
                data.siteurl = settings.settings.site_url;
                data.logo = settings.settings.logo;

                res.render('mobile/register/success', data);
                var name;
                if (result.name) {
                  name = result.name.first_name + " (" + result.username + ")";
                } else {
                  name = result.username;
                }
                var mailData = {};
                mailData.template = 'Taskersignupmessagetoadmin';
                mailData.to = "";
                mailData.html = [];
                mailData.html.push({
                  name: 'username',
                  value: name
                });
                mailcontent.sendmail(mailData, function(err, response) {});

                var mailData1 = {};
                mailData1.template = 'Taskersignupmessagetotasker';
                mailData1.to = result.email;
                mailData1.html = [];
                mailData1.html.push({
                  name: 'username',
                  value: name
                });
                mailcontent.sendmail(mailData1, function(err, response) {});

              }
            });
          }
        });
      } else {
        res.redirect("http://" + req.headers.host + '/mobile/registration/timeout');
      }
    }

    controller.registerCancel = function(req, res) {
      var lang = 'en'
      if (req.query.lang) {
        lang = req.query.lang;
      }
      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err || !settings) {
          data.response = res.__('Configure your website settings');
          res.send(data);
        } else {
          var data = {};
          data.lang = lang;
          data.Tasker = CONFIG.TASKER;
          data.siteurl = settings.settings.site_url;
          data.logo = settings.settings.logo;
          res.render('mobile/register/success', data);
        }
      });
    }

    controller.registerFailed = function(req, res) {
      var lang = 'en'
      if (req.query.lang) {
        lang = req.query.lang;
      }
      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err || !settings) {
          data.response = res.__('Configure your website settings');
          res.send(data);
        } else {
          var data = {};
          data.lang = lang;
          data.Tasker = CONFIG.TASKER;
          data.siteurl = settings.settings.site_url;
          data.logo = settings.settings.logo;
          res.render('mobile/registration-failed', data);
        }
      });
    }

    controller.settingsMail = function(req, res) {
      var data = {};
      data.status = '0';
      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err || !settings) {
          data.response = res.__('Configure your website settings');
          res.send(data);
        } else {
          if (settings.settings.email_address) {
            res.send({
              "status": '1',
              "Mail_id": settings.settings.email_address
            });
          } else {
            res.send({
              "status": '0',
              "mail_id": res.__('Invalid mail_id')
            });
          }
        }
      });
    }

    controller.providerTransaction = function(req, res) {

      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
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
      request.tasker_id = req.body.provider_id;
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
      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          db.GetOneDocument('tasker', {
            '_id': request.tasker_id
          }, {}, {}, function(err, tasker) {
            if (err || !tasker) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
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
                  var query = {
                    'tasker': new mongoose.Types.ObjectId(request.tasker_id),
                    'status': {
                      "$eq": 7
                    }
                  };
                  if (req.body.from && req.body.to) {
                    query = {
                      'tasker': new mongoose.Types.ObjectId(request.tasker_id),
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
                  db.GetCount('task', query, function(err, count) {
                    if (err || count == 0) {
                      res.send(data);
                    } else {
                      data.response.total_jobs = count;
                      db.GetAggregation('task', [{
                          $match: query
                        },
                        {
                          "$lookup": {
                            from: "users",
                            localField: "user",
                            foreignField: "_id",
                            as: "user"
                          }
                        },
                        {
                          "$lookup": {
                            from: "categories",
                            localField: "category",
                            foreignField: "_id",
                            as: "category"
                          }
                        },
                        {
                          "$sort": sorting
                        },
                        {
                          $unwind: "$user"
                        },
                        {
                          $unwind: "$category"
                        },
                        {
                          "$skip": (request.perPage * (request.page - 1))
                        },
                        {
                          "$limit": request.perPage
                        }
                      ], function(err, bookings) {
                        if (err || bookings.length == 0) {
                          res.send(data);
                        } else {
                          for (var i = 0; i < bookings.length; i++) {
                            var job = {};
                            job.job_id = bookings[i].booking_id;
                            job.currency_code = currencies.code;
                            job.category_name = bookings[i].category.name || '';
                            job.job_date = timezone.tz(bookings[i].history.job_closed_time, settings.settings.time_zone).format(settings.settings.date_format);
                            job.job_time = timezone.tz(bookings[i].history.job_closed_time, settings.settings.time_zone).format(settings.settings.time_format);
                            job.exactaddress = bookings[i].task_address.exactaddress;
                            if (bookings[i].invoice.amount.extra_amount) {
                              job.total_amount = (((bookings[i].invoice.amount.total + bookings[i].invoice.amount.extra_amount) * currencies.value) - (bookings[i].invoice.amount.admin_commission * currencies.value)).toFixed(2) || '';
                            } else {
                              job.total_amount = ((bookings[i].invoice.amount.total * currencies.value) - (bookings[i].invoice.amount.admin_commission * currencies.value)).toFixed(2) || '';
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

    controller.providerjobTransaction = function(req, res) {

      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
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
      request.tasker_id = req.body.provider_id;
      request.booking_id = req.body.booking_id;

      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, settings) {
        if (err) {
          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
          res.send(data);
        } else {
          db.GetOneDocument('tasker', {
            '_id': request.tasker_id
          }, {}, {}, function(err, tasker) {
            if (err || !tasker) {
              data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
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
                  var query = {
                    'tasker': new mongoose.Types.ObjectId(request.tasker_id),
                    'status': {
                      "$eq": 7
                    },
                    'booking_id': request.booking_id
                  };
                  if (req.body.from && req.body.to) {
                    query = {
                      'tasker': new mongoose.Types.ObjectId(request.tasker_id),
                      'status': {
                        "$eq": 7
                      },
                      'booking_id': request.booking_id
                    };
                  }
                  data.status = '1';
                  data.response = {};
                  data.response.jobs = [];
                  db.GetCount('task', query, function(err, count) {
                    if (err || count == 0) {
                      data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data3');
                      res.send(data);
                    } else {
                      //  data.response.total_jobs = count;
                      db.GetAggregation('task', [{
                          $match: query
                        },
                        {
                          "$lookup": {
                            from: "users",
                            localField: "user",
                            foreignField: "_id",
                            as: "user"
                          }
                        },
                        {
                          "$lookup": {
                            from: "categories",
                            localField: "category",
                            foreignField: "_id",
                            as: "category"
                          }
                        },
                        {
                          $unwind: "$user"
                        },
                        {
                          $unwind: "$category"
                        }
                      ], function(err, bookings) {
                        if (err || bookings.length == 0) {
                          data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
                          res.send(data);
                        } else {
                          for (var i = 0; i < bookings.length; i++) {
                            var job = {};
                            job.job_id = bookings[i].booking_id;
                            job.category_name = bookings[i].category.name || '';
                            job.ratetype = bookings[i].category.ratetype || '';
                            job.ratetypestatus = bookings[i].category.ratetype == "Flat" ? 1 : 2;
                            job.total_amount = ((bookings[i].invoice.amount.total * currencies.value) - (bookings[i].invoice.amount.admin_commission * currencies.value)).toFixed(2) || '';
                            // if (bookings[i].invoice.amount.extra_amount) {
                            //   job.total_amount = (((bookings[i].invoice.amount.total + bookings[i].invoice.amount.extra_amount) * currencies.value) - (bookings[i].invoice.amount.admin_commission * currencies.value)).toFixed(2) || '';
                            // }
                            if (bookings[i].user) {
                              if (bookings[i].user.username) {
                                job.user_name = bookings[i].user.username;
                              } else {
                                job.user_name = "";
                              }
                            }
                            job.location = bookings[i].booking_information.location || '';
                            job.total_hrs = bookings[i].invoice.worked_hours_human || '';

                            if (bookings[i].invoice.amount.extra_amount) {
                              job.meterial_fee = (bookings[i].invoice.amount.extra_amount * currencies.value).toFixed(2);
                            } else {
                              job.meterial_fee = "";
                            }

                            job.payment_mode = bookings[i].payment_type || '';
                            job.currencycode = currencies.code;
                            job.lat_provider = bookings[i].task_address.lat || '';
                            job.lng_provider = bookings[i].task_address.lng || '';
                            job.exactaddress = bookings[i].task_address.exactaddress || '';
                            job.service_address = bookings[i].service_address || '';

                            job.per_hour = (bookings[i].hourly_rate * currencies.value).toFixed(2) || '';
                            job.min_hrly_rate = (bookings[i].invoice.amount.minimum_cost * currencies.value).toFixed(2) || '';
                            job.task_amount = (bookings[i].invoice.amount.total * currencies.value).toFixed(2) || '';
                            job.admin_commission = (bookings[i].invoice.amount.admin_commission * currencies.value).toFixed(2) || '';
                            if (bookings[i].createdAt) {
                              job.booking_time = timezone.tz(bookings[i].booking_information.booking_date, settings.settings.time_zone).format(settings.settings.date_format + ',' + settings.settings.time_format);
                            } else {
                              job.booking_time = '';
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

    controller.getReviewsby = function(req, res) {

      req.checkBody('user_id', res.__('Enter valid ' + CONFIG.USER + '_id')).notEmpty(); //yyyy-mm-dd hh:mm:ss
      req.checkBody('role', res.__('Enter valid role')).notEmpty(); //yyyy-mm-dd hh:mm:ss

      var data = {};
      data.status = '0';

      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      var request = {};

      request.user_id = req.body.user_id;
      request.role = req.body.role;

      data.response = {};
      data.response.reviews = [];

      var extension = {
        sort: {
          updatedAt: -1
        }
      };
      extension.populate = 'user tasker task';
      if (req.body.role == 'user') {
        db.GetDocument('review', {
          'user': new mongoose.Types.ObjectId(request.user_id),
          type: 'tasker'
        }, {}, extension, function(err, docdata) {
          if (err || !docdata) {
            var datas = {};
            datas.data = {};
            datas.data.status = '0';
            datas.data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
            res.send(datas);
          } else {
            db.GetCount('review', {
              'user': new mongoose.Types.ObjectId(request.user_id),
              type: 'tasker'
            }, function(err, count) {
              if (err || count == 0) {
                var datas = {};
                datas.data = {};
                datas.data.status = '0';
                datas.data.response = res.__('You have not received any reviews yet');
                res.send(datas);

              } else {
                db.GetOneDocument('settings', {
                  'alias': 'general'
                }, {}, {}, function(err, responses) {
                  if (err) {
                    var datas = {};
                    datas.data = {};
                    datas.data.status = '0';
                    datas.data.response = res.__('You have not received any reviews yet');
                    res.send(datas);
                  } else {
                    var total_rating = 0;
                    data.status = '1';
                    for (var i = 0; i < docdata.length; i++) {
                      var review = {};
                      review.booking_id = docdata[i].task.booking_id;
                      review.category = docdata[i].task.booking_information.work_type;
                      review.tasker_name = docdata[i].tasker.username;
                      review.rating = docdata[i].rating;
                      total_rating = total_rating + docdata[i].rating;
                      review.comments = docdata[i].comments;
                      review.date = timezone.tz(docdata[i].createdAt, responses.settings.time_zone).format(responses.settings.date_format + ',' + responses.settings.time_format);
                      if (docdata[i].image) {
                        review.image = responses.settings.site_url + docdata[i].image;
                      } else {
                        review.image = '';
                      }
                      if (docdata[i].tasker.avatar) {
                        review.tasker_image = responses.settings.site_url + docdata[i].tasker.avatar;
                      } else {
                        review.tasker_image = responses.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                      }
                      data.response.reviews.push(review);
                    }
                    if (docdata.length > 0) {
                      var reviewcount = docdata.length;
                      data.response.avg_rating = total_rating / reviewcount;

                    }
                    res.send({
                      count: count,
                      data
                    });

                  }
                });

              }
            });
          }
        });
      } else {
        db.GetDocument('review', {
          'tasker': new mongoose.Types.ObjectId(request.user_id),
          type: 'user'
        }, {}, extension, function(err, docdata) {
          if (err) {
            var datas = {};
            datas.data = {};
            datas.data.status = '0';
            datas.data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
            res.send(datas);
          } else {
            db.GetCount('review', {
              'tasker': new mongoose.Types.ObjectId(request.user_id),
              type: 'user'
            }, function(err, count) {
              if (err) {
                var datas = {};
                datas.data = {};
                datas.data.status = '0';
                datas.data.response = res.__('You have not received any reviews yet');
                res.send(datas);
              } else {
                // res.send({ count: count, result: docdata });
                db.GetOneDocument('settings', {
                  'alias': 'general'
                }, {}, {}, function(err, responses) {
                  if (err || count == 0) {
                    var datas = {};
                    datas.data = {};
                    datas.data.status = '0';
                    datas.data.response = res.__('You have not received any reviews yet');
                    res.send(datas);
                  } else {
                    data.status = '1';
                    for (var i = 0; i < docdata.length; i++) {
                      var review = {};
                      review.booking_id = docdata[i].task.booking_id;
                      review.category = docdata[i].task.booking_information.work_type;
                      review.user_name = docdata[i].user.username;
                      review.rating = docdata[i].rating;
                      review.comments = docdata[i].comments;
                      review.date = timezone.tz(docdata[i].createdAt, responses.settings.time_zone).format(responses.settings.date_format + ',' + responses.settings.time_format);
                      if (docdata[i].image) {
                        review.image = responses.settings.site_url + docdata[i].image;
                      } else {
                        review.image = '';
                      }
                      if (docdata[i].user.avatar) {
                        review.user_image = responses.settings.site_url + docdata[i].user.avatar;
                      } else {
                        review.user_image = responses.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                      }
                      data.response.reviews.push(review);
                    }
                    res.send({
                      count: count,
                      data
                    });
                  }
                });
              }
            });
          }
        });
      }
    };



    controller.getdetailReviews = function(req, res) {

      req.checkBody('user_id', res.__('Enter valid ' + CONFIG.USER + '_id')).notEmpty(); //yyyy-mm-dd hh:mm:ss
      req.checkBody('role', res.__('Enter valid role')).notEmpty(); //yyyy-mm-dd hh:mm:ss
      req.checkBody('task_id', res.__('Enter valid task_id')).notEmpty(); //yyyy-mm-dd hh:mm:ss

      var data = {};
      data.status = '0';

      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      var request = {};

      request.user_id = req.body.user_id;
      request.role = req.body.role;
      request.task_id = req.body.task_id;

      data.response = {};
      data.response.reviews = [];

      var extension = {
        sort: {
          updatedAt: -1
        }
      };
      extension.populate = 'user tasker task';
      if (req.body.role == 'user') {
        db.GetDocument('review', {
          'user': new mongoose.Types.ObjectId(request.user_id),
          'task': new mongoose.Types.ObjectId(request.task_id),
          type: 'user'
        }, {}, extension, function(err, docdata) {
          if (err) {
            data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
            res.send(data);
          } else {
            db.GetCount('review', {
              'user': new mongoose.Types.ObjectId(request.user_id),
              'task': new mongoose.Types.ObjectId(request.task_id),
              type: 'user'
            }, function(err, count) {
              if (err || count == 0) {
                data.response = res.__('You have not received any reviews yet');
                res.send(data);
              } else {
                db.GetOneDocument('settings', {
                  'alias': 'general'
                }, {}, {}, function(err, responses) {
                  if (err) {
                    data.response = res.__('You have not received Messages yet');
                    res.send(data);
                  } else {
                    data.status = '1';
                    for (var i = 0; i < docdata.length; i++) {
                      var review = {};
                      review.booking_id = docdata[i].task.booking_id;
                      review.tasker = docdata[i].tasker.username;
                      review.rating = docdata[i].rating;
                      review.comments = docdata[i].comments;
                      data.response.reviews.push(review);
                    }
                    res.send({
                      count: count,
                      data
                    });
                  }
                });

              }
            });
          }
        });
      } else {
        db.GetDocument('review', {
          'tasker': new mongoose.Types.ObjectId(request.user_id),
          'task': new mongoose.Types.ObjectId(request.task_id),
          type: 'tasker'
        }, {}, extension, function(err, docdata) {
          if (err) {
            data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
            res.send(data);
          } else {
            db.GetCount('review', {
              'tasker': new mongoose.Types.ObjectId(request.user_id),
              'task': new mongoose.Types.ObjectId(request.task_id),
              type: 'tasker'
            }, function(err, count) {
              if (err) {
                data.response = res.__('You have not received any reviews yet');
                res.send(data);
              } else {
                // res.send({ count: count, result: docdata });
                db.GetOneDocument('settings', {
                  'alias': 'general'
                }, {}, {}, function(err, responses) {
                  if (err || count == 0) {
                    data.response = res.__('You have not received Messages yet');
                    res.send(data);
                  } else {
                    data.status = '1';
                    for (var i = 0; i < docdata.length; i++) {
                      var review = {};
                      review.booking_id = docdata[i].task.booking_id;
                      review.user = docdata[i].user.username;
                      review.rating = docdata[i].rating;
                      review.comments = docdata[i].comments;
                      data.response.reviews.push(review);
                    }
                    res.send({
                      count: count,
                      data
                    });
                  }
                });
              }
            });
          }
        });
      }
    };

    controller.getNotification = function(req, res) {


      req.checkBody('user_id', res.__('Enter valid ' + CONFIG.USER + '_id')).notEmpty(); //yyyy-mm-dd hh:mm:ss
      req.checkBody('role', res.__('Enter valid role')).notEmpty(); //yyyy-mm-dd hh:mm:ss
      req.checkBody('page', res.__('Enter valid page')).optional();
      req.checkBody('perPage', res.__('Enter valid perPage')).optional();
      req.checkBody('orderby', res.__('Enter valid orderby')).optional();
      req.checkBody('sortby', res.__('Enter valid sortby')).optional();
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
      request.user_id = req.body.user_id;
      request.role = req.body.role;
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

      var condition = {};
      if (request.role == 'tasker') {
        condition = {
          tasker: request.user_id,
          type: request.role,
          status: 1
        };
      } else if (request.role == 'user') {
        condition = {
          user: request.user_id,
          type: request.role,
          status: 1
        };
      }

      db.GetOneDocument('settings', {
        'alias': 'general'
      }, {}, {}, function(err, responses) {
        if (err) {
          data.response = res.__('You have not received any notifications yet');
          res.send(data);
        } else {
          db.UpdateDocument('notifications', condition, {
            status: 2
          }, {
            multi: true
          }, function(err, result) {
            if (err) {
              data.response = res.__('You have not received any notifications yet');
              res.send(data);
            } else {
              var icondition = {};
              if (request.role == 'tasker') {
                icondition = {
                  'status': {
                    $ne: 0
                  },
                  'tasker': mongoose.Types.ObjectId(request.user_id),
                  'type': request.role
                };
              } else if (request.role == 'user') {
                icondition = {
                  'status': {
                    $ne: 0
                  },
                  'user': mongoose.Types.ObjectId(request.user_id),
                  'type': request.role
                };
              }
              var condition = [{
                  $match: icondition
                },
                {
                  $lookup: {
                    'from': 'task',
                    'localField': 'raw_data.key0',
                    'foreignField': 'booking_id',
                    'as': 'task'
                  }
                },
                {
                  "$sort": sorting
                },
                // {"$sort":{ createdAt: -1 }},
                {
                  $unwind: "$task"
                },
                {
                  $project: {
                    'task': '$task._id',
                    'booking_id': '$task.booking_id',
                    'Category': '$task.booking_information.work_type',
                    'message': 1,
                    'createdAt': 1,
                    '_id': 1,
                    'tasktime': '$task.updatedAt'
                  }
                },
                {
                  $group: {
                    '_id': "$booking_id",
                    'task': {
                      "$first": '$task'
                    },
                    'booking_id': {
                      "$first": '$booking_id'
                    },
                    'category': {
                      "$first": '$Category'
                    },
                    'tasktime': {
                      "$first": '$tasktime'
                    },
                    'messages': {
                      $push: {
                        "createdAt": "$createdAt",
                        'message': "$message"
                      }
                    }
                  }
                },
                {
                  "$sort": {
                    'tasktime': -1
                  }
                },
                {
                  "$skip": (request.perPage * (request.page - 1))
                },
                {
                  "$limit": request.perPage
                },
                {
                  $project: {
                    '_id': 0,
                    'task': 1,
                    'booking_id': 1,
                    'category': 1,
                    'messages': 1,
                    'tasktime': 1
                  }
                },
              ];
              db.GetAggregation('notifications', condition, function(err, notifications) {
                if (err || notifications.length == 0) {
                  data.response = res.__('You have not received any notifications yet');
                  res.send(data);
                } else {
                  data.status = 1;
                  for (var i = 0; i < notifications.length; i++) {
                    for (var j = 0; j < notifications[i].messages.length; j++) {
                      notifications[i].messages[j].createdAt = timezone.tz(notifications[i].messages[j].createdAt, responses.settings.time_zone).format(responses.settings.date_format + ',' + responses.settings.time_format);
                    }
                  }
                  data.response = notifications;
                  res.send(data);
                }
              });
            }
          });
        }
      });
    };



    controller.detailNotification = function(req, res) {

      req.checkBody('user_id', res.__('Enter valid ' + CONFIG.USER + '_id')).notEmpty();
      req.checkBody('role', res.__('Enter valid role')).notEmpty();
      req.checkBody('job_id', res.__('Enter valid job_id')).notEmpty();

      var data = {};
      data.status = '0';

      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      var request = {};

      request.user_id = req.body.user_id;
      request.role = req.body.role;
      request.task_id = req.body.job_id;
      data.response = {};
      data.response.reviews = [];
      if (req.body.role == 'user') {
        db.GetDocument('notifications', {
          'user': new mongoose.Types.ObjectId(request.user_id),
          'raw_data.key0': request.task_id,
          type: 'user'
        }, {}, {}, function(err, docdata) {
          if (err || docdata.length == 0) {
            data.response = res.__('Invalid ' + CONFIG.USER + ', Please check your data');
            res.send(data);
          } else {
            db.GetCount('notifications', {
              'user': new mongoose.Types.ObjectId(request.user_id),
              'raw_data.key0': request.task_id,
              type: 'user'
            }, function(err, count) {
              if (err || count == 0) {
                data.response = res.__('You have not received any notifications yet');
                res.send(data);
              } else {
                db.GetOneDocument('settings', {
                  'alias': 'general'
                }, {}, {}, function(err, responses) {
                  if (err) {
                    data.response = res.__('You have not received any notifications yet');
                    res.send(data);
                  } else {
                    data.status = '1';
                    for (var i = 0; i < docdata.length; i++) {
                      var review = {};
                      review.message = docdata[i].raw_data.message;
                      review.date = timezone.tz(docdata[i].createdAt, responses.settings.time_zone).format(responses.settings.date_format + ',' + responses.settings.time_format);
                      data.response.reviews.push(review);
                    }
                    res.send({
                      count: count,
                      data
                    });
                  }
                });

              }
            });
          }
        });
      } else {
        db.GetDocument('notifications', {
          'tasker': new mongoose.Types.ObjectId(request.user_id),
          'raw_data.key0': request.task_id,
          type: 'tasker'
        }, {}, {}, function(err, docdata) {
          if (err || docdata.length == 0) {
            data.response = res.__('Invalid ' + CONFIG.TASKER + ', Please check your data');
            res.send(data);
          } else {
            db.GetCount('notifications', {
              'tasker': new mongoose.Types.ObjectId(request.user_id),
              'raw_data.key0': request.task_id,
              type: 'tasker'
            }, function(err, count) {
              if (err) {
                data.response = res.__('You have not received any notifications yet');
                res.send(data);
              } else {
                db.GetOneDocument('settings', {
                  'alias': 'general'
                }, {}, {}, function(err, responses) {
                  if (err || count == 0) {
                    data.response = res.__('You have not received any notifications yet');
                    res.send(data);
                  } else {
                    data.status = '1';
                    for (var i = 0; i < docdata.length; i++) {
                      var review = {};
                      review.message = docdata[i].raw_data.message;
                      review.date = timezone.tz(docdata[i].createdAt, responses.settings.time_zone).format(responses.settings.date_format + ',' + responses.settings.time_format);
                      data.response.reviews.push(review);
                    }
                    res.send({
                      count: count,
                      data
                    });
                  }
                });
              }
            });
          }
        });
      }
    };

    controller.updateWorkingdays = function(req, res) {
      console.log("req.body", req.body);
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      req.sanitizeBody('provider_id').trim();
      var request = {};
      request.provider_id = req.body.provider_id;
      if (req.body.working_days) {
        request.working_days = req.body.working_days;
      }

      db.GetOneDocument('tasker', {
        '_id': request.provider_id,
        'status': {
          $ne: 0
        }
      }, {}, {}, function(err, bookings) {
        console.log("err", err);
        console.log("bookings", bookings);
        if (err || !bookings) {
          data.response = res.__('Invalid ' + CONFIG.TASKER);
          res.send(data);
        } else {
          db.UpdateDocument('tasker', {
            '_id': request.provider_id
          }, {
            'working_days': request.working_days
          }, {}, function(err, response) {
            if (err || response.nModified == 0) {
              console.log("err", err);
              res.send({
                "status": 0,
                "message": res.__('Invalid ' + CONFIG.TASKER)
              });
            } else {
              console.log("successfully");
              data.status = '1';
              data.message = res.__('Availability days updated successfully')
              res.send(data);
            }
          });
        }
      });
    };

    controller.getCategoryList = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      req.sanitizeBody('provider_id').trim();
      var request = {};
      request.provider_id = req.body.provider_id;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id,
        'status': {
          $ne: 0
        }
      }, {}, {}, function(err, bookings) {
        if (err || !bookings) {
          data.response = res.__('Invalid ' + CONFIG.TASKER);
          res.send(data);
        } else {

          db.GetDocument('experience', {
            status: 1
          }, {
            '_id': 1,
            'name': 1
          }, {}, function(err, experiences) {
            if (err) {
              data.response = res.__('Configure your Questions');
              res.send(data);
            } else {
              db.GetOneDocument('currencies', {
                'default': 1
              }, {}, {}, function(err, currencies) {
                if (err || !currencies) {
                  data.response = res.__('Configure your Questions');
                  res.send(data);
                } else {
                  db.GetOneDocument('settings', {
                    'alias': 'general'
                  }, {}, {}, function(err, settings) {
                    if (err || !settings) {
                      data.response = res.__('Configure your website settings');
                      res.send(data);
                    } else {
                      db.GetAggregation('category', [{
                          $match: {
                            'status': {
                              $eq: 1
                            },
                            parent: {
                              $exists: false
                            }
                          }
                        },
                        {
                          $lookup: {
                            from: 'categories',
                            localField: "_id",
                            foreignField: "parent",
                            as: "category"
                          }
                        },
                        {
                          $project: {
                            _id: '$_id',
                            name: '$name',
                            parent: '$parent',
                            category: '$category',
                            commision: '$commision'
                          }
                        }
                      ], function(err, categorys) {
                        if (err) {
                          res.send(err);
                        } else {
                          var data = {};
                          var symbol = [];
                          data.status = '1';
                          data.symbol = currencies.symbol;
                          data.experiences = experiences;
                          data.category = [];
                          for (var i = 0; i < categorys.length; i++) {
                            for (var j = 0; j < categorys[i].category.length; j++) {
                              var job = {};
                              job.parent_category = categorys[i].name;
                              job.parent_id = categorys[i].category[j].parent;
                              job.sub_category = categorys[i].category[j].name;
                              job.sub_id = categorys[i].category[j]._id;
                              job.minimum_cost = (categorys[i].category[j].commision * currencies.value).toFixed(2);
                              data.category.push(job);
                            }
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

    controller.downloadlanguage = function downloadlangauge(req , res){
      db.GetOneDocument('settings', {'alias': 'general'}, {}, {}, function(err, settings) {
        var filepath = settings.settings.site_url + "uploads/locales/ar.json";
        console.log("filepath",filepath)
        res.download(filepath);
      });
    }

    controller.updateCategory = function(req, res) {
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      var data = {};
      data.status = '0';
      var errors = req.validationErrors();
      if (errors) {
        data.response = errors[0].msg;
        res.send(data);
        return;
      }
      req.sanitizeBody('provider_id').trim();
      var request = {};
      request.provider_id = req.body.provider_id;

      db.GetOneDocument('tasker', {
        '_id': request.provider_id,
        'status': {
          $ne: 0
        }
      }, {}, {}, function(err, bookings) {
        if (err || !bookings) {
          data.response = res.__('Invalid ' + CONFIG.TASKER);
          res.send(data);
        } else {
          if (req.body.taskerskills) {
            db.UpdateDocument('tasker', {
              '_id': request.provider_id
            }, {
              'taskerskills': req.body.taskerskills
            }, {}, function(err, response) {
              if (err || response.nModified == 0) {
                res.send({
                  "status": 0,
                  "message": res.__('Invalid ' + CONFIG.TASKER)
                });
              } else {
                data.status = '1';
                data.message = res.__('Categories updated successfully')
                res.send(data);
              }
            });
          } else {
            res.send({
              "status": 0,
              "message": res.__('Invalid input')
            });
          }
        }
      });
    };

    controller.getearnings = function(req, res) {

      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      var errors = [];
      errors = req.validationErrors();
      if (errors) {
        res.send({
          "status": "0",
          "errors": errors[0].msg
        });
        return;
      }
      var data = {};
      var request = {};
      request.provider_id = req.body.provider_id;
      db.GetOneDocument('currencies', {
        'default': 1
      }, {}, {}, function(err, currencies) {
        if (err || !currencies) {
          res.send({
            "status": 0,
            "message": res.__('Invalid ' + CONFIG.TASKER + ', Please check your data')
          });
        } else {
          db.GetDocument('task', {
            'tasker': request.provider_id,
            'status': 7
          }, {}, {}, function(err, taskdata) {
            if (err) {
              data.status = '0';
              data.response = res.__('Unable to get your stats, Please check your data');
              res.send(data);
            } else {
              var total = 0;
              var admin = 0;
              for (var i = 0; i < taskdata.length; i++) {
                total += taskdata[i].invoice.amount.total;
                admin += taskdata[i].invoice.amount.admin_commission;
                var final = ((total - admin) * currencies.value).toFixed(2);
              }

              var CurrentDate = new Date();
              var StatsDate = CurrentDate.setMonth(CurrentDate.getMonth() - 12);
              var pipeline = [{
                  $match: {
                    'status': 7,
                    tasker: new mongoose.Types.ObjectId(request.provider_id),
                    'booking_information.booking_date': {
                      $gt: CurrentDate,
                      $lt: new Date()
                    }
                  }
                },
                {
                  $project: {
                    'status': 1,
                    'booking_information': 1,
                    'invoice': 1,
                    'month': {
                      $month: "$booking_information.booking_date"
                    },
                    'year': {
                      $year: "$booking_information.booking_date"
                    }
                  }
                },
                {
                  $group: {
                    '_id': {
                      year: '$year',
                      month: '$month'
                    },
                    'status': {
                      $first: '$status'
                    },
                    'month': {
                      $first: '$month'
                    },
                    'year': {
                      $first: '$year'
                    },
                    'amount': {
                      $sum: '$invoice.amount.total'
                    },
                    'adminEarnings': {
                      $sum: '$invoice.amount.admin_commission'
                    }
                  }
                },
                {
                  $group: {
                    '_id': '$status',
                    'status': {
                      $first: '$status'
                    },
                    'earnings': {
                      $push: {
                        'month': '$month',
                        'year': '$year',
                        'amount': {
                          $sum: '$amount'
                        },
                        'admin_earnings': {
                          $sum: '$adminEarnings'
                        }
                      }
                    },
                    'total_earnings': {
                      $sum: '$amount'
                    }
                  }
                }
              ];
              db.GetAggregation('task', pipeline, function(err, bookings) {
                if (err) {
                  data.status = '0';
                  data.response = res.__('Unable to get your stats, Please check your data');
                  res.send(data);
                } else {
                  data.status = '1';
                  data.response = {};
                  var earning = [];
                  var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  var monthNamesval = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

                  if (bookings.length == 0) {
                    for (var i = 0; i < 12; i++) {
                      var amount = 0;
                      var admin_earnings = 0;
                      var CurrentDate = new Date();
                      var StatsDate = CurrentDate.setMonth(CurrentDate.getMonth() - i);
                      var StatsMonth = CurrentDate.getMonth() + 1;
                      var StatsYear = CurrentDate.getFullYear();
                      earning.push({
                        'month': monthNames[StatsMonth - 1],
                        'monthval': monthNamesval[StatsMonth - 1],
                        'amount': 0,
                        'admin_earnings': 0
                      });
                    }
                    data.response.unit = '';
                    data.response.total_earnings = 0;
                    data.response.interval = 0;
                    data.response.earnings = earning;
                    data.response.max_earnings = 0;
                    data.response.currency_code = currencies.code;
                    res.send(data);
                  } else {
                    for (var i = 0; i < 12; i++) {
                      var amount = 0;
                      var admin_earnings = 0;
                      var CurrentDate = new Date();
                      var StatsDate = CurrentDate.setMonth(CurrentDate.getMonth() - i);
                      var StatsMonth = CurrentDate.getMonth() + 1;
                      var StatsYear = CurrentDate.getFullYear();
                      if (bookings[0]) {
                        for (var j = 0; j < bookings[0].earnings.length; j++) {
                          if (StatsMonth == bookings[0].earnings[j].month && StatsYear == bookings[0].earnings[j].year) {
                            amount = bookings[0].earnings[j].amount;
                            admin_earnings = bookings[0].earnings[j].admin_earnings;
                          }
                        }
                      }
                      if (amount != 0) {
                        earning.push({
                          'month': monthNames[StatsMonth - 1],
                          'amount': ((amount - admin_earnings) * currencies.value).toFixed(2)
                        });
                      } else {
                        earning.push({
                          'month': monthNames[StatsMonth - 1],
                          'amount': 0
                        });
                      }
                    }
                    data.status = '1';
                    data.response = {};
                    data.response.life_earnings = final;
                    data.response.earnings = earning;
                    data.response.max_earnings = Math.round(Math.max.apply(Math, earning.map(function(o) {
                      return o.amount;
                    })));
                    data.response.currency_code = currencies.code;
                    res.send(data);
                  }
                }
              })
            }
          });
        }
      })
    }



    controller.billingCycle = function(req, res) {
      var data = {};
      var request = {};
      req.checkBody('provider_id', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      var errors = [];
      errors = req.validationErrors();
      if (errors) {
        res.send({
          "status": "0",
          "errors": errors[0].msg
        });
        return;
      }
      request.provider_id = req.body.provider_id;
      db.GetOneDocument('currencies', {
        'default': 1
      }, {}, {}, function(err, currencies) {
        if (err || !currencies) {
          res.send({
            "status": 0,
            "message": res.__('Invalid ' + CONFIG.TASKER + ', Please check your data')
          });
        } else {
          var extension = {};
          extension.populate = {
            path: 'task'
          };
          db.GetDocument('paid', {
            'tasker': request.provider_id
          }, {}, extension, function(err, paid) {
            if (err) {
              data.status = '0';
              data.response = res.__('Unable to get your stats, Please check your data');
              res.send(data);
            } else {
              var total = 0;
              var admin = 0;
              for (var i = 0; i < paid.length; i++) {
                total += paid[i].invoice.total.total;
                admin += paid[i].invoice.total.admin_commission;
                var final = ((total - admin) * currencies.value).toFixed(2);
              }
              data.status = '1';
              data.response = {};
              data.response.billing = final;
              res.send(data);
            }
          });
        }
      });
    }


    controller.addcategory = function addcategory(req, res) {

      req.checkBody('tasker', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('experience', res.__('Invalid Experience')).notEmpty();
      req.checkBody('hourrate', res.__('Invalid Hourly Rate')).notEmpty();
      //req.checkBody('quickpitch', res.__('Invalid Quick Pitch')).notEmpty();
      req.checkBody('parentcategory', res.__('Invalid Parent Category')).notEmpty();
      req.checkBody('childid', res.__('Invalid Child Category')).notEmpty();

      var errors = [];
      errors = req.validationErrors();
      if (errors) {
        res.send({
          "status": "0",
          "errors": errors[0].msg
        });
        return;
      }

      var userid = req.body.tasker;

      var responseData = {};
      responseData.status = '0';

      var data = {};
      data.taskerskills = {};
      data.taskerskills.experience = req.body.experience;
      data.taskerskills.hour_rate = req.body.hourrate;
      //data.taskerskills.quick_pitch = req.body.quickpitch;
      data.taskerskills.categoryid = req.body.parentcategory;
      data.taskerskills.childid = req.body.childid;
      data.taskerskills.terms = req.body.terms;
      data.taskerskills.status = 1;

      var options = {};
      options.populate = 'taskerskills.childid';
      db.GetOneDocument('tasker', {
        _id: userid,
        'taskerskills.childid': data.taskerskills.childid
      }, {
        taskerskills: 1
      }, {}, function(err, docdata) {
        if (docdata) {
          responseData.status = 0;
          responseData.response = res.__('Same Category cannot be added more then once');
          res.send(responseData);

        } else {
          db.UpdateDocument('tasker', {
            _id: userid
          }, {
            $push: {
              "taskerskills": data.taskerskills
            }
          }, function(err, result) {
            if (err) {
              responseData.response = res.__('Unable to add your category');
              res.send(responseData);
            } else {
              responseData.status = '1';
              responseData.response = res.__('Category added successfully');
              res.send(responseData);
            }
          });
        }
      });
    }

    controller.updatemobilecategory = function updatemobilecategory(req, res) {

      req.checkBody('tasker', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('experience', res.__('Invalid Experience')).notEmpty();
      req.checkBody('hourrate', res.__('Invalid Hourly Rate')).notEmpty();
      //req.checkBody('quickpitch', res.__('Invalid Quick Pitch')).notEmpty();
      req.checkBody('parentcategory', res.__('Invalid Parent Category')).notEmpty();
      req.checkBody('childid', res.__('Invalid Child Category')).notEmpty();

      var errors = [];
      errors = req.validationErrors();
      if (errors) {
        res.send({
          "status": "0",
          "errors": errors[0].msg
        });
        return;
      }

      var userid = req.body.tasker;

      var responseData = {};
      responseData.status = '0';

      var data = {};
      data.taskerskills = {};
      data.taskerskills.experience = req.body.experience;
      data.taskerskills.hour_rate = req.body.hourrate;
      //data.taskerskills.quick_pitch = req.body.quickpitch;
      data.taskerskills.categoryid = req.body.parentcategory;
      data.taskerskills.childid = req.body.childid;
      data.taskerskills.terms = req.body.terms;
      data.taskerskills.status = 1;

      var options = {};
      options.populate = 'taskerskills.childid';
      db.GetOneDocument('tasker', {
        _id: userid,
        'taskerskills.childid': data.taskerskills.childid
      }, {
        taskerskills: 1
      }, {}, function(err, docdata) {
        if (err) {
          responseData.status = 0;
          responseData.response = res.__('Unable to Update your category');
          res.send(responseData);
        } else {
          db.UpdateDocument('tasker', {
            _id: userid,
            'taskerskills.childid': data.taskerskills.childid
          }, {
            $set: {
              "taskerskills.$": data.taskerskills
            }
          }, function(err, result) {
            if (err) {
              responseData.response = res.__('Unable to update your category');
              res.send(responseData);
            } else {
              responseData.status = '1';
              responseData.response = res.__('Category updated successfully');
              res.send(responseData);
            }
          });
        }
      });
    }

    controller.deleteCategory = function(req, res) {

      req.checkBody('tasker', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('category', res.__('Invalid Category')).notEmpty();

      var errors = [];
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

      db.UpdateDocument('tasker', {
        _id: req.body.tasker
      }, {
        $pull: {
          "taskerskills": {
            childid: req.body.category
          }
        }
      }, function(err, result) {
        if (err) {
          data.response = res.__('Unable to delete category');
          res.send(data);
        } else {
          data.status = '1';
          data.response = res.__('Category deleted successfully');



          res.send(data);
        }
      });
    }

    controller.categoryDetail = function(req, res) {

      req.checkBody('tasker', res.__('Invalid ' + CONFIG.TASKER)).notEmpty();
      req.checkBody('category', res.__('Invalid Category')).notEmpty();

      var errors = [];
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

      var options = {};
      options.populate = 'taskerskills.childid taskerskills.categoryid taskerskills.experience';
      db.GetOneDocument('tasker', {
        _id: req.body.tasker,
        'taskerskills.childid': req.body.category
      }, {}, options, function(err, tasker) {
        if (err || !tasker) {
          data.response = res.__('Invalid ' + CONFIG.TASKER);
          res.send(data);
        } else {

          if (tasker.taskerskills) {
            var category = tasker.taskerskills.filter(function(category) {
              return category.childid._id == req.body.category;
            });
            if (category) {
              data.status = 1;
              data.response = {};

              data.response.parent_id = category[0].categoryid._id;
              data.response.parent_name = category[0].categoryid.name;
              data.response.child_id = category[0].childid._id;
              data.response.child_name = category[0].childid.name;
              data.response.experience_id = category[0].experience._id;
              data.response.experience_name = category[0].experience.name;
              data.response.quick_pitch = category[0].quick_pitch;
              data.response.hour_rate = category[0].hour_rate;
              data.response.ratetype = category[0].childid.ratetype;
              data.response.ratetypestatus = category[0].childid.ratetype == 'Flat' ? 1 : 2;
              data.response.min_hourly_rate = category[0].childid.commision;

              res.send(data);
            } else {
              data.response = res.__('Category Not Avaliable');
              res.send(data);
            }
          } else {
            data.response = res.__('Category Not Avaliable');
            res.send(data);
          }
        }
      });
    }

    function checkcattype(catid , callback){
      db.GetOneDocument('category',{'_id' : catid},{},{},function(err , resp){
        callback(resp.ratetype);
      });
    }

    return controller;
}