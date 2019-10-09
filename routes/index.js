var path = require('path');
var jwt = require('jsonwebtoken');
var CONFIG = require('../config/config');
var db = require('../model/mongodb.js');
var FacebookStrategy = require('passport-facebook').Strategy;
var User123 = require('../model/mongodb.js').users;
var mailcontent = require('../model/mailcontent.js');
var library = require('../model/library.js');

module.exports = function (app, passport, io) {

    try {

        passport.serializeUser(function (user, done) {
            done(null, user);
        });

        passport.deserializeUser(function (user, done) {
            done(null, { id: user.id });
        });

        passport.use(new FacebookStrategy({
            clientID: CONFIG.SOCIAL_NETWORKS.facebookAuth.clientID,
            clientSecret: CONFIG.SOCIAL_NETWORKS.facebookAuth.clientSecret,
            callbackURL: CONFIG.SOCIAL_NETWORKS.facebookAuth.callbackURL,
            profileFields: ['id', 'email', 'gender', 'link', 'locale', 'name', 'timezone', 'updated_time', 'verified']
        }, function (req, token, refreshToken, profile, done) {

            process.nextTick(function () {
                var usernamecheck = profile.name.givenName + profile.name.familyName;


                    console.log("UUUUSSSSEEEERRRR",User123)
                    db.GetOneDocument('users',{ $or: [{ 'username': usernamecheck }, { 'email': profile.emails[0].value }] }, {} , {} , function (err, user) {
                    if (err) {
                        return done(err);
                    }
                    var authHeader = jwt.sign(usernamecheck, CONFIG.SECRET_KEY);
                    if (user) {
                        if (user.status == 0) {
                            user.status = 1;
                            user.save(function (err) {
                                if (err) {
                                    return done(null, false, { error: err });
                                } else {
                                    return done(null, { "user": user, "header": authHeader });
                                }
                            });
                        } else {
                            return done(null, { "user": user, "header": authHeader }); // user found, return that user
                        }
                    } else {
                        var newUser = {};
                        newUser.username = profile.name.givenName + profile.name.familyName;
                        newUser.email = profile.emails[0].value;
                        newUser.role = 'user';
                        newUser.type = 'facebook';
                        newUser.status = 1;
                        newUser.unique_code = library.randomString(8, '#A');
                        db.InsertDocument('users', newUser, function (err, response) {
                            if (err || !response) {
                                return done(null, false, { error: err });
                            } else {
                                var mailData = {};
                                mailData.template = 'Sighnupmessage';
                                mailData.to = newUser.email;
                                mailData.html = [];
                                mailData.html.push({ name: 'name', value: newUser.username });
                                mailData.html.push({ name: 'email', value: newUser.email });
                                mailData.html.push({ name: 'referal_code', value: newUser.unique_code });
                                mailcontent.sendmail(mailData, function (err, response) { });
                                return done(null, { "user": response, "header": authHeader });
                            }
                        });
                    }
                });
            });
        }));

        app.get('/admin', function (req, res) {
            // var settings = {};
            // settings.googleMapAPI = CONFIG.GOOGLE_MAP_API_KEY_CLIENT;
            // res.render('admin/layout', settings);

            db.GetOneDocument('settings', { "alias": "general" }, {}, {}, function (err, docdata) {
                // if (err) {
                //     res.send(err);
                // } else {
                    var settings = {};
                    settings.googleMapAPI = docdata && docdata.settings.map_api ? docdata.settings.map_api : '';
                    res.render('admin/layout', settings);
                //}
            });

        });

        app.get('/auth/facebook', passport.authenticate('facebook', { scope: ["email", "user_location"] }));

        app.get('/auth/facebook/callback',
            passport.authenticate('facebook', {
                successRedirect: '/auth/success',
                failureRedirect: '/auth/failure',
                failureFlash: true
            }));

        app.get('/auth/success', function (req, res) {
            global.name = req.session.passport.user.user._id;
            if (!req.session.passport.user.user.role) {
                req.session.passport.user.user.role = "user"
            }
            res.cookie('username', req.session.passport.header);
            console.log("req.session.passport.req.session.passport",req.session.passport.user)
            res.render('site/after_auth', {
                username: req.session.passport.user.user.username, email: req.session.passport.user.user.email, _id: req.session.passport.user.user._id, role: req.session.passport.user.user.role, token: req.session.passport.user.header,
                avatar: req.session.passport.user.user.avatar
            });
        });

        app.get('/auth/failure', function (req, res) {
            res.render('site/auth_fail', { err: req.session.flash });
        });

        app.get('/site-success', function (req, res) {
            global.name = req.session.passport.user._id;
            res.cookie('username', req.session.passport.user.header || req.session.passport.user.user.token);
            res.send({ user: req.session.passport.user.user.username, email: req.session.passport.user.user.email, user_id: req.session.passport.user.user._id, token: req.session.passport.user.header, user_type: req.session.passport.user.user.role, tasker_status: req.session.passport.user.user.tasker_status, status: req.session.passport.user.user.status, verification_code: req.session.passport.user.user.verification_code, phone: req.session.passport.user.user.phone.number });
        });

        app.get('/site-failure', function (req, res) {
            if (req.session.flash.Error) {
                var error = req.session.flash.Error[0];
            } else if (req.session.flash.error) {
                var error = req.session.flash.error[0];
            }
            req.session.destroy(function (err) {
                res.send(error);
            });
        });

        app.post('/site-logout', function (req, res) {

            var roles = req.body.currentUser.user_type;
            var userid = req.body.currentUser.user_id;
            var model = (roles == 'user')

            if (roles == 'user') {
                model = 'users'
            } else if (roles == 'tasker') {
                model = 'tasker'
            }
            db.UpdateDocument(model, { '_id': userid }, { 'activity.last_logout': new Date() }, {}, function (err, response) {
                req.session.destroy(function (err) {
                    res.send('success');
                });
            });
        });

        app.post('/facebookregister', passport.authenticate('facebooksite-register', {
            successRedirect: '/site-success',
            failureRedirect: '/site-failure',
            failureFlash: true
        }));

        if (CONFIG.MOBILE_API) {
            var mobile = require('../routes/mobile.js')(app, io);
        }

        var site = require('../routes/site.js')(app, io);
        var admin = require('../routes/admin.js')(app, io);

        app.get('/*', function (req, res) {

            db.GetDocument('settings', { 'alias': ['seo', 'general'] }, {}, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {

                    var settings = {};
                    settings.title = docdata[1].settings.seo_title;
                    settings.description = docdata[1].settings.meta_description;
                    settings.image = GLOBAL_CONFIG.logo;
                    settings.siteUrl = GLOBAL_CONFIG.site_url;
                    settings.fbappId = CONFIG.SOCIAL_NETWORKS.facebookAuth.clientID;
                    settings.googleMapAPI = docdata[0].settings.map_api ? docdata[0].settings.map_api : '';
                    settings.gaTrackingID = docdata[1].settings.webmaster.google_analytics;
                    res.render('site/layout', settings);

                }
            });

            // db.GetOneDocument('settings', { "alias": "seo" }, {}, {}, function (err, docdata) {
            //     if (err) {
            //         res.send(err);
            //     } else {

            //         var settings = {};
            //         settings.title = docdata.settings.seo_title;
            //         settings.description = docdata.settings.meta_description;
            //         settings.image = GLOBAL_CONFIG.logo;
            //         settings.siteUrl = GLOBAL_CONFIG.site_url;
            //         settings.fbappId = CONFIG.SOCIAL_NETWORKS.facebookAuth.clientID;
            //         settings.googleMapAPI = CONFIG.GOOGLE_MAP_API_KEY_CLIENT;
            //         settings.gaTrackingID = docdata.settings.webmaster.google_analytics;
            //         res.render('site/layout', settings);

            //     }
            // });
        });
    } catch (e) {
        console.log('Error in Router', e);
    }

};
