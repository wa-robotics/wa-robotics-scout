var express = require('express');
var router = express.Router();
var request = require('request');
var admin = require("firebase-admin");
var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY);


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://wa-robotics-scout.firebaseio.com"
});

function getTeamMatchesVexDb(res, sku, teamNum) {
    teamNum = teamNum.toString();
    if (!/^[0-9]{1,5}[a-zA-Z]?$/.test(teamNum)) {
        res.send(JSON.stringify({
            error: 1
            , message: "Invalid team number entered"
        }));
    }
    else {
        request("https://api.vexdb.io/v1/get_matches?sku=" + sku + "&team=" + teamNum, function (error, response, body) {
            var raw = body;
            var parsed = JSON.parse(raw);
            var results = {
                status: 1
                , results: parsed.result
            };
            console.log(results);
            res.send(JSON.stringify(results));
        });
    }
}

function getUnscoredMatches(res, sku, num) {
    request("https://api.vexdb.io/v1/get_matches?scored=0&limit_number=" + num + "&sku=" + sku, (error, response, body) => {
        var raw = body;
        var parsed = JSON.parse(raw);
        var results = {
            status: 1,
            results: parsed.result
        };
        console.log(results);
        res.send(JSON.stringify(results));
    });
}

function getMatch(res, sku, round, instance, matchNum) {
    request("https://api.vexdb.io/v1/get_matches?sku=" + sku + "&round=" + round + "&instance=" + instance + "&matchnum=" + matchNum, (error, response, body) => {
        var raw = body;
        var parsed = JSON.parse(raw);
        var results = {
            status: 1,
            results: parsed.result
        };
        console.log(results);
        res.send(JSON.stringify(results));
    });
}

router.get('/scout/:org/:tournament/:qmatchnum', function (req,res,next) {
    res.set("Content-Type","application/json");
    let userToken = req.query.token;
    getScoutingInfoMatchFb(res, req.body);
});

router.get('/:sku/:team', function (req, res, next) {
    res.set('Content-Type', 'application/json');
    getTeamMatchesVexDb(res, req.params.sku, req.params.team);
});
router.get('/:sku/unscored/:num', (req, res, next) => {
    res.set('Content-Type', 'application/json');
    getUnscoredMatches(res, req.params.sku, parseInt(req.params.num));
});
router.get('/:sku/match/:round/:instance/:num', (req,res,next) => {
    res.set('Content-Type', 'application/json');
    getMatch(res, req.params.sku, parseInt(req.params.round), parseInt(req.params.instance), parseInt(req.params.num));
});

/* Scouting API */
function getScoutingInfoMatchFb (res, token) {
    admin.auth().verifyIdToken(token)
        .then(function(decodedToken) {
            var uid = decodedToken.uid;
            res.send("uid is " + uid);
        }).catch(function(error) {
        // Handle error
    });
    res.send("\n hi");
}



module.exports = router;
