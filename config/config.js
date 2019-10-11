var path = require('path');
var fs = require('fs');

var config = JSON.parse(fs.readFileSync(path.join(__dirname, "/config.json"), 'utf8'));

var CONFIG = {};
CONFIG.ENV = (process.env.NODE_ENV || 'development');
CONFIG.PORT = (process.env.VCAP_APP_PORT || config.port);
//CONFIG.DB_URL = 'mongodb://' + config.mongodb.username + ':' + config.mongodb.password + '@' + config.mongodb.host + ':' + config.mongodb.port + '/' + config.mongodb.database;
CONFIG.DB_URL = 'mongodb://' + config.mongodb.host + ':' + config.mongodb.port + '/' + config.mongodb.database;
CONFIG.MOBILE_API = true; // true & false

CONFIG.TASKER = 'Tasker';
CONFIG.USER = 'User';

CONFIG.SITE_TYPE = 'Live';

CONFIG.DIRECTORY_USERS = './uploads/images/users/';
CONFIG.DIRECTORY_TASKERS = './uploads/images/tasker/';
CONFIG.DIRECTORY_CATEGORIES = './uploads/images/categories/';
CONFIG.DIRECTORY_PAYMENTPRICE = './uploads/images/paymentprice/';
CONFIG.DIRECTORY_PEOPLECMD = './uploads/images/peoplecmd/';
CONFIG.DIRECTORY_SLIDERS = './uploads/images/sliders/';
CONFIG.DIRECTORY_OTHERS = './uploads/images/others/';
CONFIG.DIRECTORY_CONFIG = './config/apns/';

CONFIG.USER_PROFILE_IMAGE_DEFAULT = 'uploads/default/user.jpg';
CONFIG.USER_PROFILE_IMAGE = 'uploads/images/users/';
CONFIG.CATEGORY_DEFAULT_IMAGE = 'uploads/default/category.jpg';
CONFIG.MARKER_DEFAULT_IMAGE = 'uploads/default/marker.jpg';

CONFIG.SECRET_KEY = '16f198404de4bb7b994f16b84e30f14f';

CONFIG.GOOGLE_MAP_API_KEY_SERVER = 'AIzaSyAjv66jF-6MhTdSphKP24GQnB3UW46JBGw';
CONFIG.GOOGLE_MAP_API_KEY_CLIENT = 'AIzaSyAjv66jF-6MhTdSphKP24GQnB3UW46JBGw';

// Notifications
CONFIG.NOTIFICATION = {};
CONFIG.NOTIFICATION.REQUEST_FOR_A_JOB = 'Request for a job';
CONFIG.NOTIFICATION.YOUR_JOB_IS_ACCEPTED = 'Your job is accepted';
CONFIG.NOTIFICATION.PROVIDER_START_OFF_YOUR_JOB = CONFIG.TASKER + ' start off your job';
CONFIG.NOTIFICATION.BILLING_AMOUNT_PARTIALLY_PAID = 'Billing amount Partially Paid';
CONFIG.NOTIFICATION.PROVIDER_ARRIVED_ON_YOUR_PLACE = CONFIG.TASKER + ' arrived on your place';
CONFIG.NOTIFICATION.PROVIDER_START_OFF_FROM_HIS_LOCATION = 'Tasker Started Off';
CONFIG.NOTIFICATION.PROVIDER_ARRIVED_ON_JOB_LOCATION = CONFIG.TASKER + 'Tasker Arrived';
CONFIG.NOTIFICATION.PROVIDER_STARTED_YOUR_JOB = 'Job Started';
CONFIG.NOTIFICATION.PAYMENT_COMPLETED = 'Payment Completed';
CONFIG.NOTIFICATION.YOUR_JOB_IS_REJECTED = 'Your job is Rejected';
CONFIG.NOTIFICATION.YOUR_JOB_HAS_BEEN_COMPLETED = 'Job Completed';
CONFIG.NOTIFICATION.JOB_REJECTED_BY_USER = 'Job Rejected by ' + CONFIG.USER;
CONFIG.NOTIFICATION.PROVIDER_CANCELLED_THIS_JOB = CONFIG.TASKER + ' rejected this job';
CONFIG.NOTIFICATION.YOUR_PROVIDER_IS_ON_THEIR_WAY = 'Your ' + CONFIG.TASKER + ' is on their way';
CONFIG.NOTIFICATION.PROVIDER_WANTS_PAYMENT_FOR_HIS_JOB = CONFIG.TASKER + ' request payment for his job';
CONFIG.NOTIFICATION.YOUR_BILLING_AMOUNT_PAID_SUCCESSFULLY = 'Your billing amount paid successfully';
CONFIG.NOTIFICATION.YOU_GOT_A_REQUEST_FOR_A_NEW_JOB = 'You got a request for a new job';
CONFIG.NOTIFICATION.USER_CANCELLED_THIS_JOB = CONFIG.USER + ' Cancelled this job';
CONFIG.NOTIFICATION.PROVIDER_ARRIVED_AT_JOB_LOCATION = 'Tasker Arrived';
CONFIG.NOTIFICATION.PROVIDER_SENT_REQUEST_FOR_PAYMENT = CONFIG.TASKER + ' have requested for payment';
CONFIG.NOTIFICATION.JOB_HAS_BEEN_STARTED = 'Job Started';
CONFIG.NOTIFICATION.JOB_HAS_BEEN_COMPLETED = 'Job Completed';
CONFIG.NOTIFICATION.JOB_HAS_BEEN_CLOSED = 'Payment Completed';
CONFIG.NOTIFICATION.PAYMENT_MADE_THROUGH_WALLET = 'Payment made through wallet';
CONFIG.NOTIFICATION.JOB_HAS_BEEN_CANCELLED = 'Job Cancelled';
CONFIG.NOTIFICATION.PLEASE_ACCEPT_THE_PENDING_TASK = 'Please Accept the Pending task';
CONFIG.NOTIFICATION.YOU_LEFT_THE_JOB = 'Your Job has been Expired';
CONFIG.NOTIFICATION.TASKER_FAILED_TO_ACCEPT_YOUR_JOB = CONFIG.TASKER + ' failed to accept your job';
CONFIG.NOTIFICATION.JOB_BOOKED = 'Job booked';
CONFIG.NOTIFICATION.HIRED_JOB = 'Job Accepted';
// Notifications Ends

// SMS
CONFIG.SMS = {};
CONFIG.SMS.USER_ACTIVATION = 'Thank you! Your OTP is %s';
CONFIG.SMS.UPDATE_MOBILE_NUMBER = 'Dear %s ! your one time password is %s ';
CONFIG.SMS.FORGOT_PASSWORD = 'Dear %s! Here is your verification code to reset your password  %s';;
CONFIG.SMS.RECEIVE_CASH = 'Your CRN %s verification code is %s';
CONFIG.SMS.EMERGENCY_CONTACT_VERIFICATION = 'Dear %s ! Here is your emergency contact verification code is %s ';
CONFIG.SMS.EMERGENCY_ALERT = 'Dear %s!, %s sent alert notification to you for his/her emergency, For more details please check email.';

CONFIG.SOCIAL_NETWORKS = {
    'facebookAuth': {
        'clientID': '138294510225286',
        'clientSecret': '53cbd4aa6d278930358d1e3a513cb230',
        'callbackURL': 'https://handyforall.zoplay.com/auth/facebook/callback'
    },
};

//Export Module
module.exports = CONFIG;
