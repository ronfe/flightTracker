/**
 * Created by ronfe on 15-10-3.
 */

var express = require('express');
var _ = require('lodash');
var async = require('async');
var request = require('request');

var app = new express();

app.get('/flight/:flightId', function (req, res) {
    var flightCode = req.params.flightId;
    var queryFlightUrl = 'http://www.flightradar24.com/v1/search/web/find?query=' + flightCode;
    request.get(queryFlightUrl, function(err, response, data){
        if (err) console.error(err);
        var resData = JSON.parse(data);
        var resultArray = resData['results'];
        if (resultArray.length >= 1){
            var checking = function(unitResult, cb){
                //return unitResult.type;
                if (unitResult.type === 'live'){
                    cb(null, unitResult)
                }
                else {
                    cb(null, 'NA')
                }
            };
            async.map(resultArray, checking, function(err, results){
                if (err) console.error(err);
                var unitResult = {};

                _.forEach(results, function(element){
                    if (element !== 'NA'){
                        unitResult = element;
                    }
                });

                if (Object.keys(unitResult).length == 0){
                    res.status(200).json('no live flights or timed out');
                }
                else {
                    var flightId = unitResult.id;
                    request.get('http://lhr.data.fr24.com/_external/planedata_json.1.4.php?f=' + flightId, function(err, response, flightData){
                        if (err) console.error(err);
                        var cFlightData = JSON.parse(flightData);
                        var flightPosition = cFlightData.trail.slice(0, 3);
                        request.get('https://maps.googleapis.com/maps/api/geocode/json?latlng=' + flightPosition[0] + ',' + flightPosition[1], function(err, response, geoData){
                            if (err) console.error(err);
                            cGeoData = JSON.parse(geoData);
                            var geoResArray = cGeoData['results'];
                            var geoInfo = geoResArray[geoResArray.length - 3].formatted_address;
                            var output = {
                                position: geoInfo,
                                height: flightPosition[3]
                            };
                            res.status(200).json(output);
                        });
                    });
                }
            });
        }
        else {
            res.status(200).json('not found');
        }
    });
});

var port = process.env.port ? process.ENV.port : 5555;
app.listen(port);
console.log('The site is listening at port ' + port);