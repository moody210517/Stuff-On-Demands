"use strict";

var path = require('path') // Node In-Build Module
    , mongoose = require('mongoose') // $ npm install mongoose
    , bcrypt = require('bcrypt-nodejs')// $ npm install bcrypt-nodejs
    , fs = require('fs')
    , spawn = require('child_process').spawn;
var inquirer = require('inquirer');
var figlet = require('figlet');

figlet('HandyForAll', function (err, data) {
    if (err) {
        console.log('Something went wrong...');
        return;
    } else {
        console.log(data)
        inquirer.prompt([{
            type: 'input',
            name: 'dbhost',
            message: 'DB Host Name : '
        }, {
            type: 'input',
            name: 'dbport',
            message: 'DB Port Number : '
        }, {
            type: 'input',
            name: 'dbname',
            message: 'Database Name : '
        }, {
            type: 'input',
            name: 'port',
            message: 'Website Port : '
        }, {
            type: 'input',
            name: 'siteurl',
            message: 'Site Url : '
        }, {
            type: 'input',
            name: 'sitename',
            message: 'Website Name : '
        }, {
            type: 'input',
            name: 'admin_name',
            message: 'Admin Name : '
        }, {
            type: 'input',
            name: 'email',
            message: 'Admin Email : '
        },
        {
            type: 'input',
            name: 'admin_password',
            message: 'Admin Password : '
        }]).then(function (request) {
            
            fs.access(path.join(__dirname, '/config/config.json'), (err) => {
                if (err) {
                    console.log("Website Installation Already");
                } else {
                    var args = ['--host', request.dbhost, '--port', request.dbport, '--db', request.dbname, '--drop', 'db'];
                    var ls = spawn('mongorestore', args);
                    ls.on('close', (code) => {
                        fs.readFile(path.join(__dirname, '/config/config.json'), "utf8", function (error, data) {
                            
                            var config = JSON.parse(data)
                            config.port = request.port;
                            config.mongodb.host = request.dbhost;
                            config.mongodb.port = request.dbport;
                            config.mongodb.database = request.dbname;
                            fs.writeFile(path.join(__dirname, '/config/config.json'), JSON.stringify(config, null, 4), function (err, respo) {
                                if (err) {
                                    res.send(err);
                                } else {
                                    var data = {};
                                    data = { settings: {} };
                                    var CONFIG = require('./config/config');
                                    mongoose.connect(CONFIG.DB_URL, function (error) {
                                        if (error) {
                                            console.log('MongoDB connection error: ', error);
                                        }
                                    }); //Connecting with MongoDB

                                    var db = require('./controller/adaptor/mongodb.js');
                                    if (request.admin_password) {
                                        request.admin_password = bcrypt.hashSync(request.admin_password, bcrypt.genSaltSync(8), null);
                                    }
                                    db.UpdateDocument('admins', { "username": request.admin_name }, { "username": request.admin_name, "name": request.admin_name, "email": request.email, "role": 'admin', "password": request.admin_password, "status": 1 }, { upsert: true }, function (err, result) {
                                        if (err) {
                                            console.log('Error On Admin');
                                        } else {
                                            db.UpdateDocument('settings', { alias: 'general' }, { $set: { "settings.site_title": request.sitename, "settings.site_url": request.siteurl } }, { multi: false }, function (err, result) {
                                                if (err) {
                                                    console.log('Website Installation Already');
                                                } else {
                                                    console.log('Website Installation Completed');
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        });
                    });
                }
            });
        });
    }
});