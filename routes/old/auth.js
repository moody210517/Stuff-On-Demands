var FacebookStrategy = require('passport-facebook').Strategy;
var CONFIG = require('../config/config'); //configuration variables
var User = require('../model/mongodb.js').users;
var Tasker = require('../model/mongodb.js').tasker;
var jwt = require('jsonwebtoken');
var async = require("async");
var mailcontent = require('../model/mailcontent.js');
var bcrypt = require('bcrypt-nodejs');
var twilio = require('../model/twilio.js');
var db = require('../model/mongodb.js');
var library = require('../model/library.js');

function jwtSign(payload) {
    var token = jwt.sign(payload, CONFIG.SECRET_KEY);
    return token;
}

module.exports = function (passport, io) {

    var userLibrary = require('../model/user.js')(io);

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
            User.findOne({ $or: [{ 'username': usernamecheck }, { 'email': profile.emails[0].value }] }, function (err, user) {
                if (err) {
                    return done(err);
                }
                var authHeader = jwtSign({ username: profile.username });
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
                    var newUser = new User();
                    newUser.username = profile.name.givenName + profile.name.familyName;
                    newUser.email = profile.emails[0].value;
                    newUser.role = 'user';
                    newUser.type = 'facebook';
                    newUser.status = 1;
                    newUser.unique_code = library.randomString(8, '#A');
                    newUser.save(function (err) {
                        if (err) {
                            return done(null, false, { error: err });
                        }
                        else {
                            var mailData = {};
                            mailData.template = 'Sighnupmessage';
                            mailData.to = newUser.email;
                            mailData.html = [];
                            mailData.html.push({ name: 'name', value: newUser.username });
                            mailData.html.push({ name: 'email', value: newUser.email });
                            mailData.html.push({ name: 'referal_code', value: newUser.unique_code });
                            mailcontent.sendmail(mailData, function (err, response) { });
                            return done(null, { "user": newUser, "header": authHeader });
                        }
                    });
                }
            });
        });
    }));
};
