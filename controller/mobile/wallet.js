"use strict";

module.exports = function (io,i18n) {

	var async = require("async");
	var moment = require("moment");
	var stripe = require('stripe')('');
	var paypal = require('paypal-rest-sdk');
	var objectID = require('mongodb').ObjectID;
	var mail = require('../../model/mail.js');
	var mailcontent = require('../../model/mailcontent.js');
	var mongoose = require("mongoose");
	var push = require('../../model/pushNotification.js')(io);
	var db = require('../../model/mongodb.js');
	var CONFIG = require('../../config/config');
	var userLibrary = require('../../model/user.js')(io);
	var taskLibrary = require('../../model/task.js')(io);

	var controller = {};

	controller.settings = function (req, res) {
		var data = {};
		data.status = '0';
		db.GetOneDocument('settings', { "alias": "general" }, { 'settings.wallet': 1 }, {}, function (err, wallet) {
			if (err || !wallet.settings.wallet.amount.minimum || !wallet.settings.wallet.amount.maximum) {
				data.response = res.__('Wallet Money Settings are not Available, Please try Again Later.');
				res.send(data);
			} else {
				data.status = '1';
				data.wallter_money = { 'wallet_min_amount': wallet.settings.wallet.amount.minimum, 'wallet_max_amount': wallet.settings.wallet.amount.maximum };
				res.send(data);
			}
		});
	};

	controller.payform = function (req, res) {

		var data = {};
		data.status = '0';
		req.checkQuery('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
		req.checkQuery('total_amount', res.__('Total Amount is Required')).notEmpty();
		var errors = req.validationErrors();

		if (errors) { data.response = errors[0].msg; res.send(data); return; }

		req.sanitizeQuery('user_id').trim();
		req.sanitizeQuery('total_amount').trim();

		var request = {};
		request.user_id = req.query.user_id.replace(/^"(.*)"$/, '$1');
		request.total_amount = req.query.total_amount;

		async.waterfall([
			function (callback) {
				db.GetOneDocument('settings', { "alias": "general" }, { 'settings': 1 }, {}, function (err, settings) {
					callback(err, settings);
				});
			},
			function (settings, callback) {
				db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, user) {
					callback(err, settings, user);
				});
			},
			function (settings, user, callback) {
				var transaction = {
					'user': request.user_id,
					'type': 'wallet',
					'amount': request.total_amount,
					'status': 1
				};
				db.InsertDocument('transaction', transaction, function (err, transaction) {
					callback(err, settings, user, transaction);
				});
			}
		], function (err, settings, user, transaction) {
			if (err) {
				res.render('mobile/payment-failed', { image: settings.settings.site_url + 'app/mobile/images/failed.png' });
			} else {
						db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
						if (err || !currencies) {
							res.render('error', { base_url: settings.settings.site_url, title: '' });
						}
						else {
							var pug = {};
							pug.transaction = transaction;
							pug.site_url = settings.settings.site_url;
							pug.symbol = currencies.symbol;
							res.render('mobile/wallet-stripe-payment-card', pug);
						}
			});
		}

	});
}

	controller.stripeProcess = function (req, res) {
		var data = {};
		data.status = '0';

		req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
		req.checkBody('transaction_id', res.__('Transaction ID is Required')).optional();
		req.checkBody('stripeEmail', res.__('Stripe Email is Required')).optional();
		req.checkBody('stripeToken', res.__('Stripe Token is Required')).optional();
		req.checkBody('total_amount', res.__('Total Amount is Required')).notEmpty();

		req.checkBody('card_number', res.__('card_number ID is Required')).optional();
		req.checkBody('exp_month', res.__('exp_month  is Required')).optional();
		req.checkBody('exp_year', res.__('exp_year  is Required')).optional();
		req.checkBody('cvc_number', res.__('cvc_number  is Required')).optional();

		errors = req.validationErrors();
		var errors = req.validationErrors();
		if (errors) { data.response = errors[0].msg; res.send(data); return; }

		req.sanitizeBody('user_id').trim();
		//req.sanitizeBody('job_id').trim();
		req.sanitizeBody('transaction_id').trim();
		req.sanitizeBody('stripeEmail').trim();
		req.sanitizeBody('stripeToken').trim();
		req.sanitizeBody('total_amount').trim();
		req.sanitizeBody('card_number').trim();
		req.sanitizeBody('exp_month').trim();
		req.sanitizeBody('exp_year').trim();
		req.sanitizeBody('cvc_number').trim();

		db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'stripe' }, {}, {}, function (err, paymentgateway) {
			if (err || !paymentgateway.settings.secret_key) {
				res.status(400).send({ 'message': res.__('Invalid payment method, Please contact the website administrator') });
			} else {

				stripe.setApiKey(paymentgateway.settings.secret_key);
				var request = {};
				request.user_id = req.body.user_id.replace(/^"(.*)"$/, '$1');
				request.total_amount = req.body.total_amount;
				request.stripeEmail = req.body.stripeEmail;
				request.stripeToken = req.body.stripeToken;
				request.card = {};
				request.card.number = req.body.card_number;
				request.card.exp_month = req.body.exp_month;
				request.card.exp_year = req.body.exp_year;
				request.card.cvc = req.body.cvc_number;

				db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, user) {
					if (err || !user) {
						res.redirect("http://" + req.headers.host + '/mobile/mobile/failed');
					} else {
						db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
						if(err) {
							res.redirect("http://" + req.headers.host + '/mobile/mobile/failed');
						}
						else {
						request.stripeEmail = request.stripeEmail ? request.stripeEmail : user.email;
						async.waterfall([
							function (callback) {
								db.GetOneDocument('settings', { "alias": "general" }, { 'settings': 1 }, {}, function (err, settings) {
									callback(err, settings.settings);
								});
							},
							function (settings, callback) {
								if (!request.transaction_id) {
									var transaction = {
										'user': user._id,
										'type': 'wallet',
										'amount': request.total_amount,
										'status': 1
									};
									db.InsertDocument('transaction', transaction, function (err, transaction) {
										request.transaction_id = transaction._id;
										request.trans_id = transaction._id;
										request.trans_date = transaction.createdAt;
										request.avail_amount = transaction.amount;
										request.credit_type = transaction.type;
										callback(err, settings);
									});
								} else {
									callback(null, settings);
								}
							}, function (settings, callback) {
								if (!request.stripeToken) {
									stripe.tokens.create({ card: request.card }, function (err, token) {
										callback(err, settings, token);
									});
								} else {
									callback(null, settings, null);
								}
							},
							function (settings, token, callback) {
								var charge = {};
								charge.amount = request.total_amount * 100;
								charge.currency = currencies.code;
								charge.source = token.id;
								charge.description = 'Wallet Recharge';
								stripe.charges.create(charge, function (err, charges) {
									callback(err, settings, charges);
								});
							}
						], function (err, settings, charges) {
							if (err) {
								res.redirect("http://" + req.headers.host + '/mobile/mobile/failed');
							} else {

								userLibrary.walletRecharge({ 'user': request.user_id, 'transaction': request.transaction_id, 'gateway_response': charges }, function (err, response) {
									if (err || !response) {
										res.send(err);
									} else {
										res.redirect("http://" + req.headers.host + '/mobile/payment/pay-completed/bycard');
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

	controller.payCancel = function (req, res) {
		db.GetOneDocument('settings', { "alias": "general" }, { 'settings': 1 }, {}, function (err, settings) {
			res.render('mobile/payment-return', { site_url: settings.settings.site_url });
		});
	}

	controller.walletrechargefailed = function (req, res) {
		db.GetOneDocument('settings', { "alias": "general" }, { 'settings': 1 }, {}, function (err, settings) {
			res.render('mobile/payment-failed', { image: settings.settings.site_url + 'app/mobile/images/failed.png' });
		});
	}

	controller.settings = function (req, res) {
		db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
			if (err || !currencies) {
				res.send({
					"status": 0,
					"message": res.__('Error')
				});
			}
			else {
				db.GetOneDocument('settings', { "alias": "general" }, { 'settings': 1 }, {}, function (err, settings) {
					if (err || !settings.settings.wallet) {
						res.send({
							'status': '0',
							'message': res.__('wallet money settings are not available, Please try again later.'),
							'response': res.__('wallet money settings are not available, Please try again later.')
						});
					} else {
						if (settings.settings.wallet.amount.minimum && settings.settings.wallet.amount.maximum) {
							res.send({
								'status': '1',
								'wallter_money': {
									'wallet_min_amount': (settings.settings.wallet.amount.minimum * currencies.value).toFixed(2),
									'wallet_max_amount': (settings.settings.wallet.amount.maximum * currencies.value).toFixed(2)
								}
							});
						} else {
							res.send({
								'status': '0',
								'message': res.__('wallet money settings are not available, Please try again later.'),
								'response': res.__('wallet money settings are not available, Please try again later.')
							});
						}
					}
				});
			}
		});
	}

	controller.mobpaypalPayment = function mobpaypalPayment(req, res) {

		var data = {};
		data.status = '1';
		req.checkBody('user', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
		req.checkBody('task', res.__('Task ID is Required')).notEmpty();
		errors = req.validationErrors();
		var errors = req.validationErrors();
		if (errors) { data.response = errors[0].msg; res.send(data); return; }

		var request = {};
		request.task = req.body.task;
		request.user = req.body.user;


		req.sanitizeBody('user').trim();
		req.sanitizeBody('task').trim();


		db.GetOneDocument('users', { '_id': request.user }, {}, {}, function (err, user) {
			if (err || !user) {
				res.send({
					"status": "0",
					"message": res.__("Invalid " + CONFIG.USER + " ID, Please try Again Later.!")
				});
			}
			else {
				var options = {};
				options.populate = 'user category tasker';
				db.GetOneDocument('task', { '_id': request.task, 'status': 6 }, {}, options, function (err, task) {
					if (err || !task) {
						res.send({
							"status": "0",
							"message": res.__("Invalid task ID, Please try Again Later.!")
						});
					} else {
						async.waterfall([
							function (callback) {
								db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'paypal' }, {}, {}, function (err, paymentgateway) {
									if (err || !paymentgateway) {
										res.send({
											"status": "0",
											"message": res.__("Error, Please try Again Later.!")
										});
									} else {
										callback(err, paymentgateway);
									}

								});
							},
							function (paymentgateway, callback) {
								var transaction = {};
								transaction.user = task.user;
								transaction.tasker = task.tasker;
								transaction.task = request.task;
								transaction.type = 'paypal';
								if (transaction.amount = task.invoice.amount.balance_amount) {
									transaction.amount = task.invoice.amount.balance_amount;
								} else {
									transaction.amount = task.invoice.amount.grand_total;
								}
								transaction.amount = task.invoice.amount.balance_amount;
								transaction.task_date = task.createdAt;
								transaction.status = 1
								db.InsertDocument('transaction', transaction, function (err, transaction) {
									request.transaction_id = transaction._id;
									request.trans_date = transaction.createdAt;
									request.avail_amount = transaction.amount;
									request.credit_type = transaction.type;
									callback(err, paymentgateway, transaction);
								});
							},
							function (paymentgateway, transaction, callback) {
								db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
									if (err || !settings) {
										res.send({
											"status": "0",
											"message": res.__("Configure your website settings.!")
										});
									}
									else { callback(err, paymentgateway, transaction, settings.settings); }
								});
							},
							function (paymentgateway, transaction, settings, callback) {
								db.GetOneDocument('emailtemplate', { name: { $in: ['PaymentDetailstoAdmin', 'PaymentDetailstoTasker', 'PaymentDetailstoUser'] }, 'status': { $eq: 1 } }, {}, {}, function (err, template) {
									if (err || !template) {
										res.send({
											"status": "0",
											"message": res.__("Unable to get email template.!")
										});
									}
									else { callback(err, paymentgateway, transaction, settings, template); }
								});
							}
						], function (err, paymentgateway, transaction, settings, template) {
							if (err) {
								res.send({
									"status": "0",
									"message": res.__("Error, Please try Again Later.!")
								});
							} else {
								db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
									if (err || !currencies) {
										res.send({
											"status": "0",
											"response": res.__('Data Not available')
										});
									}
									else {
										paypal.configure({
											'mode': paymentgateway.settings.mode,
											'client_id': paymentgateway.settings.client_id,
											'client_secret': paymentgateway.settings.client_secret
										});

										var json = {
											"intent": "sale",
											"payer": {
												"payment_method": "paypal"
											},
											"redirect_urls": {},
											"transactions": [{
												"item_list": {
													"items": []
												},
												"amount": {
													"currency": currencies.code,
													"details": {}
												},
												"description": "This is the payment description."
											}]
										};
										var item = {};
										item.name = settings.site_title;
										item.price = task.invoice.amount.balance_amount;
										item.currency = currencies.code;
										item.quantity = 1;
										json.transactions[0].item_list.items.push(item);

										json.transactions[0].amount.details.subtotal = task.invoice.amount.balance_amount;
										json.transactions[0].amount.details.tax = 0.00;
										json.transactions[0].amount.total = task.invoice.amount.balance_amount;
										json.transactions[0].amount.currency = currencies.code;

										json.redirect_urls.return_url = "http://" + req.headers.host + "/mobile/app/payment/paypal-execute?task=" + task._id + "&transaction=" + transaction._id;
										json.redirect_urls.cancel_url = "http://" + req.headers.host + "/checkout/payment/paypal/cancel?task=" + task._id + "&transaction=" + transaction._id;

										paypal.payment.create(json, function (error, payment) {
											if (error) {
												res.send({
													"status": "0",
													"message": res.__("Unable to get email template.!")
												});
											} else {
												for (var i = 0; i < payment.links.length; i++) {
													var link = payment.links[i];
													if (link.method === 'REDIRECT') {
														data.redirectUrl = link.href;
													}
												}
												data.payment_mode = 'paypal';
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

	controller.mobpaypalExecute = function mobpaypalPayment(req, res) {

		var data = {};
		data.status = '1';

		var request = {};
		request.task = req.query.task;
		request.transaction = req.query.transaction;
		request.paymentId = req.query.paymentId;
		request.token = req.query.token;
		request.PayerID = req.query.PayerID;

		var options = {};
		options.populate = 'tasker user task';
		db.GetOneDocument('transaction', { _id: request.transaction }, {}, options, function (err, transaction) {

			if (err || !transaction) {
				res.send({
					"status": "0",
					"message": res.__("Error, Please try Again Later.!")
				});
			} else {
				async.waterfall([
					function (callback) {
						db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'paypal' }, {}, {}, function (err, paymentgateway) {
							if (err || !paymentgateway) {
								res.send({
									"status": "0",
									"message": res.__("Configure your website settings.!")
								});
							}
							else {
								callback(err, paymentgateway);
							}
						});
					},
					function (paymentgateway, callback) {
						db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
							if (err || !settings) {
								res.send({
									"status": "0",
									"message": res.__("Configure your website settings.!")
								});
							}
							else { callback(err, paymentgateway, settings.settings); }
						});
					},
					function (paymentgateway, settings, callback) {
						db.GetDocument('emailtemplate', { name: { $in: ['PaymentDetailstoAdmin', 'PaymentDetailstoTasker', 'PaymentDetailstoUser'] }, 'status': { $ne: 0 } }, {}, {}, function (err, template) {
							if (err || !template) {
								res.send({
									"status": "0",
									"message": res.__("Unable to get email template.!")
								});
							}
							else { callback(err, paymentgateway, settings, template); }
						});
					},
					 function (paymentgateway, settings, template, callback) {
                    db.GetOneDocument('task', { '_id': request.task }, {}, {}, function (err, task) {
						
                        if (err || !task) {
                            data.response = res.__('task is completed'); res.send(data);
                        }
                       else { callback(err, paymentgateway, settings, template, task); }
                    });
                },
				], function (err, paymentgateway, settings, template, task) {
					if (err) {
						res.send({
							"status": "0",
							"message": res.__("Configure your website settings.!")
						});
					} else {
						paypal.configure({
							'mode': paymentgateway.settings.mode,
							'client_id': paymentgateway.settings.client_id,
							'client_secret': paymentgateway.settings.client_secret
						});

						paypal.payment.execute(request.paymentId, { "payer_id": request.PayerID }, function (err, result) {
							if (err) {
								res.redirect("http://" + req.headers.host + '/mobile/mobile/failed');
							} else {
								//if (result.transactions[0].related_resources[0].sale.state != 'completed') {
								if (result.state != 'approved') {
									data.response = 'Transaction Failed';
									res.redirect("mobile/payment-failed");
								} else {

									taskLibrary.taskPayment({ 'transaction': transaction._id, 'gateway_response': result ,'task': task}, function (err, response) {
										if (err || !response) {
											res.redirect("mobile/payment-failed");
										} else {
											res.redirect("http://" + req.headers.host + '/mobile/mobile/paypalsucess');
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
	controller.applyCoupontest = function (req, res) {

		var status = '0';
		var response = {};
		req.checkBody('user_id', CONFIG.USER + ' ID is Required').notEmpty();
		req.checkBody('code', 'Coupon code is Required').notEmpty();
		req.checkBody('booking_id', 'Booking_id is Required').notEmpty();

		var data = {};
		data.user_id = req.body.user_id;
		data.code = req.body.code;
		data.reach_date = req.body.pickup_date;
		data.booking = req.body.booking_id;

		var errors = [];
		errors = req.validationErrors();
		if (errors) {
			res.send({
				"status": "0",
				"response": errors[0].msg
			});
			return;
		}

		var request = {};
		var date = new Date();
		var isodate = date.toISOString();//new Date("2016-08-30T18:30:00.0Z");;
		request.task = req.body.taskid;
		db.GetDocument('coupon', { status: { $ne: 0 }, code: req.body.code }, {}, {}, function (err, coupondata) {
			if (err || coupondata.length == 0) {
				res.send({ "status": "0", "response": "Invalid Coupon" });
			}
			else {
				db.GetDocument('coupon', { status: { $ne: 0 }, code: req.body.code, "expiry_date": { "$gte": isodate }, "valid_from": { "$lte": isodate } }, {}, {}, function (err, data) {
					if (err || data.length == 0) {
						res.send({ "status": "0", "response": "Coupon Code Date Expired" });
					}
					else {
						db.GetAggregation('task', [
							{ $match: { 'invoice.coupon': req.body.code } },
							{ $group: { _id: "$invoice.coupon", total: { $sum: 1 } } },
						], function (err, taskdata) {

							if (err || !taskdata) {
								res.send({ "status": "0", "response": "Coupon Code Date Expired" });
							} else {
								db.GetDocument('coupon', { status: { $ne: 0 }, code: req.body.code }, {}, {}, function (err, couponlimit) {
									if (err || couponlimit.length == 0) {
										res.send({ "status": "0", "response": "Coupon Code Limit Exceed" });
									} else {
										db.GetAggregation('task', [
											{ $match: { user: new mongoose.Types.ObjectId(req.body.user_id), 'status': 7, 'invoice.status': 1, 'invoice.coupon': req.body.code } },
											{ $group: { _id: "$user", total: { $sum: 1 } } },
										], function (err, usagedata) {
											if (err || !usagedata) {
												res.send({ "status": "0", "response": "Coupon Code Limit Exceed" });
											} else {
												var usage = 0;
												if (usagedata[0]) {
													if (usagedata[0].total) {
														usage = usagedata[0].total;
													}
												}
												db.GetDocument('coupon', { status: { $ne: 0 }, code: req.body.code, 'usage.per_user': { '$gte': usage }, 'usage.total_coupons': { '$gte': 1 } }, {}, {}, function (err, usagelimit) {
													if (err || !usagelimit || usagelimit.length == 0) {
														res.send({ "status": "0", "response": "Coupon Code Limit Exceed" });
													} else {
														db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
															if (err || !currencies) {
																res.send({
																	"status": 0,
																	"message": 'Error'
																});
															}
															else {
																db.GetDocument('task', { 'booking_id': req.body.booking_id ,'invoice.coupon':{$exists: false} }, {}, {}, function (err, taskdata) {
																	if (err || !taskdata || taskdata.length == 0) {
																	res.send({ "status": "0", "response": "Coupons is Already Applied"});
																	}
																	else {
																		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                                                     if(err || !settings){
                                                                        res.send({ "status": "0", "response": "No settings Found" });
                                                                     }
																	 else {
																		var invoice = {};
																		invoice.amount = {};
																		var discount = 0.00;
																		if (couponlimit[0].discount_type == 'Percentage') {
																		if(taskdata[0].invoice.amount.extra_amount && taskdata[0].invoice.amount.extra_amount != ''){
																		var temporaryprice =  parseInt(taskdata[0].invoice.amount.total) + parseInt(taskdata[0].invoice.amount.extra_amount);
																		discount = (temporaryprice * couponlimit[0].amount_percentage) / 100;
																		}
																		else{
																		var temporaryprice =  parseInt(taskdata[0].invoice.amount.total);
																		discount = (temporaryprice * couponlimit[0].amount_percentage) / 100;
																		}
																		}
																		else {

																		if(taskdata[0].invoice.amount.extra_amount && taskdata[0].invoice.amount.extra_amount != ''){
																		var temporaryprice =  parseInt(taskdata[0].invoice.amount.total) + parseInt(taskdata[0].invoice.amount.extra_amount);
																		discount = parseInt(couponlimit[0].amount_percentage);
																		}
																		else{
																		var temporaryprice =  parseInt(taskdata[0].invoice.amount.total);
																		discount = parseInt(couponlimit[0].amount_percentage);
																		}
																		}

																		if (discount >= taskdata[0].invoice.amount.grand_total) {
																			discount = taskdata[0].invoice.amount.grand_total;
																		}

																		var temporaryamount = temporaryprice - discount;
																		var servicetax = (parseInt(settings.settings.service_tax) / 100) * temporaryamount;
																		// var grand_total = temporaryamount + servicetax;
																		var balance_amount = temporaryamount + servicetax;

																		if(taskdata[0].invoice.amount.extra_amount && taskdata[0].invoice.amount.extra_amount != ''){
																		var temporaryamount = temporaryprice - discount;
																		var servicetax = (parseInt(settings.settings.service_tax) / 100) * temporaryamount;
																		var balance_amount = temporaryamount + servicetax;
																		// var balance_amount = ((parseInt(taskdata[0].invoice.amount.total) - discount) + servicetax);
																		}



																	/* 	if (grand_total <= 0) {
																			grand_total = 0;
																		} */

																		if (balance_amount <= 0) {
																			balance_amount = 0;
																		}

																		console.log("====== servicetax =======", servicetax);
																		var update = { 'invoice.amount.coupon': discount, 'invoice.coupon': req.body.code, 'invoice.amount.discount': discount, 'invoice.amount.balance_amount': balance_amount};

																		db.UpdateDocument('task', { _id: new mongoose.Types.ObjectId(taskdata[0]._id) }, update, function (err, result) {
																			if (err || result.nModified == 0) {
																				res.send({ "status": "0", "response": "Error In Coupon updation" });
																			}
																			else {
																				var usagelimits = couponlimit[0].usage.total_coupons;
																				var result = usagelimits - 1;
																				if (result <= 0) {
																					result = 0;
																				}
																				db.UpdateDocument('coupon', { status: { $ne: 0 }, code: req.body.code }, { 'usage.total_coupons': result }, function (err, result) {
																					if (err || result.nModified == 0) {
																						res.send({ "status": "0", "response": "Error In Coupon updation" });
																					}
																					else {

																						res.send({ "status": "1", "response": "Coupon used successfully", "discount": (discount * currencies.value).toFixed(2) });
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
					}
				});
			}
		});
	}

	controller.updatewalletdatapaypal = function updatewalletdatapaypal(req, res) {

		var data = {};
		data.status = '1';

		req.checkBody('user_id', res.__(CONFIG.USER + ' ID is Required')).notEmpty();
		req.checkBody('total_amount', res.__('Total Amount is Required')).notEmpty();

		var errors = req.validationErrors();
		if (errors) { data.response = errors[0].msg; res.send(data); return; }

		req.sanitizeQuery('user_id').trim();
		req.sanitizeQuery('total_amount').trim();

		var request = {};
		request.user = req.body.user_id;
		request.amount = req.body.total_amount;

		db.GetOneDocument('users', { '_id': request.user }, {}, {}, function (err, user) {
			if (err || !user) {
				res.send({
					"status": "0",
					"message": res.__("Invalid " + CONFIG.USER + " ID, Please try Again Later.!")
				});
			} else {
				db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
				if(err){
					res.send({
						"status": "0",
						"message": res.__("Invalid " + CONFIG.USER + " ID, Please try Again Later.!")
					});
				}
				else {
				async.waterfall([
					function (callback) {
						db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'paypal' }, {}, {}, function (err, paymentgateway) {
							callback(err, paymentgateway);
						});
					},
					function (paymentgateway, callback) {
						var transaction = {
							'user': request.user_id,
							'type': 'wallet',
							'amount': request.amount,
							'status': 1
						};
						db.InsertDocument('transaction', transaction, function (err, transaction) {
							request.transaction_id = transaction._id;
							request.trans_id = transaction._id;
							request.trans_date = transaction.createdAt;
							request.avail_amount = transaction.amount;
							request.credit_type = transaction.type;
							callback(err, paymentgateway, transaction);
						});
					},
					function (paymentgateway, transaction, callback) {
						db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
							if (err || !settings) { data.response = res.__('Configure your website settings'); res.send(data); }
							else { callback(err, paymentgateway, transaction, settings.settings); }
						});
					},
					function (paymentgateway, transaction, settings, callback) {
						db.GetDocument('emailtemplate', { name: { $in: ['PaymentDetailstoAdmin', 'PaymentDetailstoTasker', 'PaymentDetailstoUser'] }, 'status': { $ne: 0 } }, {}, {}, function (err, template) {
							if (err || !template) { data.response = res.__('Unable to get email template'); res.send(data); }
							else { callback(err, paymentgateway, transaction, settings, template); }
						});
					}
				], function (err, paymentgateway, transaction, settings, template) {
					if (err) {
						res.send({
							"status": "0",
							"message": res.__("Invalid Error, Please try Again Later.!")
						});
					} else {
						paypal.configure({
							'mode': paymentgateway.settings.mode,
							'client_id': paymentgateway.settings.client_id,
							'client_secret': paymentgateway.settings.client_secret
						});

						var json = {
							"intent": "sale",
							"payer": {
								"payment_method": "paypal"
							},
							"redirect_urls": {},
							"transactions": [{
								"item_list": {
									"items": []
								},
								"amount": {
									"currency": currencies.code,
									"details": {}
								},
								"description": "This is the payment description."
							}]
						};
						
						var item = {};
						item.name = settings.site_title;
						item.price = request.amount;
						item.currency = currencies.code;
						item.quantity = 1;
						json.transactions[0].item_list.items.push(item);
						json.transactions[0].amount.total = request.amount;
						json.transactions[0].amount.currency = currencies.code;
						json.redirect_urls.return_url = "http://" + req.headers.host + "/mobile/app/wallet-recharge/mob-execute?user=" + request.user + "&transaction=" + transaction._id;
						json.redirect_urls.cancel_url = "http://" + req.headers.host + "/checkout/payment/paypal/cancel?user=" + request.user + "&transaction=" + transaction._id;
						paypal.payment.create(json, function (error, payment) {							
							if (error) {
								res.send({
									"status": "0",
									"message": error.response.message
								});

							} else {
								for (var i = 0; i < payment.links.length; i++) {
									var link = payment.links[i];
									if (link.method === 'REDIRECT') {
										data.redirectUrl = link.href;
									}
								}
								data.payment_mode = 'paypal';
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

	controller.walletpaypalExecute = function updatewalletdatapaypal(req, res) {

		var data = {};
		data.status = '1';
		var request = {};
		request.transaction = req.query.transaction;
		request.paymentId = req.query.paymentId;
		request.token = req.query.token;
		request.PayerID = req.query.PayerID;
		request.user = req.query.user;

		db.GetOneDocument('transaction', { _id: request.transaction }, {}, {}, function (err, transaction) {
			if (err) {
				res.send({
					"status": "0",
					"message": res.__("Invalid Error, Please try Again Later.!!")
				});
			} else {
				async.waterfall([
					function (callback) {
						db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'paypal' }, {}, {}, function (err, paymentgateway) {
							callback(err, paymentgateway);
						});
					},
					function (paymentgateway, callback) {
						db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
							if (err || !settings) { data.response = res.__('Configure your website settings'); res.send(data); }
							else { callback(err, paymentgateway, settings.settings); }
						});
					},
					function (paymentgateway, settings, callback) {
						db.GetDocument('emailtemplate', { name: { $in: ['PaymentDetailstoAdmin', 'PaymentDetailstoTasker', 'PaymentDetailstoUser'] }, 'status': { $ne: 0 } }, {}, {}, function (err, template) {
							if (err || !template) { data.response = res.__('Unable to get email template'); res.send(data); }
							else { callback(err, paymentgateway, settings, template); }
						});
					}
				], function (err, paymentgateway, settings, template) {
					if (err) {
						res.send({
							"status": "0",
							"message": res.__("Invalid Error, Please try Again Later.!!")
						});
					} else {
						paypal.configure({
							'mode': 'sandbox',
							'client_id': paymentgateway.settings.client_id,
							'client_secret': paymentgateway.settings.client_secret
						});

						paypal.payment.execute(request.paymentId, { "payer_id": request.PayerID }, function (err, result) {
							if (err) {
								res.redirect("http://" + req.headers.host + '/mobile/mobile/failed');
							} else {
								//if (result.transactions[0].related_resources[0].sale.state != 'completed') {
								if (result.state != 'approved') {
									data.response = 'Transaction Failed';
									res.redirect("mobile/payment-failed");
								} else {
									userLibrary.walletRecharge({ 'user': request.user, 'transaction': transaction._id, 'gateway_response': result }, function (err, response) {
										if (err || !response) {
											res.redirect("http://" + req.headers.host + '/mobile/mobile/failed');
										} else {
											res.redirect("http://" + req.headers.host + '/mobile/mobile/paypalsucess');
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


	return controller;
};
