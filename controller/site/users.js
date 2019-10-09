module.exports = function (io) {


    var bcrypt = require('bcrypt-nodejs');
    var db = require('../../model/mongodb.js')
    var attachment = require('../../model/attachments.js');
    var middlewares = require('../../model/middlewares.js');
    var async = require("async");
    var mail = require('../../model/mail.js');
    var twilio = require('../../model/twilio.js');
    var CONFIG = require('../../config/config');
    //var otp = require('otplib/lib/authenticator');
    var library = require('../../model/library.js');
    var util = require('util');
    var taskerLibrary = require('../../model/tasker.js')(io);
    var mongoose = require("mongoose");
    var jwt = require('jsonwebtoken');

    var router = {};

    router.getusers = function (req, res) {
        var condition = { status: 1 };
        if (req.query.filter) {
            var filter = JSON.parse(req.query.filter);
            var username = filter.name;
            if (username != '' && username != '0' && typeof username != 'undefined') {
                condition['username'] = username;
            }
        }
        db.GetDocument('users', condition, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.currentUser = function (req, res) {
        db.GetAggregation('users', [{
            $match: {
                '_id': new mongoose.Types.ObjectId(req.body.currentUserData)
            }
        }, {
            $project: {
                // "name": 1,
                "address": 1,
                "addressList": 1,
                "activity": 1,
                "unique_code": 1,
                "refer_history": 1,
                "verification_code": 1,
                "status": 1,
                "tasker_status": 1,
                "privileges": 1,
                "billing_address": 1,
                "location": 1,
                "socialnetwork": 1,
                "facebook": 1,
                "twitter": 1,
                "geo": 1,
                "google": 1,
                "shipping_address": 1,
                "seller": 1,
                "birthdate": 1,
                "profile_details": 1,
                "taskerskills": 1,
                "vehicle": 1,
                "working_days": 1,
                "emergency_contact": 1,
                "banking": 1,
                "firstname": 1,
                "lastname": 1,
                "email": 1,
                "role": 1,
                "createdAt": 1,
                "updatedAt": 1,
                "phone": 1,
                "_id": 1,
                "referal_code": 1,
                "avatar": 1,
                "type": 1
                // "about": 1,
                // "gender": 1

            }
        }], function (err, docdata) {
            if (err || !docdata[0]) {
                res.send(err);
            } else {

                if (!docdata[0].avatar) {
                    docdata[0].avatar = './' + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                }
                res.send(docdata);
            }
        });
    };


    router.currentTasker = function(req, res) {
        db.GetAggregation('tasker', [{
            $match: {
                '_id': new mongoose.Types.ObjectId(req.body.currentUserData)
            }
        }, {
            $project: {
                "firstname": 1,
                "lastname": 1,
                "address": 1,
                "addressList": 1,
                "activity": 1,
                "refer_history": 1,
                "unique_code": 1,
                "verification_code": 1,
                "status": 1,
                "tasker_status": 1,
                "privileges": 1,
                "billing_address": 1,
                "location": 1,
                "socialnetwork": 1,
                "facebook": 1,
                "twitter": 1,
                "geo": 1,
                "google": 1,
                'availability_address': 1,
                "shipping_address": 1,
                "seller": 1,
                "birthdate": 1,
                "profile_details": 1,
                "taskerskills": 1,
                "vehicle": 1,
                "radius": 1,
                "radiusby": 1,
                "working_days": 1,
                "emergency_contact": 1,
                "banking": 1,
                "email": 1,
                "role": 1,
                "createdAt": 1,
                "updatedAt": 1,
                "phone": 1,
                "working_area": 1,
                "tasker_area": 1,
                "_id": 1,
                "availability": 1,
                "avatar": 1,
                "gender": 1
            }
        }], function(err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata[0]) {
                    if (!docdata[0].avatar) {
                        docdata[0].avatar = './' + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                    }
                }
                res.send(docdata);
            }
        });
    };


    router.save = function (req, res) {
        var data = {
            activity: {}
        };
        data.username = req.body.username;
        data.name = req.body.name;
        data.gender = req.body.gender;
        data.about = req.body.about;
        data.phone_no = req.body.phone_no;
        data.email = req.body.email;
        data.role = req.body.role;
        data.address = req.body.address;
        data.status = req.body.status;
        if (req.file) {
            data.avatar = attachment.get_attachment(req.file.destination, req.file.filename);
        }

        if (req.body.password_confirm) {
            data.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
        }

        if (req.body._id) {
            db.UpdateDocument('users', {
                _id: req.body._id
            }, data, {}, function (err, docdata) {

                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        } else {
            data.activity.created = new Date();
            data.status = 1;
            db.InsertDocument('users', data, function (err, result) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(result);
                }
            });
        }
    };


    router.saveforgotpasswordinfo = function (req, res) {

        var data = {};
        data.user = req.body.user
        data.reset = req.body.reset;

        db.GetOneDocument('users', { '_id': data.user, 'reset_code': data.reset }, {}, {}, function (err, docdata) {
            if (err || !docdata) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.edit = function (req, res) {
        db.GetDocument('users', {
            _id: req.body.id
        }, { password: 0 }, {}, function (err, data) {
            if (err) {
                res.send(err);
            } else {
                res.send(data);
            }
        });
    };


    router.allUsers = function getusers(req, res) {

        if (req.query.sort != "") {
            var sorted = req.query.sort;
        }

        var usersQuery = [{
            "$match": { status: { $ne: 0 } }
        }, {
            $project: {
                username: 1,
                role: 1,
                email: 1,
                dname: { $toLower: '$' + sorted }
            }
        }, {
            $project: {
                username: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];

        var sorting = {};
        var searchs = '';

        var condition = { status: { $ne: 0 } };

        if (Object.keys(req.query).length != 0) {
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

            if (req.query.search != '' && req.query.search != 'undefined' && req.query.search) {
                condition['username'] = { $regex: new RegExp('^' + req.query.search, 'i') };
                searchs = req.query.search;
                usersQuery.push({ "$match": { "documentData.username": { $regex: searchs + '.*', $options: 'si' } } });
            }
            if (req.query.sort !== '' && req.query.sort) {
                sorting = {};
                if (req.query.status == 'false') {
                    sorting["documentData.dname"] = -1;
                    usersQuery.push({ $sort: sorting });
                } else {
                    sorting["documentData.dname"] = 1;
                    usersQuery.push({ $sort: sorting });
                }
            }
            if (req.query.limit != 'undefined' && req.query.skip != 'undefined') {
                usersQuery.push({ '$skip': parseInt(req.query.skip) }, { '$limit': parseInt(req.query.limit) });
            }
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }

        db.GetAggregation('users', usersQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {

                if (docdata.length != 0) {

                    res.send([docdata[0].documentData, docdata[0].count]);
                } else {
                    res.send([0, 0]);
                }
            }
        });
    };


    router.delete = function (req, res) {
        db.UpdateDocument('users', { _id: { $in: req.body.delData } }, { status: 0 }, { multi: true }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };
    router.changePassword = function (req, res) {
        bcrypt.compare(req.body.currentPwdCheck, req.body.changeData.password, function (err, result) {
            if (result == true) {
                req.body.changeData.password = bcrypt.hashSync(req.body.pwdConfirmCheck, bcrypt.genSaltSync(8), null);
                db.UpdateDocument('users', { username: req.body.changeData.username }, req.body.changeData, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata);
                    }
                });
            } else {
                res.send("Current password is wrong");
            }
        });
    }

    router.addnewuser = function (req, res) {

        req.checkBody('user_name', ' Username is required').notEmpty();
        req.checkBody('firstname', ' firstname is required').notEmpty();
        req.checkBody('role', 'Role is invalid').notEmpty();
        req.checkBody('email', ' Valid email is required').isEmail();
        //req.checkBody('address.city', 'city is required').notEmpty();
        req.checkBody('pwd', ' Password is required').notEmpty();
        req.checkBody('location.lat', 'city is required').notEmpty();
        req.checkBody('location.lng', 'city is required').notEmpty();
        req.checkBody('confirm_pwd', ' Confirm password should match the password you entered').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.status(400).send(errors);
            return;
        }

        var uniqueno = 'QR-' + Math.floor(100000 + Math.random() * 900000);
        var data = { 'email': req.body.email, 'referal_code': uniqueno, 'username': req.body.user_name, 'role': req.body.role, 'address': req.body.address, 'location': req.body.location, 'password': bcrypt.hashSync(req.body.pwd, bcrypt.genSaltSync(8), null), 'name': { 'first_name': req.body.firstname, 'last_name': req.body.lastname }, 'activity': { 'created': req.body.today, 'modified': req.body.today, 'last_login': req.body.today, 'last_logout': req.body.today }, 'status': 1 };
        db.InsertDocument('users', data, function (err, result) {
            if (err) {
                res.send(err);
            } else {
                res.send(result);
            }
        })
    };

    router.checkreferal = function (req, res) {
        db.GetDocument('users', { unique_code: req.body.referalcode }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata.length == 0) {
                    res.send({ message: 'Invalid referal code' });
                } else {
                    res.send({ message: 'Success' });
                }
            }
        })
    };

    router.checkemail = function (req, res) {
        var email = req.body.email.toLowerCase();
        db.GetDocument('users', { email: email }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata.length == 0) {
                    res.send({ message: 'Email not exist' });
                } else {
                    res.send({ message: 'Email Exist' });
                }
            }
        })
    };

    router.checkusername = function (req, res) {
        db.GetDocument('users', { username: req.body.username }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata.length == 0) {
                    res.send({ message: CONFIG.USER + ' not exist' }); //username
                } else {
                    res.send({ message: CONFIG.USER + ' Exist' });
                }
            }
        })
    };
    router.phonecheck = function (req, res) {
        var table = '';
        if(req.body.type == 'user') {
            table = 'users';
        } else {
            table = 'tasker';
        }
        db.GetDocument(table, { "phone.code": req.body.phone.code, "phone.number": req.body.phone.number }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata.length == 0) {
                    res.send({ message: 'Phone Number not exist' });
                } else {
                    res.send({ message: 'Phone Number Exist' });
                }
            }
        })
    };


    router.checktaskeremail = function (req, res) {
        var email = req.body.email.toLowerCase();
        db.GetDocument('tasker', { email: email }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata.length == 0) {
                    res.send({ message: 'Email not exist' });
                } else {
                    res.send({ message: 'Email Exist' });
                }
            }
        })
    };

    router.taskername = function (req, res) {
        db.GetDocument('tasker', { username: req.body.tasker }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata.length == 0) {
                    res.send({ message: CONFIG.TASKER + ' not exist' });
                } else {
                    res.send({ message: CONFIG.TASKER + ' Exist' });
                }
            }
        })
    };
    router.taskerphone = function (req, res) {
        db.GetDocument('tasker', { "phone.code": req.body.phone.code, "phone.number": req.body.phone.number }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata.length == 0) {
                    res.send({ message: 'Phone not exist' });
                } else {
                    res.send({ message: 'Phone Exist' });
                }
            }
        })
    };


    /*router.checkEmail = function (req, res) {
        db.GetDocument('users', { email: req.body.email }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                var response = false;
                if (typeof docdata[0] != 'undefined') {
                    response = true;
                }
                res.send(response);
            }
        });
    }
    */

    router.LoginUser = function (req, res) {
        db.GetDocument('users', { $or: [{ username: req.body.email }, { email: req.body.email }] }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (typeof docdata[0] != 'undefined') {
                    var pass = bcrypt.compareSync(req.body.pwd, docdata[0].password);
                    if (pass == true) {
                        res.cookie('quickrabbit_session_user_id', JSON.stringify(docdata[0]._id));
                        res.cookie('quickrabbit_session_user_name', docdata[0].username);
                        res.cookie('quickrabbit_session_user_email', docdata[0].email);
                        res.cookie('quickrabbit_session_user_confirm', docdata[0].is_verified);

                        res.send(docdata);
                    } else {
                        res.send(docdata[1]); // send undefined
                    }
                } else {
                    res.send(docdata);
                }
            }
        });
    };



    router.taskerRegister = function (req, res) {
        req.body.taskerfiles = [];

        if (req.body.avatar) {
            var base64 = req.body.avatar.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            var fileName = Date.now().toString() + '.png';
            var file = './uploads/images/tasker/' + fileName;
            library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
            req.body.avatar = 'uploads/images/tasker/' + fileName;
        }

        if(CONFIG.SITE_TYPE == 'Demo') {
            req.body.status = 1;
        } else {
            req.body.status = 3;
        }

        //req.body.tasker_status = 1;
        req.body.role = 'tasker';
        req.body.username = req.body.firstname + ' ' + req.body.lastname;

        delete req.body.taskerfiles;
        delete req.body.files;
        delete req.body.taskerfile;
        delete req.body.avatarflag;
        delete req.body.next;

        var data = {};
        db.GetOneDocument('tasker', { 'email': req.body.email.toLowerCase() }, {}, {}, function (err, user) {
            if (err) {
                res.send('Unable to register');
            } else if(user) {
                res.send('Email ID already exists')
            } else {
                taskerLibrary.taskerRegister(req.body, function (err, response) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(response);
                    }
                });
            }
        });
    };


    /*
        router.taskerRegister = function (req, res) {
            req.body.taskerfiles = [];
            req.body.password = bcrypt.hashSync(req.body.pwd, bcrypt.genSaltSync(8));

            if (req.body.avatar) {
                var base64 = req.body.avatar.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                var fileName = Date.now().toString() + '.png';
                var file = './uploads/images/tasker/' + fileName;
                library.base64Upload({ file: file, base64: base64[2] }, function (err, response) {});
                req.body.avatar = 'uploads/images/tasker/' + fileName;
                req.body.img_name = fileName;
                req.body.img_path = 'uploads/images/tasker/';
            }

            req.body.tasker_status = 1;
            req.body.status = 3;
            req.body.role = 'tasker';

            delete req.body.taskerfiles;
            delete req.body.files;
            delete req.body.taskerfile;
            delete req.body.avatarflag;
            delete req.body.next;

            var data = {};
            db.GetOneDocument('tasker', { 'email': req.body.email }, {}, {}, function (err, user) {
                if (err) {
                    res.send(err);
                } else {

                    if (user) {
                        res.send('wrong');
                    }
                    else {
                        db.InsertDocument('tasker', req.body, function (err, result) {
                            if (err) {
                                data.response = 'Unable save your data';
                                res.send(data);
                            } else {
                                async.waterfall([
                                    function (callback) {
                                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                            if (err || !settings) { data.response = 'Configure your website settings'; res.send(data); }
                                            else { callback(err, settings.settings); }
                                        });
                                    },
                                    function (settings, callback) {
                                        db.GetDocument('emailtemplate', { name: { $in: ['Taskersignupmessagetoadmin', 'Taskersignupmessagetotasker'] }, 'status': { $ne: 0 } }, {}, {}, function (err, template) {
                                            if (err || !template) { data.response = 'Unable to get email template'; res.send(data); }
                                            else { callback(err, settings, template); }
                                        });
                                    }
                                ], function (err, settings, template) {
                                    var name;
                                    if (result.name) {
                                        name = result.name.first_name + " (" + result.username + ")";
                                    } else {
                                        name = result.username;
                                    }
                                    var html = template[0].email_content;
                                    html = html.replace(/{{username}}/g, name);
                                    html = html.replace(/{{privacy}}/g, settings.site_url + 'pages/privacypolicy');
                                    html = html.replace(/{{terms}}/g, settings.site_url + 'pages/termsandconditions');
                                    html = html.replace(/{{senderemail}}/g, template[0].sender_email);
                                    html = html.replace(/{{logo}}/g, settings.site_url + settings.logo);
                                    html = html.replace(/{{site_title}}/g, settings.site_title);
                                    html = html.replace(/{{site_url}}/g, settings.site_url);
                                    html = html.replace(/{{email}}/g, req.body.email);
                                    var mailOptions = {
                                        from: template[0].sender_email,
                                        to: template[0].sender_email,
                                        subject: template[0].email_subject,
                                        text: html,
                                        html: html
                                    };

                                    mail.send(mailOptions, function (err, response) { });

                                    var html1 = template[1].email_content;
                                    html1 = html1.replace(/{{username}}/g, name);
                                    html1 = html1.replace(/{{privacy}}/g, settings.site_url + 'pages/privacypolicy');
                                    html1 = html1.replace(/{{terms}}/g, settings.site_url + 'pages/termsandconditions');
                                    html1 = html1.replace(/{{senderemail}}/g, template[1].sender_email);
                                    html1 = html1.replace(/{{logo}}/g, settings.site_url + settings.logo);
                                    html1 = html1.replace(/{{site_title}}/g, settings.site_title);
                                    html1 = html1.replace(/{{site_url}}/g, settings.site_url);
                                    html1 = html1.replace(/{{email}}/g, req.body.email);
                                    var mailOptions1 = {
                                        from: template[1].sender_email,
                                        to: req.body.email,
                                        subject: template[1].email_subject,
                                        text: html1,
                                        html: html1
                                    };

                                    mail.send(mailOptions1, function (err, response) { });
                                    if (err) {
                                        res.send(err);
                                    } else {
                                        var to = req.body.phone.code + req.body.phone.number;
                                        //var message = 'Dear ' + req.body.username + '! Thank you for registering with' + settings.site_title;
                                        res.send(result);
                                    }
                                });
                            }
                        });
                    }
                }
            });
        };
    */

    router.facebooksiteregister = function (req, res) {
        if (req.body.facebookdata.name && req.body.facebookdata.email) {
            var username = req.body.facebookdata.name.toLowerCase();
            var email = req.body.facebookdata.email;
            db.GetOneDocument('users', { $or: [{ email: email }, { username: username }] }, {}, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            })
        } else {
            res.send("Error missing params");
        }
    };

    router.otpsave = function (req, res) {
        db.GetOneDocument('users', { '_id': req.body.userid, 'verification_code': { $elemMatch: { 'mobile': req.body.otpKey } } }, {}, {}, function (err, docdata) {
            if (err || docdata == null) {
                res.send(err);
            } else {
                db.UpdateDocument('users', { '_id': req.body.userid, 'verification_code': { $elemMatch: { 'mobile': req.body.otpKey } } }, { $pull: { "verification_code": { mobile: req.body.otpKey } }, 'status': 1 }, {}, function (err, data) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata);
                    }
                })
            }
        })
    }

    router.otpverifications = function (req, res) {

        var username = req.body.data;
        db.GetOneDocument('users', { $or: [{ 'email': username }, { 'phone.number': username }], 'status': { $ne: 0 } }, {}, {}, function (err, user) {
            if (err || !user) {
                res.status(400).send({ message: 'Username Is Invalid' });
            } else {
                if (user.status == 0) {
                    res.status(400).send({ message: 'Your account has been inactive please contact to admin' });
                } else {
                    if (user.status == 2) {
                        res.send(user);
                    } else {
                        db.GetOneDocument('users', { 'username': user.username, 'verification_code.mobile': { $exists: true } }, {}, {}, function (err, docdata) {
                            if (err || docdata == null) {
                                res.status(400).send({ message: 'Username Already Activated' });
                            } else {
                                res.send(docdata);
                            }
                        })
                    }
                }
            }
        })
    }

    router.activateUserAccount = function (req, res) {
        var verification_code = library.randomString(6, '#');
        db.GetOneDocument('users', { _id: req.body.userid, 'phone.number': req.body.mobile, 'verification_code.mobile': { $exists: false } }, {}, {}, function (err, user) {
            if (err || !user) {
                res.status(400).send({ message: 'Otp is already send' });
            } else {
                if (user.status == 2) {
                    var to = user.phone.code + user.phone.number;
                    //var message = 'Thank you for using Maidac! Your OTP is: ' + verification_code;
                    var message = util.format(CONFIG.SMS.USER_ACTIVATION, verification_code);
                    db.UpdateDocument('users', { '_id': req.body.userid, 'phone.number': req.body.mobile }, { $push: { "verification_code": { mobile: verification_code } } }, {}, function (err, data) {
                        if (err) {
                            res.send(err);
                        } else {
                            db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
                            if(err){
                                res.send(err);
                            }
                            else{
                                if(settings.settings.twilio.mode == 'production'){
                                    twilio.createMessage(to, '', message, function (err, response) { })
                                }
                                res.send({data , 'sms' : settings.settings.twilio.mode , 'otpkey' : verification_code });
                            }
                            // res.send(data);
                          });
                        }
                    })
                }
            }
        })
    }

    router.activateUserAccount = function (req, res) {
        var verification_code = library.randomString(6, '#');
        db.GetOneDocument('users', { _id: req.body.userid, 'phone.number': req.body.mobile, 'verification_code.mobile': { $exists: false } }, {}, {}, function (err, user) {
            if (err || !user) {
                res.status(400).send({ message: 'Otp is already send' });
            } else {
                if (user.status == 2) {
                    var to = user.phone.code + user.phone.number;
                    //var message = 'Thank you for using Maidac! Your OTP is: ' + verification_code;
                    var message = util.format(CONFIG.SMS.USER_ACTIVATION, verification_code);
                    db.UpdateDocument('users', { '_id': req.body.userid, 'phone.number': req.body.mobile }, { $push: { "verification_code": { mobile: verification_code } } }, {}, function (err, data) {
                        if (err) {
                            res.send(err);
                        } else {
                            db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
                            if(err){
                                res.send(err);
                            }
                            else{
                                if(settings.settings.twilio.mode == 'production'){
                                    twilio.createMessage(to, '', message, function (err, response) { })
                                }
                                res.send({data , 'sms' : settings.settings.twilio.mode , 'otpkey' : verification_code });
                            }
                            // res.send(data);
                          });
                        }
                    })
                }
            }
        })
    }

    router.generateotp = function (req, res) {
        var verification_code = library.randomString(6, '#');
        var to = req.body.code + req.body.phone;
        var message = util.format(CONFIG.SMS.USER_ACTIVATION, verification_code);

        db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
            if(err){
                res.send(err);
            }
            else{
                if(settings.settings.twilio.mode == 'development'){
                    res.send({'sms' : settings.settings.twilio.mode , 'otpkey' : verification_code });
                } else {
                    twilio.createMessage(to, '', message, function (err, response) { });
                    res.send({'sms' : settings.settings.twilio.mode , 'otpkey' : verification_code });
                }
            }
        });
    }

    router.resendotp = function (req, res) {
        db.GetOneDocument('users', { '_id': req.body.data, 'verification_code.mobile': { $exists: true } }, {}, {}, function (err, docdata) {
            if (err || docdata == null) {
                res.send(err);
            } else {
                var verification_code = library.randomString(6, '#');
                var to = docdata.phone.code + docdata.phone.number;
                //var message = 'Thank you for using Maidac! Your OTP is: ' + verification_code;
                var message = util.format(CONFIG.SMS.USER_ACTIVATION, verification_code);


                db.UpdateDocument('users', { '_id': req.body.data, 'verification_code': { $elemMatch: { 'mobile': docdata.verification_code[0].mobile } } }, { "verification_code.$.mobile": verification_code }, {}, function (err, data) {
                    if (err) {
                        res.send(err);
                    } else {
                        db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
                            if(err){
                                res.send(err);
                            }
                            else{
                                if(settings.settings.twilio.mode == 'production'){
                                    twilio.createMessage(to, '', message, function (err, response) { });
                                }
                                res.send({docdata , 'sms' : settings.settings.twilio.mode , 'otpkey' : verification_code });
                            }
                        });
                    }
                })
            }
        })
    };

    router.getuserdata = function (req, res) {
        db.GetOneDocument('users', { '_id': req.body.data }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        })
    }




    return router;
};