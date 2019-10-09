"use strict";

module.exports = function () {
	var db = require('../../model/mongodb.js');
	var middlewares = require('../../model/middlewares.js');
	var fs = require('fs');

	var controller = {};

	controller.downloadFile = function (req, res) {

		var error = false;

		var filename = req.params.file;
		var fileType = req.params.type;
		var filePath = 'uploads/temp/' + filename + '.' + fileType;

		if (fs.existsSync(filePath)) {

			var stream = fs.createReadStream(filePath, { bufferSize: 64 * 1024 });

			/*
			var contentType = fileType;
			if (fileType == 'csv') {
				contentType = 'text/csv';
			}
			res.set('Content-Type', contentType);
			*/

			res.set('Content-Disposition', 'attachment; filename="' + filename + '.' + fileType + '"');

			stream.pipe(res);

			stream.on('error', function (err) {
				error = true;
			});

			stream.on('end', function () {
				if (!error) {
					fs.unlinkSync(filePath); // Delete the File
				}
				res.end();
			});

		} else {
			res.redirect('/404');
		}
	}

	controller.taskexportpost = function (req, res) {

		var response = {};
		response.status = 0;

		var data = {};
		data.collection = 'task';
		data.query = [
			{ "$match": { status: { $nin: [10, 0] } } },
			{ $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "category" } },
			{ $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
			{ $lookup: { from: "tasker", localField: "tasker", foreignField: "_id", as: "tasker" } },
			{ $unwind: { path: "$tasker", preserveNullAndEmptyArrays: true } },
			{ $lookup: { from: "users", localField: "user", foreignField: "_id", as: "user" } },
			{ $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
			{
				$project: {
					user: '$user.username',
					tasker: '$tasker.username',
					category: '$category.name',
					billing_address: 1,
					status: 1,
					amount: 1,
					task_date: 1,
					task_hour: 1,
					admin_commission_percentage: 1,
					payment_mode: 1,
					tasker_amount: 1
				}
			}
		];

		data.csv = [
			{ label: 'Date', value: 'createdAt' },
			{ label: 'User Name', value: 'user' },
			{ label: 'Tasker Name', value: 'tasker' },
			{ label: 'Category', value: 'category' },
			{ label: 'Country', value: 'billing_address.country' },
			{ label: 'State', value: 'billing_address.state' },
			{ label: 'City', value: 'billing_address.city' },
			{ label: 'Zipcode', value: 'billing_address.zipcode' },
			{ label: 'Amount', value: 'amount' },
			{ label: 'Admin Commission Percentage', value: 'admin_commission_percentage' },
			{ label: 'Payment Mode', value: 'payment_mode' },
			{ label: 'Admin Commission', value: 'tasker_amount.admin_commission' },
			{ label: 'Tasker Commission', value: 'tasker_amount.tasker_commission' }
		];

		middlewares.jsontocsv(data, function (err, data) {
			if (!err || data) {
				if (data.status == 1) {
					response.status = 1;
					response.message = data.message;
					res.send(response);
				} else {
					response.message = "No Data Found";
					res.send(response);
				}
			} else {
				response.message = "No Data Found";
				res.send(response);
			}
		});
	}



	controller.userexportpost = function (req, res) {

		var response = {};
		response.status = 0;

		var data = {};
		data.collection = 'users';
		data.query = [
			{ "$match": { status: req.body.status } },
			{
				$project: {
					username: 1,
					email: 1,
					gender: 1,
					phone: 1,
					name: 1,
					address: 1,
					status: 1,
					location: 1,
					createdAt: 1
				}
			}];
		data.csv = [
			{ label: 'Date', value: 'createdAt' },
			{ label: 'UserName', value: 'username' },
			{ label: 'First Name', value: 'name.first_name' },
			{ label: 'Last Name', value: 'name.last_name' },
			{ label: 'Email Id', value: 'email' },
			{ label: 'Gender', value: 'gender' },
			{ label: 'Phone Code', value: 'phone.code' },
			{ label: 'Phone Number', value: 'phone.number' },
			{ label: 'City', value: 'address.city' },
			{ label: 'State', value: 'address.state' },
			{ label: 'Zipcode', value: 'address.zipcode' },
			{ label: 'Country', value: 'address.country' }
		];

		middlewares.jsontocsv(data, function (err, data) {
			if (!err || data) {
				if (data.status == 1) {
					response.status = 1;
					response.message = data.message;
					res.send(response);
				} else {
					response.message = "No Data Found";
					res.send(response);
				}
			} else {
				response.message = "No Data Found";
				res.send(response);
			}
		});
	}


	controller.taskerexportpost = function (req, res) {

		var response = {};
		response.status = 0;

		var data = {};
		data.collection = 'tasker';
		data.query = [
			{ "$match": { status: req.body.status } },
			{
				$project: {
					username: 1,
					email: 1,
					gender: 1,
					phone: 1,
					name: 1,
					address: 1,
					status: 1,
					availability: 1,
					location: 1,
					birthdate: 1,
					createdAt: 1
				}
			}];
		data.csv = [
			{ label: 'Date', value: 'createdAt' },
			{ label: 'UserName', value: 'username' },
			{ label: 'First Name', value: 'name.first_name' },
			{ label: 'Last Name', value: 'name.last_name' },
			{ label: 'Email Id', value: 'email' },
			{ label: 'Gender', value: 'gender' },
			{ label: 'Phone Code', value: 'phone.code' },
			{ label: 'Phone Number', value: 'phone.number' },
			{ label: 'City', value: 'address.city' },
			{ label: 'State', value: 'address.state' },
			{ label: 'Zipcode', value: 'address.zipcode' },
			{ label: 'Country', value: 'address.country' },
			{ label: 'Tasker Availability', value: 'availability' }
		];

		middlewares.jsontocsv(data, function (err, data) {
			if (!err || data) {
				if (data.status == 1) {
					response.status = 1;
					response.message = data.message;
					res.send(response);
				} else {
					response.message = "No Data Found";
					res.send(response);
				}
			} else {
				response.message = "No Data Found";
				res.send(response);
			}
		});
	}

	controller.subscriberexportpost = function (req, res) {

		var response = {};
		response.status = 0;

		var data = {};
		data.collection = 'newsletter';
		data.query = [
			{ "$match": { status: 1 } },
			{
				$project: {
					email: 1,
					createdAt: 1
				}
			}];
		data.csv = [
			{ label: 'Date', value: 'createdAt' },
			{ label: 'Email Id', value: 'email' }
		];

		middlewares.jsontocsv(data, function (err, data) {
			if (!err || data) {
				if (data.status == 1) {
					response.status = 1;
					response.message = data.message;
					res.send(response);
				} else {
					response.message = "No Data Found";
					res.send(response);
				}
			} else {
				response.message = "No Data Found";
				res.send(response);
			}
		});
	}

	return controller;
}
