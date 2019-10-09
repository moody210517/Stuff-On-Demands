"use strict";
module.exports = function (app, io) {
    var db = require('../../model/mongodb.js');
    var bcrypt = require('bcrypt-nodejs');
    var attachment = require('../../model/attachments.js');
    var library = require('../../model/library.js');
    //var Jimp = require("jimp");
    var mongoose = require("mongoose");
    var push = require('../../model/pushNotification.js')(io);
    var CONFIG = require('../../config/config.js');
    var async = require("async");

    var router = {};

    router.getusers = function (req, res) {
        db.GetDocument('users', {}, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };
    router.currentUser = function (req, res) {
        db.GetDocument('users', {
            username: req.body.currentUserData
        }, { username: 1, privileges: 1 }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };


    router.save = function (req, res) {

console.log('req.body._id',req.body);
        var data = {
            activity: {}
        };

        req.checkBody('firstname', 'Firstname is required').notEmpty();
        req.checkBody('lastname', 'Lastname is required').notEmpty();
        req.checkBody('email', 'Invalid email').notEmpty();
        req.checkBody('phone', 'Invalid phone').optional();

        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }

        var token = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZ";
        var len = 6;
        var code = '';
        for (var i = 0; i < len; i++) {
            var rnum = Math.floor(Math.random() * token.length);
            code += token.substring(rnum, rnum + 1);
        }

        data.unique_code = code;
        data.firstname = req.body.firstname;
        data.lastname = req.body.lastname;
        data.username = req.body.firstname + ' ' + req.body.lastname;
        //data.name = req.body.name;
        data.gender = req.body.gender;
        data.about = req.body.about;
        data.phone = req.body.phone;
        data.role = req.body.role;
        data.email = req.body.email.toLowerCase();
        //data.address = req.body.address;
        data.status = req.body.status;
        //data.emergency_contact = req.body.emergency_contact;
        data.avatarBase64 = req.body.avatarBase64;

        if (data.avatarBase64) {
            var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            var fileName = Date.now().toString() + '.png';
            var file = CONFIG.DIRECTORY_USERS + fileName;
            library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
            data.avatar = attachment.get_attachment(CONFIG.DIRECTORY_USERS, fileName);
            data.img_name = encodeURI(fileName);
            data.img_path = CONFIG.DIRECTORY_USERS.substring(2);
        }


        if (req.body._id) {
            db.GetDocument('users', { "phone.code": data.phone.code, "phone.number": data.phone.number }, {}, {}, function (err, pdocdata) {
                if (err) {
                    res.send(err);
                } else {
                    if ((pdocdata.length != 0) && (pdocdata.length < 2) && (pdocdata[0]._id.toString() != req.body._id.toString())) {

                        res.send({ msg: 'Phone Number Already Exists' });
                    }
                    else {
                        db.GetDocument('users', { 'username': data.username }, {}, {}, function (err, users) {
                            if (err) {
                                res.send(err);
                            } else {
                                if ((users.length != 0) && (users.length < 2) && (users[0]._id.toString() != req.body._id.toString())) {

                                    res.send({ msg: 'Username Already Exists' });
                                } else {
                                    db.GetDocument('users', { 'email': data.email }, {}, {}, function (err, users) {
                                        if (err) {
                                            res.send(err);
                                        } else {
                                            if ((users.length != 0) && (users.length < 2) && (users[0]._id.toString() != req.body._id.toString())) {

                                                res.send({ msg: 'Email Already Exists' });
                                            } else {
                                                db.UpdateDocument('users', { _id: req.body._id }, data, {}, function (err, docdata) {
                                                    if (err) {
                                                        res.send(err);
                                                    } else {
                                                        var message = '';
                                                        var key = {};
                                                        if(req.body.status == 1) {
                                                            key = {'key': 1};
                                                            message = 'Admin has updated your profile';
                                                            push.sendPushnotification(req.body._id, message, 'admin_notification', 'ANDROID', key, 'USER', function(err, response, body) {});
                                                        } else if(req.body.status == 2) {
                                                            key = {'key': 2};
                                                            message = 'Admin has updated your profile';
                                                            push.sendPushnotification(req.body._id, message, 'admin_notification', 'ANDROID', key, 'USER', function(err, response, body) {});
                                                        }
                                                        res.send({ msg: 'success', data: docdata });
                                                    }
                                                });
                                            }
                                        }
                                    });


                                }
                            }

                        });

                    }
                }
            });

        } else {
            db.GetOneDocument('users', { "phone.code": req.body.phone.code, "phone.number": req.body.phone.number }, {}, {}, function (err, pdocdata) {
                if (err) {
                    res.send(err);
                } else {
                    if (pdocdata && pdocdata.phone.code == req.body.phone.code && pdocdata.phone.number == req.body.phone.number) {
                        res.status(400).send({ msg: 'Phone Number Already Exists' });
                        //res.send({err,msg:'PHONE NUMBER ALREADY EXISTS'});
                    } else {
                        db.GetOneDocument('users', { 'username': req.body.username, 'email': req.body.email }, {}, {}, function (err, user) {
                            if (err) {
                                res.send(err);
                            }
                            else {
                                if (user) {
                                    if (user.username == req.body.username) {
                                        res.status(400).send({ msg: 'Username or Email Already Exists' });
                                        //res.send({err,msg:'USER NAME ALREADY EXISTS'});
                                    } else {
                                        res.status(400).send({ msg: 'EMAIL ID ALREADY EXISTS' });
                                        //res.send({err,msg:'EMAIL ID  ALREADY EXISTS'});
                                    }

                                }
                                else {
                                    data.activity.created = new Date();
                                    data.status = req.body.status;
                                    //data.amountpaid = 0;
                                    db.InsertDocument('users', data, function (err, result) {
                                        if (err) {
                                            res.send(err);
                                        } else {
                                            db.GetOneDocument('settings', { alias: 'general' }, {}, {}, function (err, docdata) {
                                                if (err) {
                                                    res.send(err);
                                                } else {
                                                    res.send(result);
                                                    /*  db.InsertDocument('walletReacharge', {
                                                          'user_id': mongoose.Types.ObjectId(emailCheck._id), "total": docdata.settings.wallet.amount.welcome, 'type': 'wallet',
                                                          "transactions": [{
                                                              'credit_type': 'welcome',
                                                              'ref_id': '',
                                                              'trans_amount': docdata.settings.wallet.amount.welcome,
                                                              'trans_date': Date.now(),
                                                              'trans_id': mongoose.Types.ObjectId()
                                                          }]
                                                      }, function (err, result) {
                                                          if (err) {
                                                              res.send(err);
                                                          } else {
                                                              res.send(result);
                                                          }
                                                       });*/
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        });
                    }
                }
            });
        };
    }


    router.edit = function (req, res) {
        db.GetDocument('users', { _id: req.body.id }, { password: 0 }, {}, function (err, data) {
            if (err) {
                res.send(err);
            } else {
                if (!data[0].avatar) {
                    data[0].avatar = './' + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                }
                res.send(data);

            }
        });
    };


    router.transactionsList = function (req, res) {
        var data = {};
        data.user_id = req.body.id;

        if (req.body.id != '') {
            db.GetOneDocument('walletReacharge', { user_id: req.body.id }, {}, {}, function (userErr, userRespo) {
                if (userRespo) {

                    var usersQuery = [{
                        "$match": { user_id: new mongoose.Types.ObjectId(req.body.id) }
                    },
                    {
                        $project:
                        {
                            'transactions': 1,
                            'user_id': 1,
                            'total': 1
                        }
                    },
                    {
                        $project: {
                            //title: 1,
                            //type: 1,
                            document: "$$ROOT"
                        }
                    },
                    {
                        $group: { "_id": "$user_id", "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
                    }
                    ];

                    usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
                    usersQuery.push({ $unwind: { path: "$documentData.transactions", preserveNullAndEmptyArrays: true } });


                    //pagination
                    if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
                        usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });

                    }
                    usersQuery.push({ $group: { "_id": null, "total": { "$sum": "$count" }, "transactions": { $push: "$documentData.transactions" } } });
                    usersQuery.push({ $group: { "_id": null, "count": { "$sum": "$total" }, "documentData": { $push: "$$ROOT" } } });
                    //pagination
                    db.GetAggregation('walletReacharge', usersQuery, function (walletErr, walletRespo) {
                        if (walletErr || walletRespo.length == 0) {
                            res.send({
                                "status": "0",
                                "response": 'Data Not available'
                            });
                        } else {
                            if (walletRespo.length >= 0 && walletRespo[0].documentData[0].transactions) {
                                var total_amount = walletRespo[0].documentData[0].total;
                                var transArr = [];

                                for (var i = 0; i < walletRespo[0].documentData[0].transactions.length; i++) {

                                    var title = '';
                                    var transacData = {};
                                    transacData._id = walletRespo[0].documentData[0].transactions[i].trans_id;
                                    if (walletRespo[0].documentData[0].transactions[i].type == 'CREDIT') {
                                        if (walletRespo[0].documentData[0].transactions[i].credit_type == 'welcome') {
                                            title = 'Welcome Bonus';
                                        } else if (walletRespo[0].documentData[0].transactions[i].credit_type == 'Referral') {
                                            title = 'Referral reward';
                                            /*
                                            if (walletRespo[0].documentData[0].transactions[i].ref_id != null) {
                                                title = 'Wallet Recharge';
                                            }
                                            */
                                        } else {
                                            title = 'Wallet Recharge';
                                        }
                                    } else if (walletRespo[0].documentData[0].transactions[i].type == 'DEBIT') {
                                        //title = 'Booking for #' + walletRespo[0].documentData[0].transactions[i].ref_id;
                                        title = 'Payment by wallet';
                                    }
                                    transacData.type = walletRespo[0].documentData[0].transactions[i].type || '';
                                    transacData.trans_amount = walletRespo[0].documentData[0].transactions[i].trans_amount || 0;
                                    transacData.title = title;
                                    transacData.trans_date = new Date(walletRespo[0].documentData[0].transactions[i].trans_date);
                                    transacData.balance_amount = walletRespo[0].documentData[0].transactions[i].avail_amount;
                                    transArr.push(transacData);
                                }

                                db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
                                    if (err || !currencies) {
                                        res.send({
                                            "status": 0,
                                            "message": 'Please check the email and try again'
                                        });
                                    } else {
                                        res.send({
                                            "status": "1",
                                            "response": { 'currency': currencies.code, 'total_amount': parseInt(total_amount), 'total_transaction': walletRespo[0].documentData[0].transactions.length, 'trans': transArr, 'count': userRespo.transactions.length }
                                        })
                                    }
                                });
                            }
                        }
                    });


                } else {
                    res.send({
                        "status": "0",
                        "message": "Invalid User"
                    });
                }
            });
        }
    };




    router.allUsers = function getusers(req, res) {
        var errors = req.validationErrors();
        var query = {};
        if (req.body.status == 0) {
            query = { status: { $ne: 0 } };
        } else if(req.body.status == 5) {
            query = { status: { $eq: 0 } };
        } else {
            query = { status: { $eq: req.body.status } };
        }
        if (errors) {
            res.send(errors, 400);
            return;
        }
        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }


        var usersQuery = [{
            "$match": query
        }, {
            $project: {
                createdAt: 1,
                //updatedAt: 1,
                updatedAt:
                {
                  $cond: { if: { $eq: [ "$updatedAt", "$createdAt" ] }, then: "User Not Yet Logged In" , else:'$updatedAt'  }
                },
                username: 1,
                role: 1,
                status: 1,
                email: 1,
                phone: 1,
                dname: { $toLower: '$' + sorted },
                activity: 1
            }
        }, {
            $project: {
                username: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];


        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

        if (req.body.search) {
            var searchs = req.body.search;
            usersQuery.push({ "$match": { $or: [{ "documentData.username": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.email": { $regex: searchs + '.*', $options: 'si' } }] } });
            //search limit
            usersQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.limit && req.body.skip >= 0) {
                usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
            //search limit
        }

        var sorting = {};
        if (req.body.sort) {
            var sorter = 'documentData.' + req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            usersQuery.push({ $sort: sorting });
        } else {
            sorting["documentData.createdAt"] = -1;
            usersQuery.push({ $sort: sorting });
        }

        if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
            usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        }
        if (!req.body.search) {
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        db.GetAggregation('users', usersQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                var count = {};
                async.parallel([
                    //All user
                    function (callback) {
                        db.GetCount('users', { status: { $ne: 0 } }, function (err, allValue) {
                            if (err) return callback(err);
                            count.allValue = allValue;
                            callback();
                        });
                    },
                    //Active user
                    function (callback) {
                        db.GetCount('users', { status: { $eq: 1 } }, function (err, activeValue) {
                            if (err) return callback(err);
                            count.activeValue = activeValue;
                            callback();
                        });
                    },
                    //Deactive user
                    function (callback) {
                        db.GetCount('users', { status: { $eq: 2 } }, function (err, deactivateValue) {
                            if (err) return callback(err);
                            count.deactivateValue = deactivateValue;
                            callback();
                        });
                    },
                    //Deleted user
                    function (callback) {
                        db.GetCount('users', { status: { $eq: 0 } }, function (err, deletedValue) {
                            if (err) return callback(err);
                            count.deletedValue = deletedValue;
                            callback();
                        });
                    }

                ], function (err) {

                    if (err) return next(err);
                    var totalCount = count;
                    if (err || docdata.length <= 0) {
                        res.send([0, 0]);
                    } else {
                    res.send([docdata[0].documentData, docdata[0].count, totalCount]);
                    }
                });
            }
        });
    };

    router.recentUser = function recentuser(req, res) {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }

        if (req.query.sort != "") {
            var sorted = req.query.sort;
        }


        var usersQuery = [{
            "$match": { status: { $ne: 0 }, "role": "user" }
        }, {
            $project: {
                username: 1,
                role: 1,
                email: 1,
                createdAt: 1,
                dname: { $toLower: '$' + sorted }
            }
        }, {
            $project: {
                username: 1,
                document: "$$ROOT"
            }
        }, {
            $sort: {
                createdAt: -1
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];

        var sorting = {};
        var searchs = '';


        if (Object.keys(req.query).length != 0) {
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

            if (req.query.search != '' && req.query.search != 'undefined' && req.query.search) {
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
            if (err && docdata.length > 0) {
                res.send([0, 0]);
            } else {
                res.send([docdata[0].documentData, docdata[0].count]);
            }
        });
    };

    router.delete = function (req, res) {
        req.checkBody('delData', 'Invalid delData').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.UpdateDocument('users', { _id: { $in: req.body.delData } }, { status: 0 }, { multi: true }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                var notifications = { 'user_id': req.body.delData };
                var message = 'Admin Deleted Your Account';
        
                push.sendPushnotification(req.body.delData, message, 'account_deleted', 'ANDROID', notifications, 'USER', function (err, response, body) { });
                res.send(docdata);
            }
        });
    };


    router.walletAmount = function (req, res) {
        db.GetDocument('walletReacharge', { user_id: req.body.data }, {}, {}, function (err, docdata) {

            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };


    router.addaddress = function addaddress(req, res) {
        var address = {
            'line1': req.body.data.editaddressdata.line1 || "",
            'country': req.body.data.editaddressdata.country || "",
            'street': req.body.data.editaddressdata.street || "",
            'state': req.body.data.editaddressdata.state || "",
            'city': req.body.data.editaddressdata.city || "",
            'landmark': req.body.data.editaddressdata.landmark || "",
            'status': req.body.data.editaddressdata.status || 1,
            'locality': req.body.data.editaddressdata.locality || "",
            'zipcode': req.body.data.editaddressdata.zipcode || "",
            'location': req.body.data.addressList.location || "",
            'address': req.body.data.place.formatted_address || "",
        };

        if (req.body.data.editaddressdata._id) {
            if (req.body.data.addressList.location.lng == '' || req.body.data.addressList.location.lat == '') {
                db.UpdateDocument('users', { _id: req.body.userid, 'addressList._id': req.body.data.editaddressdata._id },
                    {
                        "addressList.$.line1": req.body.data.editaddressdata.line1, "addressList.$.country": req.body.data.editaddressdata.country, "addressList.$.street": req.body.data.editaddressdata.street,
                        "addressList.$.city": req.body.data.editaddressdata.city, "addressList.$.landmark": req.body.data.editaddressdata.landmark, "addressList.$.status": req.body.data.editaddressdata.status, "addressList.$.locality": req.body.data.editaddressdata.locality,
                        "addressList.$.zipcode": req.body.data.editaddressdata.zipcode
                    }, {}, function (err, docdata) {

                        if (err) {
                            res.send(err);
                        } else {
                            res.send(docdata);
                        }
                    });
            } else {
                db.UpdateDocument('users', { _id: req.body.userid, 'addressList._id': req.body.data.editaddressdata._id },
                    {
                        "addressList.$.line1": req.body.data.editaddressdata.line1, "addressList.$.country": req.body.data.editaddressdata.country, "addressList.$.street": req.body.data.editaddressdata.street,
                        "addressList.$.city": req.body.data.editaddressdata.city, "addressList.$.landmark": req.body.data.editaddressdata.landmark, "addressList.$.status": req.body.data.editaddressdata.status, "addressList.$.locality": req.body.data.editaddressdata.locality,
                        "addressList.$.zipcode": req.body.data.editaddressdata.zipcode, "addressList.$.location.lat": req.body.data.addressList.location.lat, "addressList.$.location.lng": req.body.data.addressList.location.lng
                    }, { multi: true }, function (err, docdata) {

                        if (err) {
                            res.send(err);
                        } else {
                            res.send(docdata);
                        }
                    });
            }
        } else {
            db.UpdateDocument('users', { _id: req.body.userid }, { "$push": { 'addressList': address } }, {}, function (err, docdata) {

                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        }
    };
    router.UserAddress = function (req, res) {

        db.GetDocument('users', { _id: req.body.id }, { 'addressList': 1 }, {}, function (err, docdata) {

            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };
    router.checkphoneno = function (req, res) {

        db.GetDocument('users', { "phone.number": req.body.phone, "phone.code": req.body.country_code }, {}, {}, function (err, docdata) {
            
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.addressStatus = function (req, res) {
        db.UpdateDocument('users', { '_id': req.body.userid, 'addressList.status': 3 }, { "addressList.$.status": 1 }, { multi: true }, function (err, docdata) {

            if (err) {
                res.send(err);
            } else {
                db.UpdateDocument('users', { '_id': req.body.userid, 'addressList._id': req.body.add_id }, { "addressList.$.status": 3 }, {}, function (err, docdata) {

                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata);
                    }
                });
            }
        });
    };

    router.deleteUserAddress = function (req, res) {
        db.UpdateDocument('users', { '_id': req.body.userid }, { $pull: { "addressList": { _id: req.body.add_id } } }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.getdeletedusers = function getdeletedusers(req, res) {
        var errors = req.validationErrors();

        var query = {};
        if (errors) {
            res.send(errors, 400);
            return;
        }
        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }
        var usersQuery = [{
            "$match": { status: { $eq: 0 }, "role": "user" }
        }, {
            $project: {
                createdAt: 1,
                updatedAt: 1,
                username: 1,
                role: 1,
                status: 1,
                email: 1,
                dname: { $toLower: '$' + sorted },
                activity: 1
            }
        }, {
            $project: {
                username: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];
        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

        if (req.body.search) {
            var searchs = req.body.search;
            usersQuery.push({ "$match": { $or: [{ "documentData.username": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.email": { $regex: searchs + '.*', $options: 'si' } }] } });
        }

        var sorting = {};
        if (req.body.sort) {
            var sorter = 'documentData.' + req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            usersQuery.push({ $sort: sorting });
        } else {
            sorting["documentData.createdAt"] = -1;
            usersQuery.push({ $sort: sorting });
        }

        if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
            usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        }
        usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });

        db.GetAggregation('users', usersQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                var count = {};
                async.parallel([
                    //All Deleted user
                    function (callback) {
                        db.GetCount('users', { status: { $eq: 0 } }, function (err, allValue) {
                            if (err) return callback(err);
                            count.allValue = allValue;
                            callback();
                        });
                    }
                ], function (err) {

                    if (err) return next(err);
                    var totalCount = count;
                    if (err || docdata.length <= 0) {
                        res.send([0, 0]);
                    } else {
                        res.send([docdata[0].documentData, docdata[0].count, totalCount]);
                    }
                });
            }
        });
    };


    router.walletDelete = function (req, res) {
        req.checkBody('delData', 'Invalid delData').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        res.send("No Delete");
        /*
        db.UpdateDocument('users', { _id: { $in: req.body.delData } }, { status: 0 }, { multi: true }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
        */
    };

    // logic
    /*router.dashboardDetasils = function (req, res) {
      var Query = [
          {
            "$group": {
              "_id": "$_id",
              "user_active": {
                "$sum": {
                  "$cond": [ { "$eq": [ "$status", 1 ] },{$sum:1} , {$sum:0} ]
                }
              },
              "user_inactive": {
                "$sum": {
                  "$cond": [ { "$eq": [ "$status", 0 ] },{$sum:1} , {$sum:0}  ]
                }
              },
              "activation_active": {
                "$sum": {
                  "$cond": [ { "$eq": [ "$segment.activation", "active" ] }, 1, 0 ]
                }
              },
              "activation_inactive": {
                "$sum": {
                  "$cond": [ { "$eq": [ "$segment.activity", "inactive" ] }, 1, 0 ]
                }
              },
              "plan_free": {
                "$sum": {
                  "$cond": [ { "$eq": [ "$segment.plan", "free" ] }, 1, 0 ]
                }
              }
            }
          },
          {
            "$project": {
              "_id": 0,
              "user": {
                "active": "$user_active",
                "inactive": "$user_inactive"
              },
              "activation": {
                "active": "$activation_active",
                "inactive": "$activation_inactive"
              },
              "plan": {
                "free": "$plan_free"
              }
            }
      }];
      db.GetAggregation('users',Query, function (err, docdata) {
        if (err) {
          res.send(err);
        } else {
          res.send(docdata);
        }
      });
    }*/


    return router;
}
