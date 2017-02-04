var express = require('express');
var router = express.Router();
var request = require('request');
var rp = require("request-promise");
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

let skillsDataSaveFbApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://wa-robotics-scout.firebaseio.com",
    databaseAuthVariableOverride: {
        uid: "pretourney-skills-save-manager"
    }
},"PRETOURNEY_SKILLS_SAVE");

let skillsDataFetchFbApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://wa-robotics-scout.firebaseio.com",
    databaseAuthVariableOverride: {
        uid: "pretourney-skills-fetch"
    }
},"PRETOURNEY_SKILLS_FETCH");

let starredTeamsFetchFbApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://wa-robotics-scout.firebaseio.com",
    databaseAuthVariableOverride: {
        uid: "starred-teams-fetch"
    }
},"STARRED_TEAMS_FETCH");

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

//Precondition: the caller must verify that the user is authorized to receive starred teams data
function getUnscoredMatches(res, sku, num,getStarred) {
    request("https://api.vexdb.io/v1/get_matches?scored=0&limit_number=" + num + "&sku=" + sku, (error, response, body) => {
        var raw = body;
        var parsed = JSON.parse(raw);
        var results = {
            status: 1,
            results: parsed.result,
        };
        //console.log(results);
        if (getStarred !== -1) {
            let tournament = getStarred;
            let db = starredTeamsFetchFbApp.database();
            db.ref("/tournament_team_stars/" + tournament).once("value").then(function(snapshot) {
                let starredTeamsObj = snapshot.val();
                let starredTeams = [];
                if (starredTeamsObj !== null) {
                    starredTeams = Object.keys(starredTeamsObj);
                }
                console.log(starredTeams);
                return starredTeams;


            }).then(function(starredTeams) {
                let results = JSON.parse(raw);
                console.log("get starred matches");
                let starredInMatch = [];
                for (let i = 0; i < results.result.length; i++) {
                    let match = results.result[i];
                    console.log("match",match);
                    if (starredTeams.indexOf(match.red1) !== -1) {
                        console.log(starredTeams.indexOf(match.red1));
                        starredInMatch.push(match.red1);
                    }
                    if (starredTeams.indexOf(match.red2) !== -1) {
                        starredInMatch.push(match.red2);
                    }
                    if (starredTeams.indexOf(match.blue1) !== -1) {
                        starredInMatch.push(match.blue);
                    }
                    if (starredTeams.indexOf(match.blue2) !== -1) {
                        console.log(starredTeams.indexOf(match.blue2));
                        starredInMatch.push(match.blue2);
                    }
                    results.result[i].starred = starredInMatch;
                    starredInMatch = [];
                }
                var x = {
                    status: 1,
                    results: results.result,
                };
                res.send(JSON.stringify(x));
                //results.starred = starredInMatch;
            });
        }

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

function processSkillsScores(scores) {
    let maxTotalScore = -1;
    let maxRobotSkillsScore = -1;
    let maxProgSkillsScore = -1;
    let elem;

    let results = [];
    //process scores collected to produce highest Robot Skills, Programming Skills, and Combined Skills scores
    for (let team = 0; team < scores.length; team++) {
        console.log(scores[team]);
        try {
            if (scores[team].sku === "WARS_DID_NOT_ATTEMPT") { //this team doesn't have any skills scores
                results.push({team:scores[team].team,maxRobot:0,maxProg:0,maxTotal:0});
                continue;
            }
        } catch (e) {

        }

        for (let scoreNum = 0; scoreNum < scores[team].length; scoreNum++) {
            //score types (as listed on VexDB):
            //0 - Robot Skills
            //1 - Programming Skills
            //2 - Combined Skills (for events in Starstruck or later)
            elem = scores[team][scoreNum];
            if (elem.type === 0 && elem.score > maxRobotSkillsScore) { //robot skills (NOT combined) score
                    maxRobotSkillsScore = elem.score;
            } else if (elem.type === 1 && elem.score > maxProgSkillsScore) {
                maxProgSkillsScore = elem.score;
            } else if (elem.type === 2 && elem.score > maxTotalScore) {
                maxTotalScore = elem.score;
            }
        }

        results.push({team:scores[team][0].team,maxRobot:maxRobotSkillsScore,maxProg:maxProgSkillsScore,maxTotal:maxTotalScore});
        maxProgSkillsScore = 0;
        maxRobotSkillsScore = 0;
        maxTotalScore = 0;
    }

    let resultsObj = {};
    for (let i = 0; i < results.length; i++) {
        resultsObj[results[i].team] = {
            team: results[i].team,
            maxRobot: results[i].maxRobot,
            maxProg: results[i].maxProg,
            maxTotal: results[i].maxTotal
        };
    }
    resultsObj.dateCollected = new Date().toString();
    return resultsObj;
}

function getTeamsSkillsScores(res,sku,tournamentID) {
    rp("https://api.vexdb.io/v1/get_teams?sku=" + sku).then(function(response) {
        var parsed = JSON.parse(response);
        //console.log("cake",cake);
        let teams = parsed.result.map(e => e.number);
        console.log("teams",teams);
        let result = [];
        return teams.reduce((seq, n) => { //this can make sense, see http://stackoverflow.com/documentation/javascript/231/promises/5917/reduce-an-array-to-chained-promises#t=201701280043030488714
            return seq.then(() => {
                console.log(n);
                return new Promise(res => {
                    rp("https://api.vexdb.io/v1/get_skills?season=current&team=" + n).then((respo) => {
                        let p = JSON.parse(respo);
                        if (p.result.length === 0) {
                            p.result = { sku:"WARS_DID_NOT_ATTEMPT",team: n };
                        }
                        console.log(respo);
                        result.push(p.result);
                    }).then(() => setTimeout(res,250));
                });
            });
        }, Promise.resolve()).then(
            () => {
                res.set("Content-Type","application/json");
                let processedResults = processSkillsScores(result);
                const db = skillsDataSaveFbApp.database();
                db.ref("/pretourneySkillsData/" + tournamentID).set(processedResults)
                    .then(() => { return db.ref("/tournaments/" + tournamentID + "/pretourneySkillsLastUpdated").set(processedResults.dateCollected); })
                    .then(() => res.send({status:1,message:"Operation completed successfully"}))
                    .catch((e)=> console.log(e));
            }, (e)=> console.log(e)
        );
        //return vexDbSkillsScores(teams,sku);
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


//fetches all pretournament scouting data to be shown on team list page
router.post('/pretournament/fetch', function (req, res, next) {
    const token = req.body.token;
    const tournament = req.body.tournament;
    //console.log("token",req.body.toString());
    let orgId;
    let uid;
    const db = skillsDataFetchFbApp.database();

    //1. Verify that the user can access the tournament for which new data has been requested
    //2.

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
    }).then(function(snapshot) { //verify that this user is listed as a member on the organization that the tournament belongs to
        console.log(snapshot.val());
        let authResult = snapshot.val();
        if (authResult !== null) {
            return db.ref("/pretourneySkillsData/" + tournament).once("value");
        } else {
            Promise.reject("The user is not authorized to perform this action: ERR_USER_NOT_AUTHORIZED");
        }
        return true;
    }).then(function(snapshot) {
        let skillsData = snapshot.val();
        let result = [];
        for (let team in skillsData) {
            if (skillsData.hasOwnProperty(team)) {
                result.push([skillsData[team].team,null,skillsData[team].maxTotal,skillsData[team].maxRobot,skillsData[team].maxProg]);
            }
        }

        res.send(result);
    }).catch(function (error) {
        console.error("Server error: " + error.message);
        res.status(500);
        res.send({"result":"error","status":0,"message":error.message});
    });
});

router.post('/skills/pretournament/refresh', function (req, res, next) {
    const code = req.params.orgauth;
    const token = req.body.token;
    const tournament = req.body.tournament;
    //console.log("token",req.body.toString());
    let orgId;
    let uid;
    const db = skillsDataSaveFbApp.database();

    //1. Verify that the user can access the tournament for which new data has been requested
    //2. Don't refresh if the new data is less than 24 hours old
    //3. Make a request to VexDB for each team (waiting 125ms between requests), and then save the total robot skills score to Firebase.

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
    }).then(function(snapshot) { //verify that this user is listed as a member on the organization that the tournament belongs to
        console.log(snapshot.val());
        let authResult = snapshot.val();
        if (authResult !== null) {
            return db.ref("/pretourneySkillsData/" + tournament + "/dateCollected").once("value");
        } else {
            Promise.reject("The user is not authorized to perform this action: ERR_USER_NOT_AUTHORIZED");
        }
        return false;
    }).then((snapshot) => {
        console.log("datecollected",snapshot.val());
        let lastCollectedString = snapshot.val();
        console.log(lastCollectedString);
        if (snapshot.val() !== null) {
            let lastCollected = new Date(lastCollectedString);
            console.log(lastCollected.toString());
            let nextAllowableRefresh = new Date();
            nextAllowableRefresh.setDate(lastCollected.getDate() + 1);
            let now = new Date();
            console.log(now.getDate());
            console.log(nextAllowableRefresh.getDate());
            console.log(now.getDate() > nextAllowableRefresh.getDate())
            if (now > nextAllowableRefresh) { //OK to refresh
                console.log("inside OK to refresh");
                return db.ref("/tournaments/" + tournament + "/sku").once("value");
            } else {
                //Promise.reject("A refresh is not authorized at this time");
                console.log("not OK to refresh");
                return false;
                //return db.ref("/tournaments/" + tournament + "/sku").once("value");
            }
        } else { //no data exists yet, so continue
            return db.ref("/tournaments/" + tournament + "/sku").once("value");
        }

    }).then(function(snapshot) {
        console.log(snapshot);
        if (snapshot) {
            let tournamentSku = snapshot.val();
            return getTeamsSkillsScores(res, tournamentSku, tournament);
        } else {
            res.send({status:0,message:"A refresh is not authorized at this time"});
        }
    }).catch(function (error) {
        console.error("Server error: " + error.message);
        res.status(500);
        res.send({"result":"error","status":0,"message":error.message});
    });
});

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
    console.log(req.query.highlight);
    //console.log(req.query.token.length);
    let getStarredTeams = null;
    let orgId;
    if (req.query.highlight == null) {
        console.log("don't show starred teams");
        getStarredTeams = -1;
        getUnscoredMatches(res, req.params.sku, parseInt(req.params.num),getStarredTeams);
    } else {
        console.log("show starred teams for " + req.query.highlight);
        getStarredTeams = req.query.highlight;
        let tournament = getStarredTeams;
        let db = starredTeamsFetchFbApp.database();
        let token = req.query.token;
        db.ref("/tournaments/" + tournament + "/organization").once("value").then(function(snapshot) {
            orgId = snapshot.val();
            if (orgId !== null) { //Success - we got something back
                return admin.auth().verifyIdToken(token);
            } else {
                Promise.reject("invalid org id returned"); //stop and throw an error; the organization supplied probably doesn't exist
            }
        }).then(function(decodedToken) {
            uid = decodedToken.uid;
            return db.ref("/organizations/" + orgId + "/users/" + uid).once("value");
        }).then(function(snapshot) { //verify that this user is listed as a member on the organization that the tournament belongs to
            console.log(snapshot.val());
            let authResult = snapshot.val();
            if (authResult !== null) {
                return getUnscoredMatches(res, req.params.sku, parseInt(req.params.num),getStarredTeams);
            } else {
                Promise.reject("The user is not authorized to perform this action: ERR_USER_NOT_AUTHORIZED");
            }
            return true;
        }).catch(function (error) {
            console.error("Server error: " + error.message);
            res.status(500);
            res.send({"result":"error","status":0,"message":error.message});
        });
    }

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
