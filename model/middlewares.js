var Json2csvParser = require('json2csv').Parser;
var multer = require('multer');
var fs = require('fs');
var async = require('async');
var moment = require('moment');
var CONFIG = require('../config/config');
var db = require('../model/mongodb.js');

function jsontocsv(data, callback) {

    var response = {};
    response.status = 0;

    db.GetCount(data.collection, { status: { $ne: 0 } }, function (err, documentsCount) {
        if (err || documentsCount <= 0) {
            response.message = "Unable to Export";
            callback(err, response);
        } else {

            var filename = data.collection + new Date().getTime();
            var fileType = 'csv';
            var filenamePath = 'uploads/temp/' + filename + '.' + fileType;

            var eachrun = 100000
            var TotalSeg = Math.ceil(documentsCount / eachrun);
            var count = 1;

            async.whilst(
                function () { return count <= TotalSeg; },
                function (asynCallback) {

                    var limit = eachrun;
                    var skip = ((eachrun * count)) - eachrun;

                    var mongoQuery = Array.from(data.query);
                    mongoQuery.push({ '$skip': parseInt(skip) });
                    mongoQuery.push({ '$limit': parseInt(limit) });

                    db.GetAggregation(data.collection, mongoQuery, function (err, mydata) {
                        if (err || mydata.length <= 0) {
                            response.message = "Unable to Export";
                            asynCallback(err, response);
                        } else {
                            for (var i = 0; i < mydata.length; i++) {
                                mydata[i].createdAt = moment(mydata[i].createdAt).format('DD/MM/YYYY');
                            }
                            if (fs.existsSync(filenamePath)) {
                                const parser = new Json2csvParser({ fields: data.csv, header: false });
                                const csv = parser.parse(mydata);
                                fs.appendFile(filenamePath, csv + '\r\n', function (err) {
                                    count++;
                                    asynCallback(err);
                                });
                            } else {
                                const parser = new Json2csvParser({ fields: data.csv });
                                const csv = parser.parse(mydata);
                                fs.writeFile(filenamePath, csv + '\r\n', function (err) {
                                    count++;
                                    asynCallback(err);
                                });
                            }
                        }
                    });
                },
                function (err, n) {
                    response.status = 1;
                    response.message = {};
                    response.message.filename = filename;
                    response.message.type = fileType;
                    callback(err, response);
                });
        }
    });
}

function commonUpload(destinationPath) {
    var storage = multer.diskStorage({
        destination: function (req, file, callback) {
            callback(null, destinationPath);
        },
        filename: function (req, file, callback) {
            var uploadName = file.originalname.split('.');
            var extension = '.' + uploadName[uploadName.length - 1];
            var fileName = /* file.fieldname + ' ' +  */Date.now().toString();
            fs.readFile(destinationPath + file.originalname, function (err, res) {
                if (!err) {
                    callback(null, fileName + extension);
                } else {
                    callback(null, fileName + extension);
                }
            });
        }
    });

    var uploaded = multer({ storage: storage }); /**----{limits : {fieldNameSize : 100}}---*/
    return uploaded;
}

function customUpload(destinationPath) {
    var storage = multer.diskStorage({
        destination: function (req, file, callback) {
            callback(null, destinationPath);
        },
        filename: function (req, file, callback) {
            var uploadName = file.originalname.split('.');
            var extension = '.' + uploadName[uploadName.length - 1];
            var fileName = file.fieldname;
            fs.readFile(destinationPath + file.originalname, function (err, res) {
                if (!err) {
                    callback(null, fileName + extension);
                } else {
                    callback(null, fileName + extension);
                }
            });
        }
    });

    var uploaded = multer({ storage: storage }); /**----{limits : {fieldNameSize : 100}}---*/
    return uploaded;
}

module.exports = {
    jsontocsv: jsontocsv,
    commonUpload: commonUpload,
    customUpload: customUpload
};