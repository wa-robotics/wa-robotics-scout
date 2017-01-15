var express = require('express');
var router = express.Router();
var request = require('request');
//var admin = require("firebase-admin");
//var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY);


/*admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://wa-robotics-scout.firebaseio.com"
});*/

function getTeamMatchesVexDb(res, sku, teamNum) {
    teamNum = teamNum.toString();
    if (!/^[0-9]{1,5}[a-zA-Z]?$/.test(teamNum)) {
        res.send(JSON.stringify({
            error: 1,
            message: "Invalid team number entered"
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

function getTeamRankInfo(res, sku, team) {https://api.vexdb.io/v1/get_rankings?sku=RE-VRC-16-5088&team=1961D
    request("https://api.vexdb.io/v1/get_rankings?sku=" + sku + "&team=" + team, (error, response, body) => {
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

function getTeamsForTournament(res,sku) {
    request("https://api.vexdb.io/v1/get_teams?sku=" + sku, (error, response, body) => {
        let raw = body;
        let parsed = JSON.parse(raw);
        let teams = [];
        for (let i = 0; i < parsed.result.length; i++) {
            teams.push({team:parsed.result[i].number,r:Math.floor(Math.random()*50),p:Math.floor(Math.random()*50)});
        }
        let results = {"status":1,"data":teams};
        console.log(results);
        res.send(JSON.stringify(results));
    });
}

/*
router.post('/scout/:org/:tournament/:qmatchnum', function (req,res,next) {
    console.log("ran");
    //res.set("Content-Type","application/json");
    let userToken = req.body.token;
    console.log("user token",userToken);
    //res.send(userToken);
    //console.log(userToken);
    getScoutingInfoMatchFb(req,res, userToken);
});*/

router.get('/:sku/skills', function (req, res, next) {
    res.set('Content-Type', 'application/json');
    getTeamsForTournament(res, req.params.sku);
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

router.get('/:sku/rank/:team', (req,res,next) => {
    res.set('Content-Type', 'application/json');
    getTeamRankInfo(res, req.params.sku, req.params.team);
});


/*
function getUid(token) {
    console.log(token);
    return admin.auth().verifyIdToken(token)
        .then(function(decodedToken) {
            admin.initializeApp({
                uid: decodedToken.uid,
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://wa-robotics-scout.firebaseio.com"
            }, 'asUser');
            return decodedToken.uid;
            // ...
        });
}*/

/* Scouting API */
/*
function getScoutingInfoMatchFb (req, res, token) {
    console.log(token);
    //res.send(token);
    Promise.all([getUid(token)]).then(function(snapshots) {
        console.log(snapshots);
        console.log("User ID: " + snapshots[0]);
        //sendScoutingInfo(req.params.org,req.params.tournament,req.params.qmatchnum);
        //res.send({ "userID":snapshots[0]});

    }).then(function() {
        admin.database("asUser").ref("/").once("value").then(function(snapshot){
            console.log(snapshot);
        });
    }).catch(function(error) {
        res.send({"status":0,"error":"Problem with user token","firebase_error":error.message});
    });
    //res.send("\n hi");
}*/



module.exports = router;
