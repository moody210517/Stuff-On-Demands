"use strict";

/** Dependency Injection */
var express = require('express') // $ npm install express
    , path = require('path') // Node In-Build Module
    , bodyParser = require('body-parser') // $ npm install body-parser
    , session = require('express-session') // $ npm install express-session
    , cookieParser = require('cookie-parser') // $ npm install cookie-parser
    , passport = require('passport') // $ npm install passport
    , mongoose = require('mongoose') // $ npm install mongoose
    , validator = require('express-validator') // $ npm install express-validator
    , CONFIG = require('./config/config') // Injecting Our Configuration
    , favicon = require('serve-favicon') // $ npm install serve-favicon
    , compression = require('compression')
    , url = require('url')
    , i18n = require("i18n")
    , db = require('./model/mongodb.js')
    , helmet = require('helmet');
/** /Dependency Injection */

/** Socket.IO */
var app = express(); // Initializing ExpressJS
var server = require('http').createServer(app);
var io = require('socket.io')(server);
/** /Socket.IO */

/** Global Configuration*/
global.GLOBAL_CONFIG = {};
mongoose.Promise = global.Promise;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
i18n.configure({ locales: ['en', 'ta', 'ar'], defaultLocale: 'en', autoReload: true, directory: __dirname + '/uploads/locales', syncFiles: true });
/** /Global Configuration*/

/** MongoDB Connection */
mongoose.connect(CONFIG.DB_URL, { useMongoClient: true });
mongoose.connection.on('error', function (error) { console.error('Error in MongoDB Connection: ' + error); });
mongoose.connection.on('reconnected', function () { console.log('MongoDB Reconnected !'); });
mongoose.connection.on('disconnected', function () { console.log('MongoDB Disconnected !'); });
mongoose.connection.on('connected', function () {
    console.log("Mongo connected");
    db.GetOneDocument('settings', { "alias": "general" }, {}, {}, function (err, docdata) {
        if (err || !docdata) {
            console.log("Unable to establish connection to database");
        } else {

            GLOBAL_CONFIG.site_url = docdata.settings.site_url;
            GLOBAL_CONFIG.logo = docdata.settings.site_url + docdata.settings.logo;

            /** Middleware Configuration */
            app.disable('x-powered-by');
            app.use(helmet());
            app.use(bodyParser.urlencoded({ limit: '100mb', extended: true })); // Parse application/x-www-form-urlencoded
            app.use(bodyParser.json({ limit: '100mb' })); // bodyParser - Initializing/Configuration
            app.use(cookieParser('CasperonHandyforall')); // cookieParser - Initializing/Configuration cookie: {maxAge: 8000},
            app.use(session({ secret: 'CasperonHandyforall', resave: true, saveUninitialized: true })); // express-session - Initializing/Configuration
            app.use(validator());
            app.use(passport.initialize()); // passport - Initializing
            app.use(passport.session()); // passport - User Session Initializing
            app.use(compression()); //use compression middleware to compress and serve the static content.
            app.use('/app', express.static(path.join(__dirname, '/app'), { maxAge: 7 * 86400000 })); // 1 day = 86400000 ms
            app.use('/uploads', express.static(path.join(__dirname, '/uploads'), { maxAge: 7 * 86400000 }));
            app.use(i18n.init);
            app.set('view engine', 'pug');
            app.locals.pretty = false;
            app.set('views', './views');
            app.use(function (req, res, next) {
                console.log("originalurl", req.originalUrl)
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                i18n.setLocale(req.headers["accept-language"] || 'en');
                next();
            });
            /** /Middleware Configuration */

            /** Dependency Mapping */
            require('./routes')(app, passport, io);
            require('./sockets')(io);
            require('./cron');
            /** /Dependency Mapping*/

            /** HTTP Server Instance */
            try {
                server.listen(CONFIG.PORT, function () {
                    console.log('Server turned on with', CONFIG.ENV, 'mode on port', CONFIG.PORT);
                });
            } catch (ex) {
                console.log(ex);
            }
            /** /HTTP Server Instance */
        }
    });
});
/** /MongoDB Connection */

var closeDBConnection = function closeDBConnection() {
    mongoose.connection.close(function () { process.exit(0); });
}
// If the Node process ends, close the Mongoose connection
process.on('SIGINT', closeDBConnection).on('SIGTERM', closeDBConnection);