module.exports = function (io) {
	var db = require('../model/mongodb.js');
	var async = require("async");
	var mail = require('../model/mail.js');
	var mailcontent = require('../model/mailcontent.js');
	var timezone = require('moment-timezone');
	var push = require('../model/pushNotification.js')(io);
	var CONFIG = require('../config/config');

	return {
		taskReminder: function taskReminder(taskdetails, callback) {
			async.parallel({
				settings: function (callback) {
					db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
						callback(err, settings.settings);
					});
				}
			}, function (err, result) {

				var job_date = timezone.tz(taskdetails[0].booking_information.booking_date, result.settings.time_zone).format(result.settings.date_format);
				var job_time = timezone.tz(taskdetails[0].booking_information.booking_date, result.settings.time_zone).format(result.settings.time_format);
				if (!err || result) {
					var reminder = parseInt(result.settings.accepttime);
					var minreminder = parseInt(result.settings.minaccepttime);
					var taskerreminder = minreminder * 60 * 1000;
					var adminreminder = reminder * 60 * 1000;
					setTimeout(function () {
						var options = {};
						options.populate = 'tasker';
						db.GetOneDocument('task', { 'booking_id': taskdetails[0].booking_id }, {}, options, function (err, task) {
							if (err || !task) {
								res.send({
									"status": "0",
									"response": 'Invalid Job'
								});
							}
							else {
								if (task.status == 1 && !task.tasker.current_task) {
									var mailData = {};
									mailData.template = 'Acceptnotificationtoadmin';
									mailData.to = result.settings.email_address;
									mailData.html = [];
									mailData.html.push({ name: 'site_url', value: result.settings.site_url });
									mailData.html.push({ name: 'site_title', value: result.settings.site_title });
									mailData.html.push({ name: 'taskname', value: taskdetails[0].category.name });
									mailData.html.push({ name: 'bookingid', value: taskdetails[0].booking_id });
									mailData.html.push({ name: 'logo', value: result.settings.logo });
									mailData.html.push({ name: 'startdate', value: job_date });
									mailData.html.push({ name: 'workingtime', value: job_time });
									mailData.html.push({ name: 'username', value: taskdetails[0].user.username });
									mailData.html.push({ name: 'taskername', value: taskdetails[0].tasker.username });
									mailData.html.push({ name: 'remainingtime', value: result.settings.accepttime / 2 });
									mailcontent.sendmail(mailData, function (err, response) { });

									var mailData1 = {};
									mailData1.template = 'Remainingaccepttimetotasker';
									mailData1.to = taskdetails[0].tasker.email;
									mailData1.html = [];
									mailData1.html.push({ name: 'site_url', value: result.settings.site_url });
									mailData1.html.push({ name: 'site_title', value: result.settings.site_title });
									mailData1.html.push({ name: 'taskname', value: taskdetails[0].category.name });
									mailData1.html.push({ name: 'bookingid', value: taskdetails[0].booking_id });
									mailData1.html.push({ name: 'logo', value: result.settings.logo });
									mailData1.html.push({ name: 'startdate', value: job_date });
									mailData1.html.push({ name: 'workingtime', value: job_time });
									mailData1.html.push({ name: 'username', value: taskdetails[0].user.username });
									mailData1.html.push({ name: 'taskername', value: taskdetails[0].tasker.username });
									mailData1.html.push({ name: 'remainingtime', value: result.settings.accepttime / 2 });
									mailcontent.sendmail(mailData1, function (err, response) { });

									var notifications = { 'job_id': taskdetails[0].booking_id, 'user_id': taskdetails[0].tasker._id };
									var message = CONFIG.NOTIFICATION.PLEASE_ACCEPT_THE_PENDING_TASK;
									push.sendPushnotification(taskdetails[0].tasker._id, message, 'Accept_task', 'ANDROID', notifications, 'PROVIDER', function (err, response, body) { });

								}
								if (task.status == 1 && task.tasker.current_task) {
									var mailData = {};
									mailData.template = 'Taskerengagedtoadmin';
									mailData.to = result.settings.email_address;
									mailData.html = [];
									mailData.html.push({ name: 'site_url', value: result.settings.site_url });
									mailData.html.push({ name: 'site_title', value: result.settings.site_title });
									mailData.html.push({ name: 'taskname', value: taskdetails[0].category.name });
									mailData.html.push({ name: 'bookingid', value: taskdetails[0].booking_id });
									mailData.html.push({ name: 'logo', value: result.settings.logo });
									mailData.html.push({ name: 'startdate', value: job_date });
									mailData.html.push({ name: 'workingtime', value: job_time });
									mailData.html.push({ name: 'username', value: taskdetails[0].user.username });
									mailData.html.push({ name: 'taskername', value: taskdetails[0].tasker.username });
									mailcontent.sendmail(mailData, function (err, response) { });

								}
							}
						});
					}, taskerreminder);

					setTimeout(function () {
						var options = {};
						options.populate = 'tasker';
						db.GetOneDocument('task', { 'booking_id': taskdetails[0].booking_id }, {}, options, function (err, taskdet) {

							if (taskdet.status == 1) {

								if (!taskdet.tasker.current_task) {
									db.UpdateDocument('task', { _id: taskdet._id }, { 'status': 0 }, {}, function (err, docdata) {
										
										if (err || !docdata) {
											res.send(err);
										}
										else {
											var mailData = {};
											mailData.template = 'Taskeraccepttimeover';
											mailData.to = result.settings.email_address;
											mailData.html = [];
											mailData.html.push({ name: 'site_url', value: result.settings.site_url });
											mailData.html.push({ name: 'site_title', value: result.settings.site_title });
											mailData.html.push({ name: 'taskname', value: taskdetails[0].category.name });
											mailData.html.push({ name: 'bookingid', value: taskdetails[0].booking_id });
											mailData.html.push({ name: 'logo', value: result.settings.logo });
											mailData.html.push({ name: 'startdate', value: job_date });
											mailData.html.push({ name: 'workingtime', value: job_time });
											mailData.html.push({ name: 'username', value: taskdetails[0].user.username });
											mailData.html.push({ name: 'taskername', value: taskdetails[0].tasker.username });
											mailcontent.sendmail(mailData, function (err, response) { });

											var mailData1 = {};
											mailData1.template = 'Acceptimeovermailtotasker';
											mailData1.to = taskdetails[0].tasker.email;
											mailData1.html = [];
											mailData1.html.push({ name: 'site_url', value: result.settings.site_url });
											mailData1.html.push({ name: 'site_title', value: result.settings.site_title });
											mailData1.html.push({ name: 'taskname', value: taskdetails[0].category.name });
											mailData1.html.push({ name: 'bookingid', value: taskdetails[0].booking_id });
											mailData1.html.push({ name: 'logo', value: result.settings.logo });
											mailData1.html.push({ name: 'startdate', value: job_date });
											mailData1.html.push({ name: 'workingtime', value: job_time });
											mailData1.html.push({ name: 'username', value: taskdetails[0].user.username });
											mailData1.html.push({ name: 'taskername', value: taskdetails[0].tasker.username });
											mailcontent.sendmail(mailData1, function (err, response) { });

											var mailData2 = {};
											mailData2.template = 'Useraccepttimeover';
											mailData2.to = taskdetails[0].user.email;
											mailData2.html = [];
											mailData2.html.push({ name: 'site_url', value: result.settings.site_url });
											mailData2.html.push({ name: 'site_title', value: result.settings.site_title });
											mailData2.html.push({ name: 'taskname', value: taskdetails[0].category.name });
											mailData2.html.push({ name: 'bookingid', value: taskdetails[0].booking_id });
											mailData2.html.push({ name: 'logo', value: result.settings.logo });
											mailData2.html.push({ name: 'startdate', value: job_date });
											mailData2.html.push({ name: 'workingtime', value: job_time });
											mailData2.html.push({ name: 'username', value: taskdetails[0].user.username });
											mailData2.html.push({ name: 'taskername', value: taskdetails[0].tasker.username });
											mailcontent.sendmail(mailData2, function (err, response) { });

											var notifications = { 'job_id': taskdetails[0].booking_id, 'user_id': taskdetails[0].tasker._id };
											var message = CONFIG.NOTIFICATION.YOU_LEFT_THE_JOB;
											push.sendPushnotification(taskdetails[0].tasker._id, message, 'Left_job', 'ANDROID', notifications, 'PROVIDER', function (err, response, body) { });

											var notifications = { 'job_id': taskdetails[0].booking_id, 'user_id': taskdetails[0].user._id };
											var message = CONFIG.NOTIFICATION.TASKER_FAILED_TO_ACCEPT_YOUR_JOB;
											push.sendPushnotification(taskdetails[0].user._id, message, 'Task_failed', 'ANDROID', notifications, 'USER', function (err, response, body) { });
										}
									});

								}
								else {
									db.UpdateDocument('task', { _id: taskdet._id }, { 'status': 0 }, {}, function (err, docdata) {
										if (err || !docdata) {
											res.send(err);
										}
										else {
											var notifications = { 'job_id': taskdetails[0].booking_id, 'user_id': taskdetails[0].user._id };
											var message = CONFIG.NOTIFICATION.TASKER_FAILED_TO_ACCEPT_YOUR_JOB;
											push.sendPushnotification(taskdetails[0].user._id, message, 'Task_failed', 'ANDROID', notifications, 'USER', function (err, response, body) { });
										}
									});
								}
							}
						});
					}, adminreminder);
					callback(err, result);
				}
			});
		}//taskReminder
	};// end return
}
