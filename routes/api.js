var express = require('express');
var router = express.Router();
var request = require('request');
var admin = require("firebase-admin");
var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY);
const FB_APP_NAME = "USER_DEFAULTS_SAVE";

let userDefaultsFbApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://wa-robotics-scout.firebaseio.com",
    databaseAuthVariableOverride: {
        uid: "user-defaults-manager"
    }
},FB_APP_NAME);

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

function getTeamRankInfo(res, sku, team) { //https://api.vexdb.io/v1/get_rankings?sku=RE-VRC-16-5088&team=1961D
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

function getTeamsSkillsScores(res,sku) {
    request("https://api.vexdb.io/v1/get_teams?sku=" + sku, (error, response, body) => {
        let raw = body;
        let parsed = JSON.parse(raw);
        let teams = parsed.result.map(e => e.number);
        let results = [];

        let score;
        for (let i = 0; i < teams.length; i++) {
            results.push({team:teams[i]});/*,star: '<button class="mdl-button mdl-js-button mdl-button--icon star-team-btn"><i id="' + teams[i] + '" class="material-icons">star_border</i></button>'});
           */ //scores = request("https://api.vexdb.io/v1/get_")
        }

        console.log(results);

        res.send(JSON.stringify({data:results}));
    });
}

function finishSavingUserDefaults(orgId,tournament,team,uid,endDate,res) {
    console.log("endDate",endDate);
    let now = new Date();
    console.log("now",now);
    let nowPlus24Hrs = new Date();
    let expiryDate;
    nowPlus24Hrs.setDate(nowPlus24Hrs.getDate() + 1);
    //Rules:
    //-The end date is more than 24 hours in the future: set the expiry date to the end date
    //-The end date is less than 24 hours in the future or is in the past: set the expiry date to 24 hours from now

    if (endDate > nowPlus24Hrs) { //first case under Rules above
        expiryDate = endDate;
    } else {
        expiryDate = nowPlus24Hrs;
    }

    console.log("expirydate",expiryDate);

    console.log(orgId,tournament,team,uid,endDate);
    userDefaultsFbApp.database().ref("/userDefaults/" + uid).set({
        "org": orgId,
        "tournament": tournament,
        "team":team,
        "expires":expiryDate.toString()
    }).then(function() {
        res.send({status:1,result:"saved"});
    });


}

function getTourneyEndDateVexDb(sku,orgId,tournament,team,uid,res) {
    request("https://api.vexdb.io/v1/get_events?sku=" + sku,(error,response,body) => {
        let raw = body;
        let parsed = JSON.parse(raw);
        finishSavingUserDefaults(orgId,tournament,team,uid,new Date(parsed.result[0].end),res);
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

router.post('/select/save', function (req, res, next) {
    const code = req.params.orgauth;
    const token = req.body.token;
    const tournament = req.body.tournament;
    const team = req.body.team.toUpperCase();
    console.log("teamnum",team);
    //console.log("token",req.body.toString());
    let orgId;
    let uid;

    //Process:
    //1. Get the tournament's organization and verify that the user is authorized to access it
    //2. Look up the end date of the tournament specified
    //3. If the end date is in the future, the defaults will expire 24 hours after that date
    //3.b If the end date was in the past, the defaults will expire in 24 hours
    //4. Save the defaults in /userDefaults/:userid


    const db = userDefaultsFbApp.database();

        //Step 1 - get tournament's organization
    db.ref("/tournaments/" + tournament + "/organization").once("value").then(function(snapshot) {
        orgId = snapshot.val();
        console.log("oid",orgId);
        if (orgId !== null) { //Success - we got something back
            return admin.auth().verifyIdToken(token);
        } else {
            Promise.reject("invalid org id returned"); //stop and throw an error; the organization supplied probably doesn't exist
        }
    }).then(function(decodedToken) {
        uid = decodedToken.uid;
        return db.ref("/organizations/" + orgId + "/users/" + uid).once("value");
    }).then(function(snapshot) {
        console.log(snapshot.val());
        let authResult = snapshot.val();
        if (authResult !== null) {
            return db.ref("/tournaments/" + tournament + "/sku").once("value");
        } else {
            Promise.reject("This user is not authorized to perform this action: ERR_USER_NOT_AUTHORIZED");
        }
        return true;
    }).then(function (snapshot) {
        let sku = snapshot.val();
        getTourneyEndDateVexDb(sku,orgId,tournament,team,uid,res);
        //console.log(endDate);
        console.log(sku);

    }).catch(function (error) {
        console.error("Server error: " + error.message);
        res.status(500);
        res.send({"result":"error","status":0});
    });


});

router.get('/:sku/skills', function (req, res, next) {
    res.set('Content-Type', 'application/json');
    getTeamsSkillsScores(res, req.params.sku);
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
