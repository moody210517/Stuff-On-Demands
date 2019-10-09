"use strict";
module.exports = function () {

    var db = require('../../model/mongodb.js');
    var async = require("async");
    var path = require('path');
    var fs = require('fs');


    var controller = {};

    controller.skeleton = function (req, res) {
        res.render('admin/skeleton', { image: '' });
    }


    controller.userImport = function (req, res) {
        var users = JSON.parse(fs.readFileSync(path.join(__dirname, "../../db.old/users.json"), 'utf8'));
        //var testUsers = users.slice(1, 10);
        var count = 1;
        async.everySeries(users, function (user, callback) {

            delete user._id
            user.addressList = user.addressList.map(function (item) {
                delete item._id;
                return item;
            });

            var userData = {
                unique_code: user.unique_code,
                username: user.username,
                email: user.email,
                password: user.password,
                role: user.role,
                gender: user.gender,
                geo: user.geo,
                location: user.location,
                status: user.status,
                verification_code: user.verification_code,
                addressList: user.addressList,
                address: user.address,
                name: user.name,
                phone: user.phone
            };

            db.InsertDocument('users', userData, function (err, result) {

                callback(null, count);
            });

        }, function (err, result) {

            // if result is true then every file exists
            var data = {};
            data.response = 1;
            res.send(data);
        });
    }

    controller.taskerImport = function (req, res) {

        var taskers = JSON.parse(fs.readFileSync(path.join(__dirname, "../../db.old/tasker.json"), 'utf8'));
        //var testTaskers = taskers.slice(1, 3);


        var count = 1;
        async.everySeries(taskers, function (tasker, callback) {


            tasker.profile_details = tasker.profile_details.map(function (item) {
                var newq = item.question.$oid
                delete item.question;
                item.question = newq;
                return item;
            });

            tasker.taskerskills = tasker.taskerskills.map(function (item) {
                if (item.categoryid) {
                    var newcategoryid = item.categoryid.$oid
                    var newchildid = item.childid.$oid
                    var newexperience = item.experience.$oid
                    delete item.categoryid;
                    delete item.childid;
                    delete item.experience;
                    item.categoryid = newcategoryid;
                    item.childid = newchildid;
                    item.experience = newexperience;
                    return item;
                }

            });

            var taskerData = {

                working_area: tasker.working_area,
                username: tasker.username,
                email: tasker.email,
                password: tasker.password,
                phone: tasker.phone,
                gender: tasker.gender,
                birthdate: tasker.birthdate,
                working_days: tasker.working_days,
                avatar: tasker.avatar,
                taskerskills: [], //tasker.taskerskills
                Map: [],
                location: tasker.location,
                name: tasker.name,
                address: tasker.address,
                tasker_area: tasker.tasker_area,
                profile_details: tasker.profile_details,
                tearms: tasker.tearms,
                radius: tasker.radius,
                availability: tasker.availability,
                availability_address: tasker.availability_address,
                img_name: tasker.img_name,
                img_path: tasker.img_path,
                tasker_status: tasker.tasker_status,
                status: tasker.status,
                role: tasker.role,
                geo: tasker.geo,
                verification_code: tasker.verification_code,
                //activity: tasker.activity,
                refer_history: tasker.refer_history,
                device_info: tasker.device_info,
                radiusby: tasker.radiusby,
                device_info: tasker.device_info,
            };
            db.InsertDocument('tasker', taskerData, function (err, result) {
                if (err) {
                    taskerData.location = { lng: taskerData.location.lng, lat: taskerData.location.lat };
                    db.InsertDocument('tasker', taskerData, function (err, result) {
                        callback(err, result);
                    });
                } else {

                    count++;
                    callback(err, result);
                }
            });
        }, function (err, result) {
            var data = {};
            data.response = 1;
            res.send(data);
        });
    }


    controller.locationUpdate = function (req, res) {
        db.GetDocument('tasker', {}, {}, {}, function (err, taskers) {
            if (err) {
                res.send(err);
            } else {
                var count = 1;
                async.everySeries(taskers, function (tasker, callback) {
                    if (tasker.location.lat) {
                        tasker.location = { lat: tasker.location.lat, lng: tasker.location.lng };
                    }
                    db.UpdateDocument('tasker', { _id: tasker._id }, { location: tasker.location }, {}, function (err, docdata) {
                        callback(err, tasker);
                    });
                }, function (err, result) {
                    var data = {};
                    data.response = 1;
                    res.send(data);
                });
            }
        });
    }

    controller.locationUpdate = function (req, res) {
        db.GetDocument('tasker', {}, {}, {}, function (err, taskers) {
            if (err) {
                res.send(err);
            } else {
                var count = 1;
                async.everySeries(taskers, function (tasker, callback) {
                    if (tasker.location.lat) {
                        tasker.location = { lat: tasker.location.lat, lng: tasker.location.lng };
                    }
                    db.UpdateDocument('tasker', { _id: tasker._id }, { location: tasker.location }, {}, function (err, docdata) {
                        callback(err, tasker);
                    });
                }, function (err, result) {
                    var data = {};
                    data.response = 1;
                    res.send(data);
                });
            }
        });
    }


    /* controller.dashboardStats = function (req, res) {

        async.parallel({
            users: function (callback) {
                db.GetCount('users', { status: { $ne: 0 } }, function (err, users) {
                    callback(err, users);
                });
            },
            taskers: function (callback) {
                db.GetCount('tasker', { status: { $ne: 0 } }, function (err, taskers) {
                    callback(err, taskers);
                });
            },
            categories: function (callback) {
                db.GetCount('category', { status: { $ne: 0 } }, function (err, categories) {
                    callback(err, categories);
                });
            },
            coupons: function (callback) {
                db.GetCount('coupon', { status: { $ne: 0 } }, function (err, coupons) {
                    callback(err, coupons);
                });
            },
            tasks: function (callback) {
                db.GetCount('task', { $and: [{ status: { $ne: 0 } }, { status: { $ne: 10 } }] }, function (err, tasks) {
                    callback(err, tasks);
                });
            },
            subscribers: function (callback) {
                db.GetCount('newsletter', { status: { $ne: 0 } }, function (err, subscribers) {
                    callback(err, subscribers);
                });
            }
        }, function (err, results) {
            if (err) {
                res.send(err);
            } else {
                var response = {};
                response.statistics = {};
                response.statistics.users = results.users || 0;
                response.statistics.taskers = results.taskers || 0;
                response.statistics.categories = results.categories || 0;
                response.statistics.coupons = results.coupons || 0;
                response.statistics.tasks = results.tasks || 0;
                response.statistics.subscribers = results.subscribers || 0;
                res.send(response);
            }
        });
    } */


    controller.dashboardStats = (req, res) => {
        var currentdata = new Date()
        var now = Date.now(),
            oneDay = (1000 * 60 * 60 * 24),
            today = new Date(now - (now % oneDay)),
            yesterday = new Date(today.valueOf() - oneDay);
        async.parallel({
            user: function (callback) {
                db.GetAggregation('users', [
                    { $match: { status: { $ne: 0 } } },
                    {
                        $facet: {
                            "Total": [
                                { $group: { _id: null, count: { $sum: 1 } } }
                            ],
                            "Today": [
                                {
                                    "$match": { "createdAt": { "$gte": today/* , "$lt": yesterday */ } }
                                },
                                { $group: { _id: null, count: { $sum: 1 } } }
                            ],
                            "TodayLogin": [
                                {
                                    "$match": { "activity.last_login": { "$gte": today/* , "$lt": yesterday */ } }
                                },
                                { $group: { _id: null, count: { $sum: 1 } } }
                            ],
                        }
                    }
                ], function (err, doc) {
                    if (err) {
                        callback(err, doc);
                    } else {
                        callback(err, doc[0]);
                    }
                })
            },
            tasker: function (callback) {
                db.GetAggregation('tasker', [
                    { $match: { status: { $ne: 0 } } },
                    {
                        $facet: {
                            "Total": [
                                { $group: { _id: null, count: { $sum: 1 } } }
                            ],
                            "Today": [
                                {
                                    "$match": { "createdAt": { "$gte": today/* , "$lt": yesterday */ } }
                                },
                                { $group: { _id: null, count: { $sum: 1 } } }
                            ],
                            "ActiveTasker": [
                                {
                                    "$match": { "availability": 1, "activity.last_login": { "$gte": today/* , "$lt": yesterday */ } }
                                },
                                { $group: { _id: null, count: { $sum: 1 } } }
                            ],
                        }
                    }
                ], function (err, doc) {
                    if (err) {
                        callback(err, doc);
                    } else {
                        callback(err, doc[0]);
                    }
                })
            },
            task: function (callback) {
                db.GetAggregation('task', [
                    { $match: { status: { $nin: [0, 10] } } },
                    {
                        $facet: {
                            "Total": [
                                { $group: { _id: null, count: { $sum: 1 } } }
                            ],
                            "Today": [
                                { "$match": { "createdAt": { "$gte": today/* , "$lt": yesterday */ } } },
                                { $group: { _id: null, count: { $sum: 1 } } }
                            ],
                            "OnGoing": [
                                { "$match": { $or: [{ status: { $eq: 1 } }, { status: { $eq: 2 } }, { status: { $eq: 3 } }, { status: { $eq: 4 } }, { status: { $eq: 5 } }] } },
                                { $group: { _id: null, count: { $sum: 1 } } }
                            ],
                            "Completed": [
                                { "$match": { $or: [{ status: { $eq: 7 } }, { status: { $eq: 6 } }] } },
                                { $group: { _id: null, count: { $sum: 1 } } }
                            ],
                            "Cancel": [
                                { "$match": { status: { $eq: 8 } } },
                                { $group: { _id: null, count: { $sum: 1 } } }
                            ],
                        }
                    }
                ], function (err, doc) {
                    if (err) {
                        callback(err, doc);
                    } else {
                        callback(err, doc[0]);
                    }
                })
            },
            category: function (callback) {
                db.GetAggregation('category', [
                    {
                        $facet: {
                            "MainCategory": [
                                { $match: { status: { $eq: 1 }, 'parent': { $exists: false } } },
                                { $group: { _id: null, count: { $sum: 1 } } }
                            ],
                            "SubCategory": [
                                { $match: { status: { $eq: 1 }, 'parent': { $exists: true } } },
                                { $group: { _id: null, count: { $sum: 1 } } }
                            ],
                        }
                    }

                ], function (err, doc) {
                    if (err) {
                        callback(err, doc);
                    } else {
                        callback(err, doc[0]);
                    }
                });
            },
            earnings: function (callback) {
                db.GetAggregation('task', [
                    {
                        $facet: {
                            "Total": [
                                { $match: { 'status': 7, 'invoice.status': 1, 'createdAt': { $lt: new Date() } } },
                                { $group: { _id: null, count: { $sum: 1 }, 'amount': { $sum: '$invoice.amount.total' }, 'adminEarnings': { $sum: '$invoice.amount.admin_commission' }, 'service_tax': { $sum: '$invoice.amount.service_tax' } } }
                            ],
                            "Today": [
                                {
                                    "$match": { 'status': 7, 'invoice.status': 1, "createdAt": { "$gte": today/* , "$lt": yesterday */ } }
                                },
                                { $group: { _id: null, count: { $sum: 1 }, 'amount': { $sum: '$invoice.amount.total' }, 'adminEarnings': { $sum: '$invoice.amount.admin_commission' } } }
                            ],
                        }
                    }
                ], function (err, doc) {
                    if (err) {
                        callback(err, doc);
                    } else {
                        callback(err, doc[0]);
                    }
                })
            },
            coupon: function (callback) {
                db.GetCount('coupon', { status: { $ne: 0 } }, function (err, coupons) {
                    callback(err, coupons);
                });
            },
            topcategories: function (callback) {
                db.GetAggregation('task', [
                    { $match: { 'status': { $eq: 7 } } },
                    { "$group": { "_id": null, "count": { "$sum": 1 }, "data": { "$push": "$$ROOT" } } },
                    { "$unwind": "$data" },
                    {
                        "$group": {
                            "_id": "$data.category", "name": { $first: "$data.booking_information.service_type" }, "count": { "$sum": 1 },
                            "total": { "$first": "$count" }
                        }
                    },
                    {
                        "$project": {
                            "count": 1,
                            "category": 1,
                            "name": 1,
                            "percentage": { "$multiply": [{ "$divide": [100, "$total"] }, "$count"] }
                        }
                    },
                    { $sort: { "count": -1 } },
                    { $limit: 5 },
                ], function (err, doc) {
                    if (err) {
                        callback(err, doc);
                    } else {
                        callback(err, doc);
                    }
                })
            }, toptasker: function (callback) {
                db.GetAggregation('task', [
                    { $match: { 'status': { $eq: 7 } } },
                    { "$group": { "_id": null, "count": { "$sum": 1 }, "data": { "$push": "$$ROOT" } } },
                    { $unwind: { path: "$data", preserveNullAndEmptyArrays: true } },
                    { '$lookup': { from: "tasker", localField: "data.tasker", foreignField: "_id", as: "tasker" } },
                    { $unwind: { path: "$tasker", preserveNullAndEmptyArrays: true } },
                    {
                        "$group": {
                            "_id": "$tasker._id", "name": { $first: "$tasker.username" }, "count": { "$sum": 1 },
                            "total": { "$first": "$count" }
                        }
                    },
                    {
                        "$project": {
                            "count": 1,
                            "name": 1,
                            "percentage": { "$multiply": [{ "$divide": [100, "$total"] }, "$count"] }
                        }
                    },
                    { $sort: { "count": -1 } },
                    { $limit: 5 },
                ], function (err, doc) {
                    if (err) {
                        callback(err, doc);
                    } else {
                        callback(err, doc);
                    }
                })
            }, topreviewedtasker: function (callback) {
                db.GetAggregation('review', [
                    { $match: { 'status': { $eq: 1 }, "type": 'user' } },
                    {
                        "$group": {
                            "_id": "$tasker", "rating": { $sum: "$rating" }, "count": { "$sum": 1 }
                        }
                    },
                    { $sort: { "count": -1 } },
                    { $limit: 5 },
                    { '$lookup': { from: "tasker", localField: "_id", foreignField: "_id", as: "tasker" } },
                    { $unwind: { path: "$tasker", preserveNullAndEmptyArrays: true } },
                    { $match: { 'tasker.status': { $eq: 1 }} },

                    {
                        "$project": {
                            "count": 1,
                            "name": "$tasker.username",
                            "percentage": { "$multiply": [{ "$divide": [100, "$rating"] }, "$count"] }
                        }
                    },
                 
                   
                ], function (err, doc) {
                    if (err) {
                        callback(err, doc);
                    } else {
                        callback(err, doc);
                    }
                })
            },
            subscriber: function (callback) {
                db.GetCount('newsletter', { status: { $ne: 0 } }, function (err, subscribers) {
                    callback(err, subscribers);
                });
            },
            getuserdetails: function (callback) {
                var getQuery = [{ "$match": { role: 'user', status: { $ne: 0 } } },
                { $project: { email: 1, username: 1, status: 1, createdAt: 1 } },
                { $project: { document: "$$ROOT" } },
                { $sort: { "document.createdAt": -1 } },
                { $limit: 10 },
                { $group: { "_id": "_id", "count": { "$sum": 1 }, "documentData": { $push: "$document" } } }
                ];
                db.GetAggregation('users', getQuery, function (err, data) {
                    if (err) {
                        callback(err, data);
                    } else {
                        callback(err, data);
                    }
                });
            },
            gettaskdetails: function (callback) {
                var extension = {};
                extension.options = { limit: 10 };
                extension.populate = 'user tasker';
                db.GetDocument('task', { status: { $nin: [10, 0] } }, {}, extension, function (err, data) {
                    if (err) {
                        callback(err, data);
                    } else {
                        callback(err, data);
                    }
                })
            }, taskersDetails: function (callback) {
                var getQuery = [
                    { "$match": { role: 'tasker', status: { $nin: [1, 0] } } },
                    { $project: { email: 1, username: 1, status: 1, } },
                    { $project: { name: 1, document: "$$ROOT" } },
                    { $limit: 10 },
                    { $group: { "_id": "_id", "count": { "$sum": 1 }, "documentData": { $push: "$document" } } }
                ];
                db.GetAggregation('tasker', getQuery, function (err, data) {
                    if (err) {
                        callback(err, data);
                    } else {
                        callback(err, data);
                    }
                });
            }, verifiedtaskersDetails: function (callback) {
                var getQuery = [{ "$match": { role: 'tasker', status: { $nin: [2, 3, 0] } } },
                { $project: { email: 1, username: 1, status: 1, } },
                { $project: { name: 1, document: "$$ROOT" } },
                { $limit: 10 },
                { $group: { "_id": "_id", "count": { "$sum": 1 }, "documentData": { $push: "$document" } } }
                ];
                db.GetAggregation('tasker', getQuery, function (err, data) {
                    if (err) {
                        callback(err, data);
                    } else {
                        callback(err, data);
                    }
                });
            },
        }, function (err, result) {
            res.send(result)
        })
    }



    return controller;
}
