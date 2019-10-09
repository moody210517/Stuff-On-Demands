var db = require('../../model/mongodb.js');
var async = require("async");
var mail = require('../../model/mail.js');
var mongoose = require('mongoose');
var mailcontent = require('../../model/mailcontent.js');
var CONFIG = require('../../config/config');
var moment = require('moment');
var timezone = require('moment-timezone');

module.exports = function (io) {

    var push = require('../../model/pushNotification.js')(io);

    var router = {};

    router.taskbaseinfo = function taskbaseinfo(req, res) {
        var slug = req.body.slug;
        if (slug != '' && slug != '0' && typeof slug != 'undefined') {
            db.GetAggregation('category', [{ $match: { "slug": slug, 'status': 1 } },
            { $project: { SubCategoryInfo: "$$CURRENT" } },
            { '$lookup': { from: 'categories', localField: 'SubCategoryInfo.parent', foreignField: '_id', as: 'categorydetails' } },
            { $unwind: { path: "$categorydetails", preserveNullAndEmptyArrays: true } }
            ], function (err, doc) {
                if (err) {
                    res.send(err);
                } else {
                    if (!doc[0].categorydetails.marker) {
                        doc[0].categorydetails.marker = './' + CONFIG.MARKER_DEFAULT_IMAGE;
                    }
                    res.send(doc);
                }
            });
        } else {
            res.send([]);
        }
    };

    router.taskprofileinfo = function taskprofileinfo(req, res) {
        var slug = req.body.slug;
        var options = {};
        options.populate = 'profile_details.question taskerskills.experience';
        //options.populate = 'taskerskills.experience';
        db.GetOneDocument('tasker', { _id: req.body.slug, status: { $ne: 0 } }, {}, options, function (err, taskdata) {
            if (err || !taskdata) {
                res.send(err);
            } else {
                if (!taskdata.avatar) {
                    taskdata.avatar = './' + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                }
                res.send(taskdata);
            }
        });
    };

    router.taskerreviews = function taskerreviews(req, res) {
        var getQuery = [{
            "$match": { status: { $ne: 0 }, "_id": new mongoose.Types.ObjectId(req.body.slug) }
        },
        { $unwind: { path: "$taskerskills", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'categories', localField: "taskerskills.childid", foreignField: "_id", as: "taskerskills.childid" } },
        { $unwind: { path: "$taskerskills", preserveNullAndEmptyArrays: true } },
        { $group: { "_id": "$_id", 'taskercategory': { '$push': '$taskerskills' }, "taskerskills": { "$first": "$taskerskills" }, "createdAt": { "$first": "$createdAt" } } },
        { $lookup: { from: 'reviews', localField: "_id", foreignField: "tasker", as: "rate" } },
        { $unwind: { path: "$rate", preserveNullAndEmptyArrays: true } },
        { $match: { $or: [{ "rate.type": "user" }, { rate: { $exists: false } }] } },
        { $lookup: { from: 'users', localField: "rate.user", foreignField: "_id", as: "user" } },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'task', localField: "_id", foreignField: "tasker", as: "task" } },
        { $lookup: { from: 'task', localField: "rate.task", foreignField: "_id", as: "taskcategory" } },
        { $unwind: { path: "$taskcategory", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'categories', localField: "taskcategory.category", foreignField: "_id", as: "category" } },
        {
            $project: {
                rate: 1,
                user: 1,
                task: {
                    $filter: {
                        input: "$task",
                        as: "task",
                        cond: { $eq: ["$$task.status", 7] }
                    }
                },
                rating: 1,
                taskcategory: 1,
                taskercategory: 1,
                category: 1,
                tasker: {
                    $cond: { if: { $eq: ["$task.status", 4] }, then: "$task", else: "" }
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
                availability_address: 1,
                gender: 1,
                phone: 1,
                vehicle: 1,
                taskerskills: 1,
                profile_details: 1,
                createdAt: 1
            }
        }, {
            $project: {
                name: 1,
                rate: 1,
                user: 1,
                document: "$$ROOT"
            }
        },
        {
            $match: { 'rate.status': { $ne: 0 } }
        },
        {
            $group: { "_id": "$_id", "count": { "$sum": 1 }, "induvidualrating": { "$sum": "$rate.rating" }, "documentData": { $push: "$document" } }
        },
        {
            $group: {
                "_id": "$_id",
                "induvidualrating": { $first: "$induvidualrating" },
                "avg": { $sum: { $divide: ["$induvidualrating", "$count"] } },
                "documentData": { $first: "$documentData" }
            }
        }
        ];

        db.GetAggregation('tasker', getQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata.length != 0) {

                    res.send([docdata[0].documentData, docdata[0].avg]);
                } else {
                    res.send([0, 0]);
                }
            }
        });
    };



    router.taskerprofile = function taskerprofile(req, res) {
        var slug = req.body.slug;
        db.GetAggregation('users', [{
            $match: {
                "_id": new mongoose.Types.ObjectId(req.body.slug)
            }
        }],
            function (err, taskdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(taskdata);
                }
            });

    };



    router.gettaskuser = function gettaskuser(req, res) {
        var categoryid = req.body.categoryid;
        var user = req.body.user;
        var loginUser = req.body.loginUser;
        var vehicle = req.body.vehicle;
        var day = req.body.day;
        var hour = req.body.hour;
        var hourcondition = {};
        var responseflag = true;

        if (day != '' && day != '0' && typeof day != 'undefined' && hour != '' && hour != '0' && typeof hour != 'undefined' && objectID.isValid(categoryid) && objectID.isValid(user) && objectID.isValid(loginUser)) {
            if (hour == 'morning') {
                hourcondition = { $and: [{ $eq: ["$$working_days.day", day] }, { $eq: ["$$working_days.hour.morning", true] }] }
            } else if (hour == 'afternoon') {
                hourcondition = { $and: [{ $eq: ["$$working_days.day", day] }, { $eq: ["$$working_days.hour.afternoon", true] }] }
            } else if (hour == 'evening') {
                hourcondition = { $and: [{ $eq: ["$$working_days.day", day] }, { $eq: ["$$working_days.hour.evening", true] }] }
            } else {
                responseflag = false;
            }
            if (responseflag) {

                var condition = [];
                condition.push({ $match: { "_id": new mongoose.Types.ObjectId(user), 'status': 1 } });

                var projection = {};
                projection.userDetails = "$$CURRENT";
                projection.taskerskillsFilter = { $let: { vars: { taskerskills: { $filter: { input: "$taskerskills", as: "taskerskills", cond: { $eq: ["$$taskerskills.categoryid", new mongoose.Types.ObjectId(categoryid)] } } } }, in: { $size: "$$taskerskills" } } };

                projection.workingdaysFilter = {
                    $let: {
                        vars: { working_days: { $filter: { input: "$working_days", as: "working_days", cond: hourcondition } } },
                        in: { $size: "$$working_days" }
                    }
                };

                condition.push({ $project: projection });

                var match = { $and: [] };
                match.$and.push({ workingdaysFilter: { $gt: 0 } });
                match.$and.push({ taskerskillsFilter: { $gt: 0 } });

                match.$and.push({ _id: { $ne: new mongoose.Types.ObjectId(loginUser) } });
                condition.push({ $match: match });

                db.GetAggregation('tasker', condition, function (err, doc) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(doc);
                    }
                });

            } else {
                res.send([]);
            }
        } else {
            res.send([]);
        }
    }

    router.taskerAvailabilitybyWorkingArea = function taskerAvailabilitybyWorkingArea(req, res) {

        // var firstDay = moment().startOf('month').format();

        // console.log("firstDay",firstDay)

        req.checkBody('user', res.__('Invalid User')).optional();
        req.checkBody('task', res.__('Invalid Task')).notEmpty();
        req.checkBody('category', res.__('Invalid Category')).notEmpty();
        req.checkBody('date', res.__('Invalid Date')).notEmpty();
        req.checkBody('time', res.__('Invalid Time')).notEmpty();
        req.checkBody('price', res.__('Invalid Price')).notEmpty();
        req.checkBody('distance', res.__('Invalid Distance')).notEmpty();
        req.checkBody('skip', res.__('Invalid Skip')).notEmpty();
        req.checkBody('limit', res.__('Invalid Limit')).notEmpty();

        var data = {};
        data.status = 0;

        var errors = req.validationErrors();
        if (errors) {
            data.response = errors[0].msg;
            return res.send(data);
        }

        var request = {};
        request.user = req.body.user;
        request.task = req.body.task;
        request.category = req.body.category;
        request.date = req.body.date;
        request.time = req.body.time;
        request.price = req.body.price;
        request.distance = req.body.distance;
        request.sort = parseInt(req.body.sort);
        request.page = req.body.page;
        request.skip = req.body.skip;
        request.limit = req.body.limit;
        request.view = req.body.view;
        request.timeout = req.body.timeout;

        var session = '';
        if (request.time == "00:00" || request.time == "00:30" || request.time == "01:00" || request.time == "01:30" || request.time == "02:00" || request.time == "02:30" || request.time == "03:00" || request.time == "03:30" || request.time == "04:00" || request.time == "04:30" || request.time == "05:00" || request.time == "05:30" || request.time == "06:00" || request.time == "06:30" || request.time == "07:00" || request.time == "07:30" || request.time == "08:00" || request.time == "08:30" || request.time == "09:00" || request.time == "09:30" || request.time == "10:00" || request.time == "10:30" || request.time == "11:00" || request.time == "11:30") {
            session = 'morning';
        } else if (request.time == "12:00" || request.time == "12:30" || request.time == "13:00" || request.time == "13:30" || request.time == "14:00" || request.time == "14:30" || request.time == "15:00" || request.time == "15:30") {
            session = 'afternoon';
        } else if (request.time == "16:00" || request.time == "16:30" || request.time == "17:00" || request.time == "17:30" || request.time == "18:00" || request.time == "18:30" || request.time == "19:00" || request.time == "19:30" || request.time == "20:00" || request.time == "20:30" || request.time == "21:00" || request.time == "21:30" || request.time == "22:00" || request.time == "22:30" || request.time == "23:00" || request.time == "23:30"){
            session = 'evening';
        }

        async.waterfall([
            function (callback) {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    if (err || !settings) {
                        data.response = 'Unable to get settings';
                        res.send(data);
                    } else { callback(err, settings.settings); }
                });
            },
            function (settings, callback) {
                db.GetOneDocument('task', { _id: new mongoose.Types.ObjectId(request.task) }, {}, { populate: 'user category' }, function (err, task) {
                    if (err || !task) {
                        data.response = 'Unable to get task';
                        res.send(data);
                    } else { callback(err, settings, task); }
                });
            },
            function (settings, task, callback) {
                var updateData = {};
                updateData.task_date = request.date;
                updateData.task_day = moment(request.date, 'YYYY-MM-DD').format('dddd');
                updateData.task_time = request.time;
                updateData.task_hour = session;
                updateData.task_session = session;
                db.UpdateDocument('task', { _id: new mongoose.Types.ObjectId(request.task) }, updateData, function (err, result) {
                    callback(err, settings, task);
                });
            },
            function (settings, task, callback) {
                //var day = moment(request.date, 'MM/DD/YYYY').format('dddd');
                var day = moment(request.date, 'YYYY-MM-DD').format('dddd');
                var distanceval = settings.distanceby == 'km' ? 0.001 : 0.000621371;

                var from = moment(request.time,'HH:mm').format('HH');
                var to = moment(request.time,'HH:mm').add(task.category.hours, 'h').format('HH');

                var tasktime = [];

                if(!request.timeout) {
                    if(to - from > 1) {
                        tasktime.push(parseInt(from), parseInt(from) + 1, parseInt(to));
                    } else {
                        tasktime.push(parseInt(from), parseInt(to));
                    }
                }

                console.log('day', day);
                console.log('tasktime', tasktime);


                var defaultCondition = [{
                    "$geoNear": {
                        near: { type: "Point", coordinates: [parseFloat(task.location.log), parseFloat(task.location.lat)] },
                        distanceField: "distance",
                        includeLocs: "provider_location",
                        query: {
                            "status": 1,
                            "taskerskills": { $elemMatch: { childid: new mongoose.Types.ObjectId(task.category._id), status: 1 } },
                            "working_days": { $elemMatch: { day: day, slots: { $all: tasktime } } }
                        },
                        distanceMultiplier: distanceval,
                        spherical: true,
                        maxDistance: request.distance / distanceval
                    }
                },
                {
                    "$redact": {
                        "$cond": {
                            "if": { "$lte": ["$distance", "$radius"] },
                            "then": "$$KEEP",
                            "else": "$$PRUNE"
                        }
                    }
                },
                { $lookup: { from: "task", localField: "_id", foreignField: "tasker", as: "tasks" } },
                { $unwind: { path: "$tasks", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        "username": 1,
                        // "name": 1,
                        // "email": 1,
                        // "phone": 1,
                        "taskerskills": 1,
                        "avatar": 1,
                        // "tasker_area": 1,
                        "tasks": 1,
                        "total_review": 1,
                        "avg_review": 1,
                        // "address": 1,
                        "location": 1,
                        "availability_address": 1,
                        "booked": {
                            $cond: { if: { $and: [ { $ne: [ { $setIntersection: ["$tasks.task_slots", tasktime] }, [] ] }, { $ne: ["$tasks.status", 8] }, { $gte: ["$tasks.status", 2] }, { $lte: ["$tasks.status", 5] }, { $eq: ["$tasks.task_date", request.date] } ] }, then: 1, else: 0 }
                        }

                    }
                },
                {
                    "$group": {
                        "_id": "$_id",
                        "username": { $first: "$username" },
                        // "name": { $first: "$name" },
                        // "email": { $first: "$email" },
                        // "phone": { $first: "$phone" },
                        "total_review": { $first: "$total_review" },
                        "avg_review": { $first: "$avg_review" },
                        "taskerskills": { $first: "$taskerskills" },
                        "avatar": { $first: "$avatar" },
                        // "tasker_area": { $first: "$tasker_area" },
                        // "address": { $first: "$address" },
                        "location": { $first: "$location" },
                        "availability_address": { $first: "$availability_address" },
                        "booked": { $sum: "$booked" }
                    }
                },
                {
                    $unwind: { path: "$taskerskills", preserveNullAndEmptyArrays: true }
                },
                {
                    $match: {
                        $and: [
                            { "taskerskills.hour_rate": { "$lte": parseFloat(request.price[1]) } },
                            { "taskerskills.hour_rate": { "$gte": parseFloat(request.price[0]) } }
                        ],
                        'taskerskills.childid': new mongoose.Types.ObjectId(task.category._id),
                        "booked": 0 //allow multiple bookings
                    }
                },
                {
                    "$group": {
                        "_id": "$_id",
                        "username": { $first: "$username" },
                        // "name": { $first: "$name" },
                        // "email": { $first: "$email" },
                        // "phone": { $first: "$phone" },
                        "total_review": { $first: "$total_review" },
                        "avg_review": { $first: "$avg_review" },
                        "taskerskills": { $first: "$taskerskills" },
                        "avatar": { $first: "$avatar" },
                        // "tasker_area": { $first: "$tasker_area" },
                        // "address": { $first: "$address" },
                        "location": { $first: "$location" },
                        "availability_address": { $first: "$availability_address" },
                        "booked": { $sum: "$booked" }
                    }
                },
                { '$sort': { 'taskerskills.hour_rate': request.sort } },
                {
                    "$group": {
                        _id: null,
                        count: { $sum: 1 },
                        taskers: { $push: "$$ROOT" }
                    }
                },
                { $unwind: { path: "$taskers", preserveNullAndEmptyArrays: true } }
                ];
                if (request.view === 'list') {
                    defaultCondition.push({ '$skip': parseInt(request.skip) });
                    defaultCondition.push({ '$limit': parseInt(request.limit) });
                }
                defaultCondition.push({ $group: { "_id": null, "count": { "$first": "$count" }, "taskers": { $push: "$taskers" } } });

                db.GetAggregation('tasker', defaultCondition, function (err, newtaskercount) {
                    if (err || !newtaskercount[0]) {
                        res.send({ count: 0, result: [] });
                    } else {
                        callback(err, newtaskercount);
                    }
                });
            }
        ], function (err, taskers) {
            if (err) {
                res.send(err);
            } else {
                res.send(taskers[0]);
            }
        });
    }


    router.taskerAvailabilitybyWorkingAreaCount = function taskerAvailabilitybyWorkingAreaCount(req, res) {
        var pickup_lat = req.query.lat;
        var pickup_lon = req.query.lon;
        var categoryid = req.query.categoryid;
        var condition = { status: 1, availability: 1 };
        var hour = req.query.hour;
        var day = req.query.day;

        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settingData) {

            if (err) {
                var data = {};
                data.response = 'Configure your website setting';
                data.status = 0;
                res.send(data);
            } else {

                if (settingData.settings.distanceby == 'km') {
                    var distanceval = 0.001;
                } else {
                    var distanceval = 0.000621371;
                }

                var taskercondition = [{
                    "$geoNear": {
                        near: { type: "Point", coordinates: [parseFloat(pickup_lon), parseFloat(pickup_lat)] },
                        distanceField: "distance",
                        includeLocs: "location",
                        query: {
                            "status": 1,
                            "taskerskills": { $elemMatch: { childid: new mongoose.Types.ObjectId(categoryid), status: 1 } },
                        },
                        distanceMultiplier: distanceval,
                        spherical: true
                    }
                },
                {
                    "$redact": {
                        "$cond": {
                            "if": { "$lte": ["$distance", "$radius"] },
                            "then": "$$KEEP",
                            "else": "$$PRUNE"
                        }
                    }
                },

                {
                    "$group": {
                        _id: null,
                        count: { $sum: 1 },
                        taskers: { $push: "$$ROOT" }
                    }
                }

                ];

                db.GetAggregation('tasker', taskercondition, function (err, docdata) {
                    if (err || docdata.length == 0) {
                        res.send({ dac: [], count: 0 });
                    } else {
                        res.send({ dac: docdata, count: docdata[0].count });

                    }
                });
            }
        });
    }


    router.getaddressdata = function getaddressdata(req, res) {
        db.GetDocument('users', { '_id': req.body.userid }, {}, {}, function (addErr, addRespo) {
            if (addErr || addRespo.length == 0) {
                res.send({
                    "status": "0",
                    "response": "address not updated"
                });
            } else {
                for (var i = 0; i < addRespo[0].addressList.length; i++) {
                    if (i == req.body.id) {
                        res.send(addRespo[0].addressList[i]);
                    }
                }
            }
        });
    };

    router.getuserdata = function getuserdata(req, res) {
        db.GetDocument('users', { '_id': req.body.data.user }, {}, {}, function (addErr, userrespo) {
            if (addErr || userrespo.length == 0) {
                res.send(err);
            } else {

                if (!userrespo[0].avatar) {
                    userrespo[0].avatar = './' + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                }
                res.send(userrespo);

            }
        });
    }


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

    router.deleteaddress = function deleteaddress(req, res) {
        db.GetDocument('users', { '_id': req.body.userid }, {}, {}, function (addErr, addRespo) {
            if (addErr || addRespo.length == 0) {
                res.send({
                    "status": "0",
                    "response": "address not updated"
                });
            } else {
                addRespo[0].addressList.splice(parseInt(req.body.id), 1);
                db.UpdateDocument('users', { _id: req.body.userid }, addRespo[0], { multi: true }, function (addUErr, addURespo) {
                    if (addUErr) {
                        res.send({
                            "status": "0",
                            "response": "address not updated"
                        });
                    } else {

                        res.send(addURespo);
                    }

                });

            }
        });
    };

    router.addaddress = function addaddress(req, res) {
        var address = {}
        address.location = req.body.data.location;
        address.address = req.body.data.address;
        db.GetOneDocument('users', { '_id': req.body.userid, addressList: { $elemMatch: { "location.lng": req.body.data.location.lng, "location.lat": req.body.data.location.lat } } }, {}, {}, function (addErr, addRespo) {
            if (addErr || addRespo) {
                res.send({ status: 0, message: 'Address already added on the list' });
            } else {
                db.UpdateDocument('users', { _id: req.body.userid }, { "$push": { 'addressList': address } }, {}, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata);
                    }
                });
            }
        });

        /*
        if (req.body.data.editaddressdata.sat == 1) {
            db.UpdateDocument('users', { _id: req.body.userid, 'addressList._id': req.body.data.editaddressdata._id },
                {
                    "addressList.$.line1": req.body.data.editaddressdata.line1, "addressList.$.country": req.body.data.editaddressdata.country, "addressList.$.street": req.body.data.editaddressdata.street,
                    "addressList.$.city": req.body.data.editaddressdata.city, "addressList.$.landmark": req.body.data.editaddressdata.landmark, "addressList.$.status": req.body.data.editaddressdata.status, "addressList.$.state": req.body.data.editaddressdata.state, "addressList.$.locality": req.body.data.editaddressdata.locality,
                    "addressList.$.zipcode": req.body.data.editaddressdata.zipcode
                }, {}, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        res.send(docdata);
                    }
                });
        }
        else {
            db.GetOneDocument('users', { '_id': req.body.userid, addressList: { $elemMatch: { "location.lng": req.body.data.addressList.location.lng, "location.lat": req.body.data.addressList.location.lat } } }, {}, {}, function (addErr, addRespo) {
                if (addErr || addRespo) {
                    res.send({ status: 0, message: 'Address already added on the list' });
                } else {
                    var address = {
                        'line1': req.body.data.editaddressdata.line1 || "",
                        'country': req.body.data.editaddressdata.country || "",
                        'street': req.body.data.editaddressdata.street || "",
                        'landmark': req.body.data.editaddressdata.landmark || "",
                        'state': req.body.data.editaddressdata.state || "",
                        'status': req.body.data.editaddressdata.status || 1,
                        'city': req.body.data.editaddressdata.city || "",
                        'zipcode': req.body.data.editaddressdata.zipcode || "",
                        'location': req.body.data.addressList.location || ""
                    };
                    if (req.body.data.editaddressdata._id) {
                        if (req.body.data.addressList.location.lng == '' || req.body.data.addressList.location.lat == '') {
                            db.UpdateDocument('users', { _id: req.body.userid, 'addressList._id': req.body.data.editaddressdata._id },
                                {
                                    "addressList.$.line1": req.body.data.editaddressdata.line1, "addressList.$.country": req.body.data.editaddressdata.country, "addressList.$.street": req.body.data.editaddressdata.street,
                                    "addressList.$.city": req.body.data.editaddressdata.city, "addressList.$.landmark": req.body.data.editaddressdata.landmark, "addressList.$.status": req.body.data.editaddressdata.status, "addressList.$.state": req.body.data.editaddressdata.state, "addressList.$.locality": req.body.data.editaddressdata.locality,
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
                }

            });
        }
        */
    };

    router.addnewtask = function addnewtask(req, res) {
        var data = {};
        data.category = req.body.categoryid;
        data.address = req.body.address;
        data.billing_address = req.body.billing_address;
        data.task_address = req.body.task_address;
        data.service_address = req.body.task_address;
        data.user = req.body.userid;
        data.task_description = req.body.task_description;
        data.location = req.body.location;
        data.status = 10;
        data.payee_status = 0;
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settingdata) {
            if (err || !settingdata) {
                res.send(err);
            } else {
                if (settingdata.settings.bookingIdPrefix) {
                    data.booking_id = settingdata.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
                    db.InsertDocument('task', data, function (err, docdata) {
                        if (err) {
                            res.send(err);
                        } else {
                            res.send(docdata);
                        }
                    });
                } else {
                    res.send("Task Prefix code is not available in BackEnd");
                }
            }
        });
    };



    router.gettaskdetailsbyid = function gettaskdetailsbyid(req, res) {
        var data = {};
        data.taskid = req.body.id;
        var options = {};
        options.populate = 'category user tasker';
        db.GetDocument('task', { _id: req.body.id }, {}, options, function (err, taskdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(taskdata[0]);
            }
        });
    };


    router.searchTasker = function searchTasker(req, res) {



        req.checkBody('task', res.__('Invalid Task')).notEmpty();

        var data = {};
        data.status = 0;

        var errors = req.validationErrors();
        if (errors) {
            data.response = errors[0].msg;
            res.send(data);
            return;
        }



        var request = {};
        request.task = req.body.task;

        async.parallel({
            task: function (callback) {
                db.GetOneDocument('task', { _id: request.task }, {}, {}, function (err, task) {
                    callback(err, task);
                });
            },
            settings: function (callback) {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    callback(err, settings.settings);
                });
            }
        }, function (err, results) {
            if (err || !results.task || !results.settings) {
                data.response = 'Error in identifying task';
                res.status(400).send(data);
            } else {


                var task = results.task;
                var settings = results.settings;
                var distanceFactor = settings.distanceby == 'km' ? 0.001 : 0.000621371;

                var filtersInitQuery = [
                    {
                        $geoNear: {
                            near: { type: "Point", coordinates: [parseFloat(task.location.log), parseFloat(task.location.lat)] },
                            distanceField: "distance",
                            includeLocs: "location",
                            query: {
                                "status": 1,
                                "taskerskills": { $elemMatch: { childid: new mongoose.Types.ObjectId(task.category), status: 1 } },
                            },
                            distanceMultiplier: distanceFactor,
                            spherical: true
                        }
                    },
                    { $redact: { "$cond": { "if": { "$lte": ["$distance", "$radius"] }, "then": "$$KEEP", "else": "$$PRUNE" } } },
                    { $unwind: '$taskerskills' },
                    { $match: { 'taskerskills.childid': new mongoose.Types.ObjectId(task.category) } },
                    { $group: { _id: null, pricemax: { $max: "$taskerskills.hour_rate" }, pricemin: { $min: "$taskerskills.hour_rate" }, dstmin: { $min: "$radius" }, dstmax: { $max: "$radius" } } }
                ];
                var categoryInitQuery = [
                    { $match: { "_id": new mongoose.Types.ObjectId(task.category), 'status': 1 } },
                    { '$lookup': { from: 'categories', localField: 'parent', foreignField: '_id', as: 'parent' } },
                    { $unwind: { path: "$parent", preserveNullAndEmptyArrays: true } }
                ];

                async.parallel({
                    filtersInit: function (callback) {
                        db.GetAggregation('tasker', filtersInitQuery, function (err, filtersInit) {
                            callback(err, filtersInit);
                        });
                    },
                    category: function (callback) {
                        db.GetAggregation('category', categoryInitQuery, function (err, category) {
                            callback(err, category);
                        });
                    }
                }, function (err, results) {
                    if (err) {
                        res.send(err);
                    } else {

                        data.status = 1;
                        data.response = {};
                        data.response.filtersInit = results.filtersInit[0];
                        data.response.category = results.category[0];
                        data.response.task = task;
                        res.send(data);
                    }
                });
            }
        });
    };


    router.confirmtask = function confirmtask(req, res) {

        req.checkBody('tasker', res.__('Invalid Tasker')).notEmpty();
        req.checkBody('user', res.__('Invalid User')).notEmpty();
        req.checkBody('task', res.__('Invalid Task')).notEmpty();

        var data = {};
        data.status = 0;

        var errors = req.validationErrors();
        if (errors) {
            data.response = errors[0].msg;
            return res.send(data);
        }

        var request = {};
        request.tasker = req.body.tasker;
        request.user = req.body.user;
        request.task = req.body.task;

        var pipeline = [
            { $match: { _id: new mongoose.Types.ObjectId(request.task), 'status': 10 } },
            { "$lookup": { from: "categories", localField: "category", foreignField: "_id", as: "category" } },
            { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } }
        ];
        db.GetAggregation('task', pipeline, function (err, taskDetails) {
            if (err || !taskDetails[0]) {
                data.response = 'Invalid Task';
                res.send(data);
            } else {
                async.parallel({
                    user: function (callback) {
                        db.GetOneDocument('users', { _id: request.user }, {}, {}, function (err, task) {
                            callback(err, task);
                        });
                    },
                    tasker: function (callback) {
                        db.GetOneDocument('tasker', { _id: request.tasker }, {}, {}, function (err, tasker) {
                            console.log('err, tasker',err, tasker);
                            callback(err, tasker);
                        });
                    },
                    settings: function (callback) {
                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                            callback(err, settings.settings);
                        });
                    }
                }, function (err, results) {
                    if (err || !results) {
                        data.response = 'Error in booking task';
                        res.send(data);
                    } else {

                        if (!results.user) {
                            data.response = 'Invalid User';
                            res.send(data);
                        } else if (!results.tasker) {
                            data.response = 'Invalid Tasker';
                            res.send(data);
                        } else if (!results.settings) {
                            data.response = 'Invalid Configuration';
                            res.send(data);
                        }

                        var task = taskDetails[0];
                        var taskerCategory = results.tasker.taskerskills.filter(function (skills) { return skills.childid.toString() == task.category._id.toString() })[0];

                        var taskData = {};
                        taskData.user = results.user;
                        taskData.tasker = results.tasker._id;
                        taskData.invoice = {
                            'amount': {
                                "minimum_cost": task.category.commision,
                                "task_cost": task.category.commision,
                                "total": task.category.commision,
                                "grand_total": task.category.commision
                            }
                        }

                        var bookingtime = req.body.time ?  req.body.time : (task.task_time ? task.task_time : "00:00")
                        var formatedDate = moment(new Date(task.task_date +' '+ bookingtime)).format('YYYY-MM-DD HH:mm:ss');
                        // data.booking_information.booking_date = timezone.tz(formatedDate, settings.settings.time_zone);


                        taskData.booking_information = {
                            'service_type': task.category.name,
                            'work_type': task.category.name,
                            'work_id': task.category._id,
                            'booking_date' : timezone.tz(formatedDate, results.settings.time_zone),
                            'instruction': task.task_description
                        }
                        taskData.history = {};
                        taskData.history.job_booking_time = new Date();
                        taskData.status = 1;
                        taskData.hourly_rate = taskerCategory.hour_rate;
                        taskData.task_slots = req.body.slots;
                        // taskData.ratetype = taskerCategory.ratetype ? taskerCategory.ratetype : "";
                        // taskData.task_hour = taskerCategory.hour_rate;

                        db.findOneAndUpdate('task', { _id: task._id }, taskData, { 'new': true }, function (err, task) {
                            if (err) {
                                data.response = 'Error in booking Task';
                                res.send(data);
                            } else {
                                var job_date = timezone.tz(task.booking_information.booking_date, results.settings.time_zone).format(results.settings.date_format);
                                var job_time = timezone.tz(task.booking_information.booking_date, results.settings.time_zone).format(results.settings.time_format);

                                var mailData = {};
                                mailData.template = 'Taskpendingapproval';
                                mailData.to = results.user.email;
                                mailData.html = [];
                                mailData.html.push({ name: 'username', value: results.user.username });
                                mailData.html.push({ name: 'taskername', value: results.tasker.username });
                                mailData.html.push({ name: 'taskname', value: taskDetails[0].category.name });
                                mailData.html.push({ name: 'bookingid', value: task.booking_id });
                                mailData.html.push({ name: 'startdate', value: job_date });
                                mailData.html.push({ name: 'workingtime', value: job_time });
                                mailData.html.push({ name: 'description', value: task.task_description });

                                mailcontent.sendmail(mailData, function (err, response) {});

                                var mailData1 = {};
                                mailData1.template = 'Quickrabbitconfirmtask';
                                mailData1.to = results.tasker.email;
                                mailData1.html = [];
                                mailData1.html.push({ name: 'username', value: results.user.username });
                                mailData1.html.push({ name: 'taskername', value: results.tasker.username });
                                mailData1.html.push({ name: 'taskname', value: taskDetails[0].category.name });
                                mailData1.html.push({ name: 'bookingid', value: task.booking_id });
                                mailData1.html.push({ name: 'startdate', value: job_date });
                                mailData1.html.push({ name: 'workingtime', value: job_time });
                                mailData1.html.push({ name: 'description', value: task.task_description });

                                mailcontent.sendmail(mailData1, function (err, response) {});

                                var notifications = { 'job_id': task.booking_id, 'user_id': task.tasker };
                                var message = CONFIG.NOTIFICATION.REQUEST_FOR_A_JOB;
                                push.sendPushnotification(task.tasker, message, 'job_request', 'ANDROID', notifications, 'PROVIDER', function (err, response, body) { });

                                data.status = 1;
                                data.response = 'Task Booked Successfully';
                                res.send(data);
                            }
                        })
                    }
                });
            }
        });
    }


    router.taskerconfirmtask = function taskerconfirmtask(req, res) {
        var options = {};
        options.populate = 'tasker user category';
        var data = {};
        data.status = 0;

        db.GetOneDocument('task', { _id: req.body.task }, {}, options, function (err, docdata) {
            if (err || !docdata) {
                res.send(err);
            } else {
                var history = {};
                //history.provider_assigned = new Date();
                if (docdata.status == 8) {
                    res.status(400).send({ err: 'User already Cancelled the job' });
                } else {
                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settingdata) {
                        if (err || !docdata) {
                            res.send(err);
                        } else {
                            //new code
                            var formatedDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
                            history.provider_assigned = timezone.tz(formatedDate, settingdata.settings.time_zone);
                            db.GetOneDocument('task', { '_id': req.body.task }, {}, {}, function (err, taskdetails) {
                                if (err || !taskdetails) {
                                    res.send(err);
                                } else {
                                    db.GetAggregation('task', [{
                                        "$match": {
                                            $and: [{ "tasker": new mongoose.Types.ObjectId(req.body.tasker) }, { status: { $eq: 1 } }]
                                        }
                                    }], function (err, taskdata) {
                                        if (err || !taskdata) {
                                            res.send(err);
                                        } else {
                                            var trueValue = true;
                                            if (taskdata.length != 0) {
                                              /*   for (var i = 0; i < taskdata.length; i++) {
                                                    if (taskdata[i].task_day == taskdetails.task_day && taskdata[i].task_date == taskdetails.task_date && taskdata[i].task_hour == taskdetails.task_hour) {
                                                        trueValue = false;
                                                    }
                                                } */
                                                if (trueValue == true) {
                                                  //  if (trueValue == true) {
                                                    // new code
                                                    db.UpdateDocument('task', { _id: req.body.task }, { status: 2, 'history.provider_assigned': history.provider_assigned }, function (err, result) {
                                                        if (err) {
                                                            res.send(err);
                                                        } else {

                                                            var notifications = { 'job_id': docdata.booking_id, 'user_id': docdata.user._id };
                                                            var message = CONFIG.NOTIFICATION.YOUR_JOB_IS_ACCEPTED;
                                                            push.sendPushnotification(docdata.user._id, message, 'job_accepted', 'ANDROID', notifications, 'USER', function (err, response, body) { });

                                                            var job_date = timezone.tz(docdata.booking_information.booking_date, settingdata.settings.time_zone).format(settingdata.settings.date_format);
                                                            var job_time = timezone.tz(docdata.booking_information.booking_date, settingdata.settings.time_zone).format(settingdata.settings.time_format);

                                                            var mailData2 = {};
                                                            mailData2.template = 'Taskselected';
                                                            mailData2.to = docdata.user.email;
                                                            mailData2.html = [];
                                                            mailData2.html.push({ name: 'username', value: docdata.user.username });
                                                            mailData2.html.push({ name: 'taskername', value: docdata.tasker.username });
                                                            mailData2.html.push({ name: 'taskname', value: docdata.category.name });
                                                            mailData2.html.push({ name: 'bookingid', value: docdata.booking_id });
                                                            mailData2.html.push({ name: 'startdate', value: job_date });
                                                            mailData2.html.push({ name: 'workingtime', value: job_time });
                                                            mailData2.html.push({ name: 'taskname', value: docdata.category.name });
                                                            mailData2.html.push({ name: 'description', value: docdata.task_description });

                                                            mailcontent.sendmail(mailData2, function (err, response) { });

                                                            data.status = 1;
                                                            data.response = 'Task Booked Successfully';
                                                            res.send(data);
                                                            //res.send(result);
                                                        }
                                                    });
                                                    // new code
                                                } else {
                                                    var msg = "You have already booked a job in the chosen time, please choose a different time slot to perform job.";
                                                    res.send(msg);
                                                }

                                            } else {
                                                db.UpdateDocument('task', { _id: req.body.task }, { status: 2, 'history.provider_assigned': history.provider_assigned }, function (err, result) {
                                                    if (err) {
                                                        res.send(err);
                                                    } else {
                                                        var notifications = { 'job_id': docdata.booking_id, 'user_id': docdata.user._id };
                                                        var message = CONFIG.NOTIFICATION.YOUR_JOB_IS_ACCEPTED;
                                                        push.sendPushnotification(docdata.user._id, message, 'job_accepted', 'ANDROID', notifications, 'USER', function (err, response, body) { });

                                                        var job_date = timezone.tz(docdata.booking_information.booking_date, settingdata.settings.time_zone).format(settingdata.settings.date_format);
                                                        var job_time = timezone.tz(docdata.booking_information.booking_date, settingdata.settings.time_zone).format(settingdata.settings.time_format);


                                                        var mailData2 = {};
                                                        mailData2.template = 'Taskselected';
                                                        mailData2.to = docdata.user.email;
                                                        mailData2.html = [];

                                                        mailData2.html.push({ name: 'username', value: docdata.user.username });
                                                        mailData2.html.push({ name: 'taskername', value: docdata.tasker.username });
                                                        mailData2.html.push({ name: 'taskname', value: docdata.category.name });
                                                        mailData2.html.push({ name: 'bookingid', value: docdata.booking_id });
                                                        mailData2.html.push({ name: 'startdate', value: job_date });
                                                        mailData2.html.push({ name: 'workingtime', value: job_time });
                                                        mailData2.html.push({ name: 'taskname', value: docdata.category.name });
                                                        mailData2.html.push({ name: 'description', value: docdata.task_description });
                                                        mailcontent.sendmail(mailData2, function (err, response) { });

                                                        res.send(result);
                                                    }
                                                });
                                            }
                                            // new code

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



    /*
        router.confirmtask = function confirmtask(req, res) {

            console.log("confirmtaskconfirmtaskconfirmtaskconfirmtaskconfirmtask", req.body);
            if (req.body.data.status == 2) {
                data = req.body.data;
                var history = {};
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settingdata) {
                    if (err || !settingdata) {
                        res.send(err);
                    } else {
                        db.GetDocument('task', { _id: req.body.data._id }, { booking_information: 1 }, {}, function (err, dateDate) {
                            if (err) {
                                res.send(err);
                            } else {
                                data.booking_information.booking_date = dateDate[0].booking_information.booking_date;
                                //new code
                                db.GetOneDocument('task', { '_id': req.body.data._id }, {}, {}, function (err, taskdetails) {
                                    if (err || !taskdetails) {
                                        res.send(err);
                                    } else {
                                        db.GetAggregation('task', [{
                                            "$match": {
                                                $and: [{ "tasker": new mongoose.Types.ObjectId(req.body.data.tasker) }, { status: { $eq: req.body.data.status } }]
                                            }
                                        }], function (err, taskdata) {
                                            if (err || !taskdata) {
                                                res.send(err);
                                            } else {
                                                var trueValue = true;
                                                if (taskdata.length != 0) {
                                                    for (var i = 0; i < taskdata.length; i++) {
                                                        if (taskdata[i].task_day == taskdetails.task_day && taskdata[i].task_date == taskdetails.task_date && taskdata[i].task_hour == taskdetails.task_hour) {
                                                            trueValue = false;
                                                        }
                                                    }

                                                    if (trueValue == true) {
                                                        // new code
                                                        db.UpdateDocument('task', { _id: req.body.data._id }, data, {}, function (err, docdata) {
                                                            if (err) {
                                                                res.send(err);
                                                            } else {
                                                                var options = {};
                                                                options.populate = 'user tasker category';
                                                                db.GetDocument('task', { _id: req.body.data._id }, {}, options, function (err, taskdata) {
                                                                    if (err) {
                                                                        res.send(err);
                                                                    } else {
                                                                        db.GetOneDocument('category', { _id: taskdata[0].category.parent }, {}, options, function (err, category) {
                                                                            if (err) {
                                                                                res.send(err);
                                                                            } else {
                                                                                var job_date = timezone.tz(taskdata[0].booking_information.booking_date, settingdata.settings.time_zone).format(settingdata.settings.date_format);
                                                                                var job_time = timezone.tz(taskdata[0].booking_information.booking_date, settingdata.settings.time_zone).format(settingdata.settings.time_format);
                                                                                var mailcredentials = {};
                                                                                mailcredentials.taskname = category.name + " (" + req.body.data.category.name + ")";
                                                                                mailcredentials.username = taskdata[0].user.username;
                                                                                mailcredentials.taskername = taskdata[0].tasker.username;
                                                                                mailcredentials.taskeremail = taskdata[0].tasker.email;
                                                                                mailcredentials.useremail = taskdata[0].user.email;
                                                                                mailcredentials.bookingid = taskdata[0].booking_id;
                                                                                mailcredentials.taskdate = job_date;
                                                                                mailcredentials.taskhour = job_time;
                                                                                mailcredentials.taskdescription = req.body.data.task_description;
                                                                                var username;
                                                                                var taskername;
                                                                                if (taskdata[0].tasker.name) {
                                                                                    taskername = taskdata[0].tasker.name.first_name + " (" + taskdata[0].tasker.username + ")";
                                                                                } else { taskername = taskdata[0].tasker.username; }
                                                                                if (taskdata[0].user.name) {
                                                                                    username = taskdata[0].user.name.first_name + " (" + taskdata[0].user.username + ")";
                                                                                } else { username = taskdata[0].user.username; }
                                                                                var mailData = {};
                                                                                mailData.template = 'Taskpendingapproval';
                                                                                mailData.to = mailcredentials.useremail;
                                                                                mailData.html = [];
                                                                                mailData.html.push({ name: 'username', value: username });
                                                                                mailData.html.push({ name: 'taskername', value: taskername });
                                                                                mailData.html.push({ name: 'taskname', value: mailcredentials.taskname });
                                                                                mailData.html.push({ name: 'bookingid', value: mailcredentials.bookingid });
                                                                                mailData.html.push({ name: 'startdate', value: mailcredentials.taskdate });
                                                                                mailData.html.push({ name: 'workingtime', value: mailcredentials.taskhour });
                                                                                mailData.html.push({ name: 'description', value: mailcredentials.taskdescription });
                                                                                mailData.html.push({ name: 'site_url', value: settingdata.settings.site_url });
                                                                                mailData.html.push({ name: 'site_title', value: settingdata.settings.site_title });
                                                                                mailData.html.push({ name: 'logo', value: settingdata.settings.logo });
                                                                                mailcontent.sendmail(mailData, function (err, response) { });
                                                                                var mailData1 = {};
                                                                                mailData1.template = 'Quickrabbitconfirmtask';
                                                                                mailData1.to = mailcredentials.taskeremail;
                                                                                mailData1.html = [];
                                                                                mailData1.html.push({ name: 'username', value: username });
                                                                                mailData1.html.push({ name: 'taskername', value: taskername });
                                                                                mailData1.html.push({ name: 'taskname', value: mailcredentials.taskname });
                                                                                mailData1.html.push({ name: 'bookingid', value: mailcredentials.bookingid });
                                                                                mailData1.html.push({ name: 'startdate', value: mailcredentials.taskdate });
                                                                                mailData1.html.push({ name: 'workingtime', value: mailcredentials.taskhour });
                                                                                mailData1.html.push({ name: 'description', value: mailcredentials.taskdescription });
                                                                                mailData1.html.push({ name: 'site_url', value: settingdata.settings.site_url });
                                                                                mailData1.html.push({ name: 'site_title', value: settingdata.settings.site_title });
                                                                                mailData1.html.push({ name: 'logo', value: settingdata.settings.logo });
                                                                                mailcontent.sendmail(mailData1, function (err, response) { });
                                                                                var mailData2 = {};
                                                                                mailData2.template = 'Newtaskregister';
                                                                                mailData2.to = settingdata.settings.email_address;
                                                                                mailData2.html = [];
                                                                                mailData2.html.push({ name: 'username', value: username });
                                                                                mailData2.html.push({ name: 'taskername', value: taskername });
                                                                                mailData2.html.push({ name: 'taskname', value: mailcredentials.taskname });
                                                                                mailData2.html.push({ name: 'bookingid', value: mailcredentials.bookingid });
                                                                                mailData2.html.push({ name: 'startdate', value: mailcredentials.taskdate });
                                                                                mailData2.html.push({ name: 'workingtime', value: mailcredentials.taskhour });
                                                                                mailData2.html.push({ name: 'description', value: mailcredentials.taskdescription });
                                                                                mailData2.html.push({ name: 'site_url', value: settingdata.settings.site_url });
                                                                                mailData2.html.push({ name: 'site_title', value: settingdata.settings.site_title });
                                                                                mailData2.html.push({ name: 'logo', value: settingdata.settings.logo });
                                                                                mailcontent.sendmail(mailData2, function (err, response) { });
                                                                                if (data.status == 1) {
                                                                                    var notifications = { 'job_id': taskdata[0].booking_id, 'user_id': taskdata[0].tasker._id };
                                                                                    var message = CONFIG.NOTIFICATION.REQUEST_FOR_A_JOB;
                                                                                    push.sendPushnotification(taskdata[0].tasker._id, message, 'job_request', 'ANDROID', notifications, 'PROVIDER', function (err, response, body) { });
                                                                                    res.send(taskdata[0]);
                                                                                } else {
                                                                                    var notifications = { 'job_id': taskdata[0].booking_id, 'user_id': taskdata[0].user._id };
                                                                                    var message = CONFIG.NOTIFICATION.YOUR_JOB_IS_ACCEPTED;
                                                                                    push.sendPushnotification(taskdata[0].user._id, message, 'job_accepted', 'ANDROID', notifications, 'USER', function (err, response, body) { });
                                                                                    res.send(taskdata[0]);
                                                                                }
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                        // new code
                                                    } else {
                                                        var msg = "You have already booked a job in the chosen time, please choose a different time slot to perform job.";
                                                        res.send(msg);
                                                    }

                                                } else {
                                                    //var time =new Date();
                                                    var formatedDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
                                                    var time = timezone.tz(formatedDate, settingData.settings.time_zone);
                                                    db.UpdateDocument('task', { _id: req.body.data._id }, { status: 2, 'history.provider_assigned': time }, function (err, result) {
                                                        if (err) {
                                                            res.send(err);
                                                        } else {
                                                            db.GetDocument('task', { _id: req.body.data._id }, {}, {}, function (err, taskdata) {
                                                                if (err) {
                                                                    res.send(err);
                                                                } else {
                                                                    db.GetOneDocument('category', { _id: taskdata[0].category.parent }, {}, {}, function (err, category) {
                                                                        if (err) {
                                                                            res.send(err);
                                                                        } else {

                                                                            var mailcredentials = {};

                                                                            mailcredentials.username = taskdata[0].user.username;
                                                                            mailcredentials.taskername = taskdata[0].tasker.username;
                                                                            mailcredentials.taskeremail = taskdata[0].tasker.email;
                                                                            mailcredentials.useremail = taskdata[0].user.email;
                                                                            mailcredentials.bookingid = taskdata[0].booking_id;

                                                                            var username;
                                                                            var taskername;
                                                                            if (taskdata[0].tasker.name) {
                                                                                taskername = taskdata[0].tasker.name.first_name + " (" + taskdata[0].tasker.username + ")";
                                                                            } else { taskername = taskdata[0].tasker.username; }
                                                                            if (taskdata[0].user.name) {
                                                                                username = taskdata[0].user.name.first_name + " (" + taskdata[0].user.username + ")";
                                                                            } else { username = taskdata[0].user.username; }


                                                                            var notifications = { 'job_id': data.booking_id, 'user_id': data.user._id };
                                                                            var message = CONFIG.NOTIFICATION.YOUR_JOB_IS_ACCEPTED;
                                                                            push.sendPushnotification(data.user._id, message, 'job_accepted', 'ANDROID', notifications, 'USER', function (err, response, body) { });

                                                                            var job_date = timezone.tz(data.booking_information.booking_date, settingdata.settings.time_zone).format(settingdata.settings.date_format);
                                                                            var job_time = timezone.tz(data.booking_information.booking_date, settingdata.settings.time_zone).format(settingdata.settings.time_format);

                                                                            var mailData = {};
                                                                            mailData.template = 'Admintaskselected';
                                                                            mailData.to = "";
                                                                            mailData.html = [];
                                                                            mailData.html.push({ name: 'site_url', value: settingdata.settings.site_url });
                                                                            mailData.html.push({ name: 'site_title', value: settingdata.settings.site_title });
                                                                            mailData.html.push({ name: 'taskname', value: data.category.name });
                                                                            mailData.html.push({ name: 'bookingid', value: data.booking_id });
                                                                            mailData.html.push({ name: 'logo', value: settingdata.settings.logo });
                                                                            mailData.html.push({ name: 'startdate', value: job_date });
                                                                            mailData.html.push({ name: 'workingtime', value: job_time });
                                                                            mailData.html.push({ name: 'username', value: data.user.username });
                                                                            mailData.html.push({ name: 'username', value: data.user.name.first_name + "(" + data.user.username + ")" });
                                                                            mailData.html.push({ name: 'taskername', value: taskername });
                                                                            mailcontent.sendmail(mailData, function (err, response) { });

                                                                            var mailData1 = {};
                                                                            mailData1.template = 'Taskconfirmbytasker';
                                                                            mailData1.to = mailcredentials.taskeremail;
                                                                            mailData1.html = [];
                                                                            mailData1.html.push({ name: 'site_url', value: settingdata.settings.site_url });
                                                                            mailData1.html.push({ name: 'site_title', value: settingdata.settings.site_title });
                                                                            mailData1.html.push({ name: 'logo', value: settingdata.settings.logo });
                                                                            mailData1.html.push({ name: 'username', value: data.user.name.first_name + "(" + data.user.username + ")" });
                                                                            mailData1.html.push({ name: 'taskername', value: taskername });
                                                                            mailData1.html.push({ name: 'taskname', value: data.category.name });
                                                                            mailData1.html.push({ name: 'bookingid', value: data.booking_id });
                                                                            mailData1.html.push({ name: 'startdate', value: job_date });
                                                                            mailData1.html.push({ name: 'workingtime', value: job_time });
                                                                            mailData1.html.push({ name: 'description', value: data.task_description });
                                                                            mailData1.html.push({ name: 'taskname', value: data.category.name });
                                                                            mailcontent.sendmail(mailData1, function (err, response) { });

                                                                            var mailData2 = {};
                                                                            mailData2.template = 'Taskselected';
                                                                            mailData2.to = data.user.email;
                                                                            mailData2.html = [];
                                                                            mailData2.html.push({ name: 'site_url', value: settingdata.settings.site_url });
                                                                            mailData2.html.push({ name: 'site_title', value: settingdata.settings.site_title });
                                                                            mailData2.html.push({ name: 'logo', value: settingdata.settings.logo });
                                                                            mailData2.html.push({ name: 'username', value: data.user.name.first_name + "(" + data.user.username + ")" });
                                                                            mailData2.html.push({ name: 'taskername', value: taskername });
                                                                            mailData2.html.push({ name: 'taskname', value: data.category.name });
                                                                            mailData2.html.push({ name: 'bookingid', value: data.booking_id });
                                                                            mailData2.html.push({ name: 'startdate', value: job_date });
                                                                            mailData2.html.push({ name: 'workingtime', value: job_time });
                                                                            mailData2.html.push({ name: 'taskname', value: data.category.name });
                                                                            mailData2.html.push({ name: 'description', value: data.task_description });
                                                                            mailcontent.sendmail(mailData2, function (err, response) { });

                                                                            res.send(result);
                                                                        }
                                                                    });

                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                                // new code


                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            } else {
                data = req.body.data;
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settingdata) {
                    if (err || !settingdata) {
                        res.send(err);
                    } else {
                        db.GetDocument('task', { _id: req.body.data._id }, { booking_information: 1 }, {}, function (err, dateDate) {
                            if (err) {
                                res.send(err);
                            } else {
                                var formatedDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
                                data.history.job_booking_time = timezone.tz(formatedDate, settingdata.settings.time_zone);
                                data.booking_information.booking_date = dateDate[0].booking_information.booking_date;
                                db.UpdateDocument('task', { _id: req.body.data._id }, data, {}, function (err, docdata) {
                                    if (err) {
                                        res.send(err);
                                    } else {
                                        var options = {};
                                        options.populate = 'user tasker category';
                                        db.GetDocument('task', { _id: req.body.data._id }, {}, options, function (err, taskdata) {
                                            if (err) {
                                                res.send(err);
                                            } else {
                                                db.GetOneDocument('category', { _id: taskdata[0].category.parent }, {}, options, function (err, category) {
                                                    if (err) {
                                                        res.send(err);
                                                    } else {
                                                        var job_date = timezone.tz(taskdata[0].booking_information.booking_date, settingdata.settings.time_zone).format(settingdata.settings.date_format);
                                                        var job_time = timezone.tz(taskdata[0].booking_information.booking_date, settingdata.settings.time_zone).format(settingdata.settings.time_format);
                                                        var mailcredentials = {};
                                                        mailcredentials.taskname = category.name + " (" + req.body.data.category.name + ")";
                                                        mailcredentials.username = taskdata[0].user.username;
                                                        mailcredentials.taskername = taskdata[0].tasker.username;
                                                        mailcredentials.taskeremail = taskdata[0].tasker.email;
                                                        mailcredentials.useremail = taskdata[0].user.email;
                                                        mailcredentials.bookingid = taskdata[0].booking_id;
                                                        mailcredentials.taskdate = job_date;
                                                        mailcredentials.taskhour = job_time;
                                                        mailcredentials.taskdescription = req.body.data.task_description;
                                                        var username;
                                                        var taskername;
                                                        if (taskdata[0].tasker.name) {
                                                            taskername = taskdata[0].tasker.name.first_name + " (" + taskdata[0].tasker.username + ")";
                                                        } else { taskername = taskdata[0].tasker.username; }
                                                        if (taskdata[0].user.name) {
                                                            username = taskdata[0].user.name.first_name + " (" + taskdata[0].user.username + ")";
                                                        } else { username = taskdata[0].user.username; }
                                                        var mailData = {};
                                                        mailData.template = 'Taskpendingapproval';
                                                        mailData.to = mailcredentials.useremail;
                                                        mailData.html = [];
                                                        mailData.html.push({ name: 'username', value: username });
                                                        mailData.html.push({ name: 'taskername', value: taskername });
                                                        mailData.html.push({ name: 'taskname', value: mailcredentials.taskname });
                                                        mailData.html.push({ name: 'bookingid', value: mailcredentials.bookingid });
                                                        mailData.html.push({ name: 'startdate', value: mailcredentials.taskdate });
                                                        mailData.html.push({ name: 'workingtime', value: mailcredentials.taskhour });
                                                        mailData.html.push({ name: 'description', value: mailcredentials.taskdescription });
                                                        mailData.html.push({ name: 'site_url', value: settingdata.settings.site_url });
                                                        mailData.html.push({ name: 'site_title', value: settingdata.settings.site_title });
                                                        mailData.html.push({ name: 'logo', value: settingdata.settings.logo });
                                                        mailcontent.sendmail(mailData, function (err, response) { });
                                                        var mailData1 = {};
                                                        mailData1.template = 'Quickrabbitconfirmtask';
                                                        mailData1.to = mailcredentials.taskeremail;
                                                        mailData1.html = [];
                                                        mailData1.html.push({ name: 'username', value: username });
                                                        mailData1.html.push({ name: 'taskername', value: taskername });
                                                        mailData1.html.push({ name: 'taskname', value: mailcredentials.taskname });
                                                        mailData1.html.push({ name: 'bookingid', value: mailcredentials.bookingid });
                                                        mailData1.html.push({ name: 'startdate', value: mailcredentials.taskdate });
                                                        mailData1.html.push({ name: 'workingtime', value: mailcredentials.taskhour });
                                                        mailData1.html.push({ name: 'description', value: mailcredentials.taskdescription });
                                                        mailData1.html.push({ name: 'site_url', value: settingdata.settings.site_url });
                                                        mailData1.html.push({ name: 'site_title', value: settingdata.settings.site_title });
                                                        mailData1.html.push({ name: 'logo', value: settingdata.settings.logo });
                                                        mailcontent.sendmail(mailData1, function (err, response) { });
                                                        var mailData2 = {};
                                                        mailData2.template = 'Newtaskregister';
                                                        mailData2.to = settingdata.settings.email_address;
                                                        mailData2.html = [];
                                                        mailData2.html.push({ name: 'username', value: username });
                                                        mailData2.html.push({ name: 'taskername', value: taskername });
                                                        mailData2.html.push({ name: 'taskname', value: mailcredentials.taskname });
                                                        mailData2.html.push({ name: 'bookingid', value: mailcredentials.bookingid });
                                                        mailData2.html.push({ name: 'startdate', value: mailcredentials.taskdate });
                                                        mailData2.html.push({ name: 'workingtime', value: mailcredentials.taskhour });
                                                        mailData2.html.push({ name: 'description', value: mailcredentials.taskdescription });
                                                        mailData2.html.push({ name: 'site_url', value: settingdata.settings.site_url });
                                                        mailData2.html.push({ name: 'site_title', value: settingdata.settings.site_title });
                                                        mailData2.html.push({ name: 'logo', value: settingdata.settings.logo });
                                                        mailcontent.sendmail(mailData2, function (err, response) { });
                                                        if (data.status == 1) {
                                                            var notifications = { 'job_id': taskdata[0].booking_id, 'user_id': taskdata[0].tasker._id };
                                                            var message = CONFIG.NOTIFICATION.REQUEST_FOR_A_JOB;
                                                            push.sendPushnotification(taskdata[0].tasker._id, message, 'job_request', 'ANDROID', notifications, 'PROVIDER', function (err, response, body) { });
                                                            res.send(taskdata[0]);
                                                        } else {
                                                            var notifications = { 'job_id': taskdata[0].booking_id, 'user_id': taskdata[0].user._id };
                                                            var message = CONFIG.NOTIFICATION.YOUR_JOB_IS_ACCEPTED;
                                                            push.sendPushnotification(taskdata[0].user._id, message, 'job_accepted', 'ANDROID', notifications, 'USER', function (err, response, body) { });
                                                            res.send(taskdata[0]);
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

        };
    */
    router.taskerCount = function taskerCount(req, res) {
        var taskid = req.query.task;
        var categoryname = req.query.categoryname;
        var limit = parseInt(req.query.limit) || 2;
        var skip = parseInt(req.query.skip) || 0;
        db.GetOneDocument('task', { _id: new mongoose.Types.ObjectId(taskid) }, {}, {}, function (err, taskDataaa) {
            if (err || !taskDataaa) {
                res.send(err);
            } else {

                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settingData) {

                    if (err) {
                        var data = {};
                        data.response = 'Configure your website setting';
                        data.status = 0;
                        res.send(data);
                    } else {

                        if (settingData.settings.distanceby == 'km') {
                            var distanceval = 0.001;
                        } else {
                            var distanceval = 0.000621371;
                        }

                        var taskercondition = [{
                            "$geoNear": {
                                near: { type: "Point", coordinates: [parseFloat(taskDataaa.location.log), parseFloat(taskDataaa.location.lat)] },
                                distanceField: "distance",
                                includeLocs: "location",
                                query: {
                                    "status": 1,
                                    "taskerskills": { $elemMatch: { childid: new mongoose.Types.ObjectId(taskDataaa.category), status: 1 } }
                                },
                                distanceMultiplier: distanceval,
                                spherical: true
                            }
                        },
                        {
                            "$redact": {
                                "$cond": {
                                    "if": { "$lte": ["$distance", "$radius"] },
                                    "then": "$$KEEP",
                                    "else": "$$PRUNE"
                                }
                            }
                        },
                        { '$skip': skip },
                        { '$limit': limit },
                        {
                            "$group": {
                                _id: null,
                                count: { $sum: 1 },
                                taskers: { $push: "$$ROOT" }
                            }
                        }
                        ];
                        db.GetAggregation('tasker', taskercondition, function (err, docdata) {
                            if (err || !docdata[0]) {
                                res.send({ count: 0, result: [] });
                            } else {
                                res.send({ count: docdata[0].count });

                            }
                        });
                    }
                });
            }
        });
    };


    router.gettask = function gettask(req, res) {
        var options = {};
        options.populate = 'category user';
        db.GetDocument('task', { _id: req.body.task }, {}, options, function (err, docdata) {
            if (err || !docdata) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        })
    }

    router.profileConfirm = function profileConfirm(req, res) {

        // console.log('req.body -= ', req.body);

        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settingdata) {
            if (err || !settingdata) {
                res.send(err);
            } else {
                db.GetOneDocument('task', { _id: req.body._id }, { booking_information: 1 }, {}, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        db.UpdateDocument('task', { _id: req.body._id }, { 'booking_information.est_reach_date': '', 'booking_information.reach_date': '', 'booking_information.instruction': req.body.booking_information.instruction, 'booking_information.service_type':req.body.booking_information.service_type, 'booking_information.location': req.body.booking_information.location, 'history': req.body.history, 'invoice': req.body.invoice, 'tasker': req.body.tasker, 'user': req.body.user, 'hourly_rate': req.body.hourly_rate, 'status': req.body.status }, {}, function (err, docdata) {
                            if (err) {
                                res.send(err);
                            } else {
                                var options = {};
                                options.populate = 'user tasker category';
                                db.GetDocument('task', { _id: req.body._id }, {}, options, function (err, taskdata) {
                                    if (err) {
                                        res.send(err);
                                    } else {
                                        db.GetOneDocument('category', { _id: taskdata[0].category.parent }, {}, options, function (err, category) {
                                            if (err) {
                                                res.send(err);
                                            } else {
                                                var job_date = timezone.tz(taskdata[0].booking_information.booking_date, settingdata.settings.time_zone).format(settingdata.settings.date_format);
                                                var job_time = timezone.tz(taskdata[0].booking_information.booking_date, settingdata.settings.time_zone).format(settingdata.settings.time_format);

                                                var mailData = {};
                                                mailData.template = 'Taskpendingapproval';
                                                mailData.to = taskdata[0].user.email;
                                                mailData.html = [];
                                                mailData.html.push({ name: 'username', value: taskdata[0].user.username });
                                                mailData.html.push({ name: 'taskername', value: taskdata[0].tasker.username });
                                                mailData.html.push({ name: 'taskname', value: req.body.booking_information.work_type });
                                                mailData.html.push({ name: 'bookingid', value: taskdata[0].booking_id });
                                                mailData.html.push({ name: 'startdate', value: job_date });
                                                mailData.html.push({ name: 'workingtime', value: job_time });
                                                mailData.html.push({ name: 'description', value: taskdata[0].task_description });

                                                mailcontent.sendmail(mailData, function (err, response) {});

                                                var mailData1 = {};
                                                mailData1.template = 'Quickrabbitconfirmtask';
                                                mailData1.to = taskdata[0].tasker.email;
                                                mailData1.html = [];
                                                mailData1.html.push({ name: 'username', value: taskdata[0].user.username });
                                                mailData1.html.push({ name: 'taskername', value: taskdata[0].tasker.username });
                                                mailData1.html.push({ name: 'taskname', value: req.body.booking_information.work_type });
                                                mailData1.html.push({ name: 'bookingid', value: taskdata[0].booking_id });
                                                mailData1.html.push({ name: 'startdate', value: job_date });
                                                mailData1.html.push({ name: 'workingtime', value: job_time });
                                                mailData1.html.push({ name: 'description', value: taskdata[0].task_description });

                                                mailcontent.sendmail(mailData1, function (err, response) {});

                                                if (req.body.status == 1) {
                                                    var notifications = { 'job_id': taskdata[0].booking_id, 'user_id': taskdata[0].tasker._id };
                                                    var message = CONFIG.NOTIFICATION.REQUEST_FOR_A_JOB;
                                                    push.sendPushnotification(taskdata[0].tasker._id, message, 'job_request', 'ANDROID', notifications, 'PROVIDER', function (err, response, body) { });
                                                    res.send(taskdata[0]);
                                                } else {
                                                    var notifications = { 'job_id': taskdata[0].booking_id, 'user_id': taskdata[0].user._id };
                                                    var message = CONFIG.NOTIFICATION.YOUR_JOB_IS_ACCEPTED;
                                                    push.sendPushnotification(taskdata[0].user._id, message, 'job_accepted', 'ANDROID', notifications, 'USER', function (err, response, body) { });
                                                    res.send(taskdata[0]);
                                                }
                                            }
                                        });
                                    }
                                })
                            }
                        })
                    }
                })
            }
        })
    }

    return router;
};
