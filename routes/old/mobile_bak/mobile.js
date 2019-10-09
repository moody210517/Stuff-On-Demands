"use strict";

var jwt = require('jsonwebtoken');
var middlewares = require('../model/middlewares.js');
var CONFIG = require('../config/config');
var db = require('../model/mongodb.js');

/*function ensureAuthorized(req, res, next) {
    var token = req.headers.authtoken;
    if (token) {
        jwt.verify(token, CONFIG.SECRET_KEY, function (err, decoded) {
            if (err) {
                res.send('Unauthorized Access');
            } else {
                next();
            }
        });
    } else {
        res.send('Unauthorized Access');
    }
}*/

function ensureAuthorized(req, res, next) {
/*Section call*/
    var token = req.headers.authtoken;
    var user = req.headers.user;
    var type = req.headers.type;
    var device = req.headers.device;
    var devicetype = req.headers.devicetype;
    var data = {};
    data.status = '2';
    data.response = 'Unauthorized Access';
    var icondition = {};
    if (req.headers.devicetype == 'ios') {
        icondition = { 'status': { $ne: 0 }, '_id': req.headers.user, 'device_info.device_token': req.headers.device, 'device_info.device_type': 'ios' };
    } else if (req.headers.devicetype == 'android') {
        icondition = { 'status': { $ne: 0 }, '_id': req.headers.user, 'device_info.gcm': req.headers.device, 'device_info.device_type': 'android' };
    }
    var collection = '';
    if (req.headers.type == 'user') {
        collection = 'users'
    } else if (req.headers.type == 'tasker') {
        collection = 'tasker'
    }

    db.GetOneDocument(collection, icondition, {}, {}, function (taskerErr, taskerRespo) {
        if (taskerErr || !taskerRespo) { res.send(data); }
        else { next(); }
    });
    /*Section End*/
    //next();
}
module.exports = function (app, io, i18n) {

    try {
        var mobile_user = require('../controller/mobile/user.js')(io, i18n);
        var mobile_provider = require('../controller/mobile/provider.js')(io, i18n);
        var mobile_wallet = require('../controller/mobile/wallet.js')(io, i18n);
        var payment = require('../controller/mobile/payment.js')(io, i18n);
        var mobile = require('../controller/mobile/mobile.js')(io, i18n);

        app.post('/mobile/app/check-user', mobile_user.checkUser);
        app.post('/mobile/app/login', mobile_user.login);
        app.post('/mobile/app/register', mobile_user.register);
        app.post('/mobile/app/user/change-name', ensureAuthorized, mobile_user.changeName);
        app.post('/mobile/app/user/change-mobile', ensureAuthorized, mobile_user.changeMobile);
        app.post('/mobile/app/user/change-password', ensureAuthorized, mobile_user.changePassword);
        app.post('/mobile/app/user/reset-password', mobile_user.resetPassword);
        app.post('/mobile/app/user/update-reset-password', mobile_user.updateResetPassword);

        app.post('/mobile/app/user/set-emergency-contact', ensureAuthorized, mobile_user.setEmergencyContact);
        app.post('/mobile/app/user/view-emergency-contact', ensureAuthorized, mobile_user.viewEmergencyContact);
        app.post('/mobile/app/user/delete-emergency-contact', ensureAuthorized, mobile_user.deleteEmergencyContact);
        app.post('/mobile/app/user/alert-emergency-contact', ensureAuthorized, mobile_user.alertemergencycontact);
        app.post('/mobile/app/mobile/social-login', mobile_user.fbLogin);
        app.post('/mobile/app/mobile/social-register', mobile_user.fbRegister);
        app.post('/mobile/app/mobile/social-fbcheckUser', mobile_user.fbcheckUser);
        app.post('/mobile/app/mobile/appinfo', mobile_user.appInfo);
        app.get('/mobile/app/mobile/aboutus', mobile_user.aboutUs);
        app.get('/mobile/app/mobile/termsandconditions', ensureAuthorized, mobile_user.termsandconditions);
        app.get('/mobile/app/mobile/privacypolicy', ensureAuthorized, mobile_user.privacypolicy);
        app.post('/mobile/app/user/job-more-info', ensureAuthorized, mobile_user.jobMoreInfouser);
        app.post('/mobile/app/book-job', ensureAuthorized, mobile_user.bookJob);
        app.post('/mobile/app/mapbook-job', mobile_user.mapbookJob);
        app.post('/mobile/app/search-job', ensureAuthorized, mobile_user.searchJob);
        app.post('/mobile/app/user-booking', ensureAuthorized, mobile_user.userBooking);
        app.post('/mobile/app/mapuser-booking', ensureAuthorized, mobile_user.mapuserBooking);
        app.post('/mobile/app/categories', mobile_user.categories);
        app.post('/mobile/app/categories/details', ensureAuthorized, mobile_user.categories);
        app.post('/mobile/app/getmessage', ensureAuthorized, mobile_user.getmessage);
        app.post('/mobile/app/forgot-password', mobile_user.forgotPassword);
        app.post('/mobile/app/insert-address', ensureAuthorized, mobile_user.insertAddress);
        app.post('/mobile/map/insert-address', ensureAuthorized, mobile_user.mapinsertAddress);
        app.post('/mobile/app/list_address', ensureAuthorized, mobile_user.listAddress);
        app.post('/mobile/app/list_addressforandroid', ensureAuthorized, mobile_user.listAddressforandroid);
        app.post('/mobile/app/delete_address', ensureAuthorized, mobile_user.deleteAddress);
        app.post('/mobile/app/get-money-page', ensureAuthorized, mobile_user.getMoneyPage);
        app.post('/mobile/app/get-trans-list', ensureAuthorized, mobile_user.getTransList);
        app.post('/mobile/app/set-user-location', ensureAuthorized, mobile_user.setUserLocation);
        app.post('/mobile/get-rattings-options', ensureAuthorized, mobile_user.getRattingsOptions);
        app.post('/mobile/app/user-profile-pic', middlewares.commonUpload('uploads/images/users/').single('file'), ensureAuthorized, mobile_user.userProfilePic);
        app.post('/mobile/app/getuserprofile', mobile_user.getuserprofile);
        app.post('/mobile/app/apiKeys', ensureAuthorized, mobile_user.apiKeys);
        app.get('/mobile/app/get-location', ensureAuthorized, mobile_user.getLocation);
        app.post('/mobile/app/get-invites', ensureAuthorized, mobile_user.getInvites);
        app.post('/mobile/app/get-earnings',ensureAuthorized,  mobile_user.getEarnings);
        app.post('/mobile/app/set-user-geo', ensureAuthorized, mobile_user.setUserGeo);
        app.post('/mobile/app/category-search',ensureAuthorized,  mobile_user.category_search);
        app.post('/mobile/app/my-jobs', ensureAuthorized, mobile_user.myJobsNew);
        app.post('/mobile/app/my-jobs-new', ensureAuthorized, mobile_user.myJobsNew);
        app.post('/mobile/app/delete-job',ensureAuthorized,  mobile_user.deleteJob);
        app.post('/mobile/app/cancellation-reason', ensureAuthorized, mobile_user.cancellationReason);
        app.post('/mobile/app/cancellation', ensureAuthorized, mobile_user.cancellation);
        app.post('/mobile/app/cancel-job', ensureAuthorized, mobile_user.cancelJob);
        app.post('/mobile/app/social-check', mobile_user.socialCheck);
        app.post('/mobile/app/payment/by-cash', payment.byCash);
        app.post('/mobile/app/payment/by-wallet', ensureAuthorized, payment.byWallet);
        app.post('/mobile/app/payment/by-newwallet', ensureAuthorized, payment.byWallet);
        app.post('/mobile/app/payment/stripe-payment-process',  payment.stripePaymentProcess);
        app.post('/mobile/app/payment/by-gateway', payment.byGateway);
        app.post('/mobile/app/payment-list', ensureAuthorized, mobile_user.paymentListhistory);
        app.post('/mobile/app/paymentlist/history',ensureAuthorized,  mobile_user.paymentListhistory);
        app.post('/mobile/app/settings-mail',ensureAuthorized,  mobile_provider.settingsMail);
        app.post('/mobile/user/view-job', ensureAuthorized, mobile_user.viewJob);
        app.post('/mobile/user/job-timeline', ensureAuthorized, mobile_user.jobTimeline);
        app.post('/mobile/user/provider-profile', ensureAuthorized, mobile_user.providerProfile);
        app.post('/mobile/user/get-category-info', ensureAuthorized, mobile_user.getCategoryInfo);
        app.post('/mobile/user/notification_mode', mobile_user.notificationMode);
        app.post('/mobile/user/get-provider-profile', ensureAuthorized, mobile_user.providerProfile);
        app.post('/mobile/user/recentuser-list', ensureAuthorized, mobile_user.recentuserBooking);
        app.post('/mobile/app/user-transaction', ensureAuthorized, mobile_user.userTransaction);
        app.post('/mobile/app/userjob-transaction', ensureAuthorized, mobile_user.userjobTransaction);
        app.post('/mobile/app/provider-transaction', ensureAuthorized, mobile_provider.providerTransaction);
        app.post('/mobile/app/providerjob-transaction', ensureAuthorized, mobile_provider.providerjobTransaction);
        app.post('/mobile/app/get-reviews', ensureAuthorized, mobile_provider.getReviewsby);
        app.post('/mobile/app/detail-reviews', ensureAuthorized, mobile_provider.getdetailReviews);
        app.post('/mobile/app/notification', ensureAuthorized, mobile_provider.getNotification);
        app.post('/mobile/app/detailnotification', ensureAuthorized, mobile_provider.detailNotification);

        //--Payment--
        app.post('/mobile/verifyemergency', ensureAuthorized, mobile_user.verifyEmergency);
        app.post('/mobile/mailverification', ensureAuthorized, mobile_user.mailVerification);
        app.post('/mobile/submit-rattings', ensureAuthorized, middlewares.commonUpload('uploads/images/users/').single('file'), mobile_user.submitRattings);

        //--mobile--
        app.get('/mobile/mobile/failed', mobile.mfailed);
        app.get('/mobile/mobile/sucess', mobile.msucess);
        app.get('/mobile/mobile/paypalsucess', mobile.paypalsucess);
        app.post('/mobile/app/payment/zero', payment.byZero);
        app.get('/mobile/payment/pay-completed', mobile.paymentsuccess);
        app.get('/mobile/payment/pay-completed/bycard', mobile.cardpaymentsuccess);
        app.get('/mobile/payment/pay-failed', mobile.paymentfailed);
        app.post('/mobile/mobile/userPaymentCard', mobile.userPaymentCard);
        app.get('/mobile/mobile/stripe-manual-payment-form', mobile.manualPaymentForm);
        app.post('/mobile/mobile/payment/:msg', mobile.paymentMsg);
        app.post('/mobile/chat/chathistory', ensureAuthorized, mobile.chathistory);
        app.post('/mobile/chat/unreadmsg', mobile.unreadmsg);
        app.post('/mobile/app/apply-coupon', ensureAuthorized, payment.applyCoupon);

        //--UserBase--
        app.get('/mobile/mobile/proceed-payment', mobile.proceedPayment);
        app.post('/mobile/mobile/failed', mobile.failed);
        app.post('/mobile/mobile/wallet-recharge/settings',  mobile_wallet.settings);
        app.get('/mobile/mobile/wallet-recharge/payform',  mobile_wallet.payform);
        app.get('/mobile/mobile/wallet-recharge/pay-cancel',  mobile_wallet.payCancel);
        app.get('/mobile/mobile/wallet-recharge/failed',  mobile_wallet.walletrechargefailed);
        app.post('/mobile/mobile/wallet-recharge/stripe-process',  mobile_wallet.stripeProcess);

        app.post('/mobile/app/payment/paypalPayment',  mobile_wallet.mobpaypalPayment);
        app.get('/mobile/app/payment/paypal-execute',  mobile_wallet.mobpaypalExecute);

        app.post('/mobile/app/wallet-recharge/mobpaypal',  mobile_wallet.updatewalletdatapaypal);
        app.get('/mobile/app/wallet-recharge/mob-execute',  mobile_wallet.walletpaypalExecute);

        app.post('/mobile/app/payment/couponmob', ensureAuthorized, mobile_wallet.applyCoupontest);
        app.post('/mobile/app/emergencyverification', ensureAuthorized, mobile_user.emergencyVerification);
        app.post('/mobile/app/facebooklogin', ensureAuthorized, mobile_user.facebookLogin);
        app.post('/mobile/app/user/logout', ensureAuthorized, mobile_user.logout);
        app.post('/mobile/app/user/details', ensureAuthorized, mobile_user.userDetails);

        /** Tasker App**/
        app.post('/mobile/provider/login', mobile_provider.login);
        app.post('/mobile/app/provider/logout', mobile_provider.logout);
        app.post('/mobile/provider/update-provider-geo', mobile_provider.updateGeocode);
        app.post('/mobile/provider/get-banking-info', ensureAuthorized, mobile_provider.getBankingInfo);
        app.post('/mobile/provider/save-banking-info', ensureAuthorized, mobile_provider.savebankingInfo);
        app.post('/mobile/provider/update-provider-mode', ensureAuthorized, mobile_provider.updateProviderModeo);
        app.post('/mobile/provider/provider-info', mobile_provider.providerInfo);
        app.post('/mobile/provider/get-edit-info', ensureAuthorized, mobile_provider.getEditInfo);
        app.post('/mobile/provider/update_bio', ensureAuthorized, mobile_provider.updateBio);
        app.post('/mobile/provider/update_email', ensureAuthorized, mobile_provider.updateEmail);
        app.post('/mobile/provider/update_mobile', ensureAuthorized, mobile_provider.updateMobile);
        app.post('/mobile/provider/update_address', ensureAuthorized, mobile_provider.updateAddress);
        app.post('/mobile/provider/update_radius', ensureAuthorized, mobile_provider.updateRadius);
        app.post('/mobile/provider/update_username', ensureAuthorized, mobile_provider.updateuserName);
        app.post('/mobile/provider/update_worklocation', ensureAuthorized, mobile_provider.updateWorklocation);
        app.post('/mobile/provider/register/get-location-list', ensureAuthorized, mobile_provider.registerGetLocationList);
        app.post('/mobile/provider/register/get-category-list', ensureAuthorized, mobile_provider.registerGetCategoryList);
        app.post('/mobile/provider/register/get-country-list', ensureAuthorized, mobile_provider.registerGetCountryList);
        app.post('/mobile/provider/register/get-location-with-category', ensureAuthorized, mobile_provider.registerGetLocationwithCategory);
        app.post('/mobile/provider/change-password', ensureAuthorized, mobile_provider.changePassword);
        app.post('/mobile/provider/forgot-password', ensureAuthorized, mobile_provider.forgotPassword);
        app.post('/mobile/provider/view-job', ensureAuthorized, mobile_provider.viewJob);
        app.post('/mobile/provider/jobs-list', ensureAuthorized, mobile_provider.jobsList);
        app.post('/mobile/provider/cancel-job', ensureAuthorized, mobile_provider.cancelJob);
        app.post('/mobile/provider/provider-rating', mobile_provider.providerRating);
        app.post('/mobile/provider/update_image', middlewares.commonUpload('uploads/images/tasker/').single('file'), ensureAuthorized, mobile_provider.updateImage);
        app.post('/mobile/provider/jobs-stats', ensureAuthorized, mobile_provider.jobsStats);
        app.post('/mobile/provider/accept-job', ensureAuthorized, mobile_provider.acceptJob);
        app.post('/mobile/provider/update-availability', mobile_provider.updateAvailability);
        app.post('/mobile/provider/cancellation-reason', ensureAuthorized, mobile_provider.cancellationReason);
        app.post('/mobile/provider/start-off', ensureAuthorized, mobile_provider.startOff);
        app.post('/mobile/provider/arrived', ensureAuthorized, mobile_provider.arrived);
        app.post('/mobile/provider/start-job', ensureAuthorized, mobile_provider.startJob);
        app.post('/mobile/provider/job-completed', ensureAuthorized, mobile_provider.completejob);
        app.post('/mobile/provider/new-job', ensureAuthorized, mobile_provider.newJob);
        app.post('/mobile/provider/missed-jobs', ensureAuthorized, mobile_provider.missedJobs);
        app.post('/mobile/provider/job-more-info', ensureAuthorized, mobile_provider.jobMoreInfo);
        app.post('/mobile/provider/receive-cash', ensureAuthorized, mobile_provider.receiveCash);
        app.post('/mobile/provider/request-payment', ensureAuthorized, mobile_provider.requestPayment);
        app.post('/mobile/provider/earnings-stats', ensureAuthorized, mobile_provider.earningsStats);
        app.post('/mobile/provider/job-timeline', ensureAuthorized, mobile_provider.jobTimeline);
        app.post('/mobile/provider/cash-received', ensureAuthorized, mobile_provider.cashReceived);
        app.post('/mobile/provider/tasker-availability', mobile_provider.taskerAvailability);
        app.post('/mobile/provider/get-availability', ensureAuthorized, mobile_provider.getAvailability);
        app.post('/mobile/provider/update-workingdadys', ensureAuthorized, mobile_provider.updateWorkingdays);
        app.post('/mobile/provider/get-category', ensureAuthorized, mobile_provider.getCategoryList);
        app.post('/mobile/provider/get-maincategory', ensureAuthorized, mobile_provider.getmainCategoryListformobile);
        app.post('/mobile/provider/get-subcategory', ensureAuthorized, mobile_provider.getsubCategoryListformobile);
        app.post('/mobile/provider/get-subcategorydetails', ensureAuthorized, mobile_provider.getsubCategoryDetailsformobile);
        app.post('/mobile/provider/getearnings', ensureAuthorized, mobile_provider.getearnings);
        app.post('/mobile/provider/billingcycle', ensureAuthorized, mobile_provider.billingCycle);
        app.post('/mobile/provider/update-category', ensureAuthorized, mobile_provider.updateCategory);
        app.post('/mobile/provider/recent-list', ensureAuthorized, mobile_provider.recentBooking);
        app.all('/mobile/provider/register', mobile_provider.registerStep1);
        app.all('/mobile/provider/register/step2', mobile_provider.registerStep2);
        app.all('/mobile/provider/register/step3', mobile_provider.registerStep3);
        app.all('/mobile/provider/register/step4', middlewares.commonUpload('uploads/images/tasker/').single('userimage'), mobile_provider.registerStep4);
        app.all('/mobile/provider/register/step5', mobile_provider.registerStep5);
        app.all('/mobile/provider/register/step6', mobile_provider.registerStep6);
        app.all('/mobile/provider/register/success', mobile_provider.registerSuccess);
        app.all('/mobile/provider/register/cancel', mobile_provider.registerCancel);
        app.all('/mobile/provider/register/failed', mobile_provider.registerFailed);
        app.get('/mobile/registration/failed', mobile.registrFailed);
        app.get('/mobile/registration/finalfailed', mobile.finalregistrFailed);
        app.get('/mobile/registration/latlon', mobile.latlongFailed);
        app.get('/mobile/registration/samemobile', mobile.samemobile);
        app.get('/mobile/registration/timeout', mobile.registerTimeout);

        // Tasker Registration - Native
        app.post('/mobile/provider/register/form1', mobile_provider.registerStp1);
        app.post('/mobile/provider/register/form2', mobile_provider.registerStp2);
        app.post('/mobile/provider/register/form3', mobile_provider.registerStp3);
        app.post('/mobile/provider/register/form4', mobile_provider.registerStp4);
        //app.post('/mobile/provider/register/form5', mobile_provider.registerStp5);
        app.post('/mobile/provider/register/parent-category', ensureAuthorized, mobile_provider.registerParentCategory);
        app.post('/mobile/provider/register/child-category', ensureAuthorized, mobile_provider.registerChildCategory);
        app.post('/mobile/provider/register/experience', ensureAuthorized, mobile_provider.registerExperience);
        app.post('/mobile/provider/register/questions', ensureAuthorized, mobile_provider.registerQuestions);
        // ./Tasker Registration - Native

        app.get('/mobile/terms-condition', mobile.termscondition);
        app.get('/mobile/privacy-policy', mobile.privacypolicy);

        app.post('/mobile/tasker/add-category', ensureAuthorized, mobile_provider.addcategory);
        app.post('/mobile/tasker/update-category', ensureAuthorized, mobile_provider.updatemobilecategory);
        app.post('/mobile/tasker/delete-category', ensureAuthorized, mobile_provider.deleteCategory);
        app.post('/mobile/tasker/category-detail', ensureAuthorized, mobile_provider.categoryDetail);

    } catch (e) {
        console.log('Erroe in mobile router ----->', e);
    }
};
