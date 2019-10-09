var http = require('http');
var https = require('https');
var CONFIG = require('../config/config');

function geocode(data, callback) {
    return https.get({
        protocol: 'https:',
        host: 'maps.googleapis.com',
        path: '/maps/api/geocode/json?latlng=' + data.latitude + ',' + data.longitude + '&sensor=false&key=' + CONFIG.GOOGLE_MAP_API_KEY_SERVER
    }, function (response) {
        var body = '';
        response.on('data', function (d) {
            body += d;
        });
        response.on('end', function () {
            var parsed = JSON.parse(body);
            callback(parsed.results);
        });
    });
}

function directions(data, callback) {
    return http.get({
        protocol: 'http:',
        host: 'maps.googleapis.com',
        path: '/maps/api/directions/json?origin=' + data.from + '&destination=' + data.to + '&alternatives=true&sensor=false&mode=driving'
    }, function (response) {
        var body = '';
        response.on('data', function (d) {
            body += d;
        });
        response.on('end', function () {
            var parsed = JSON.parse(body);
            callback(parsed);
        });
    });
}

module.exports = {
    "geocode": geocode,
    "directions": directions
};