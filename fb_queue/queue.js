const Queue = require("firebase-queue");
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY);
const rp = require("request-promise");
const FB_APP_NAME = "USER_DEFAULTS_SAVE";
console.log(32423423);
let fbQueue = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://wa-robotics-scout.firebaseio.com",

},"fbQueue");

let db = fbQueue.database();
let q = db.ref("queue");
console.log("I exist!");

let options = {
    specId: 'task_1',
    numWorkers: 1
};

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

function processSkills(sku,progress, tournamentID) {
    return rp("https://api.vexdb.io/v1/get_teams?sku=" + sku).then(function (response) {
        var parsed = JSON.parse(response);
        //console.log("cake",cake);
        let teams = parsed.result.map(e => e.number);
        console.log("teams", teams);
        let result = [];
        let totalNum = teams.length;
        let completed = 0;
        //resolve({"_new_state": "test"});
        return teams.reduce((seq, n) => { //this can make sense, see http://stackoverflow.com/documentation/javascript/231/promises/5917/reduce-an-array-to-chained-promises#t=201701280043030488714
            return seq.then(() => {
                console.log(n);
                return new Promise(res => {
                    rp("https://api.vexdb.io/v1/get_skills?season=current&team=" + n).then((respo) => {
                        let p = JSON.parse(respo);
                        if (p.result.length === 0) {
                            p.result = {sku: "WARS_DID_NOT_ATTEMPT", team: n};
                        }
                        console.log(respo);
                        result.push(p.result);
                        completed++;
                        progress(completed / totalNum);
                    }).then(() => setTimeout(res, 250));
                });
            });
        }, Promise.resolve()).then(
            () => {
                //res.set("Content-Type","application/json");
                let processedResults = processSkillsScores(result);
                const db = fbQueue.database();
                db.ref("/pretourneySkillsData/" + sku).set(processedResults)
                    .then(() => {
                        return db.ref("/tournaments/" + tournamentID + "/pretourneySkillsLastUpdated").set(processedResults.dateCollected);
                    })
                    //.then(() => resolve({status:1,message:"Operation completed successfully"}))
                    .catch((e) => console.log(e));
            }, (e) => console.log(e)
        );
        //return vexDbSkillsScores(teams,sku);
    });
}


let scoutingFormSubmissions = {
    specId: 'formSubmissions',
    numWorkers: 10
};

function classifyZone(y) {
    if (y <= 207 && y > 112.75) {
        return 1;
    } else if (y <= 112.75 && y >= 0) {
        return 2;
    } else {
        return 0;
    }
}

function parseScoredObjs(objs) {
    if (objs.length <= 1) {
        return -1; //not enough data
    } else {
        let lastRefTime = objs[0].time;
        let times = [lastRefTime];
        let numNear = 0;
        let numFar = 0;
        let numNone = 0;
        //near zone <= 207 and > 112.75
        //far zone <= 112.75 and > 0
        let zone;

        for (let i = 0; i < objs.length; i++) {
            if (i > 0) {
                if ((objs[i].time - lastRefTime) / 1000 > 2.5) { //the idea here is that a typical robot only scores every 3-6 seconds.  So if there's a tap (and
                                                                 //  hence, a ScoredObject in objs) for each object scored, there would only be one discrete scoring action when there's a reasonable length of time 2 scored objects
                    console.log("obj, lastrt",objs[i],lastRefTime);
                    lastRefTime = objs[i].time;
                    times.push(lastRefTime);
                }
                zone = classifyZone(objs[i].y);
                if (zone === 1) {
                    numNear++;
                } else if (zone === 0) {
                    numNone++;
                } else { //far
                    numFar++;
                }
            } else {
                zone = classifyZone(objs[i].y);
                if (zone === 1) {
                    numNear++;
                } else if (zone === 0) {
                    numNone++;
                } else { //far
                    numFar++;
                }
            }
        }

        let timeSum = 0;
        let numTimes = 0;
        for (let j = 1; j < times.length; j++) {
            timeSum += (times[j] - times[j - 1]) / 1000;
            numTimes++;
        }
        return {
            avgScoreTime: timeSum / numTimes,
            percentNear: numNear / (numNone + numNear + numFar) * 100,
            percentFar: numFar / (numNone + numNear + numFar) * 100,
            percentNone: numNone / (numNone + numNear + numFar)*100,
            numScores: numNone + numNear + numFar
        }
    }
}

let sq = db.ref("scoutingFormQueue");

//from MDN - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
function round(number, precision) {
    let factor = Math.pow(10, precision);
    let tempNumber = number * factor;
    let roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
}

function getPropOrNone(object,prop,attribute) {
    try {
        if (typeof object[prop][attribute] === "undefined") {
            return "none";
        }
        return object[prop][attribute];
    } catch(error) {
        return "none";
    }
}

function checkPropForUnknown(value) {
    if (value.toString().toLowerCase().indexOf("unknown") >= 0) {
        return true;
    }
    return false;
}

function getMinValue(currentTeamData, prop, scoutingInfo) {
    oldValue = getPropOrNone(currentTeamData, prop, "min");
    newValue = checkPropForUnknown(scoutingInfo[prop]) ? "none" : parseInt(scoutingInfo[prop]);
    console.log("old, new value for", prop, "(min):", oldValue, newValue);
    if (oldValue === "none" && newValue !== "none") {
        return newValue;
    } else if (newValue !== "none") {
        if (newValue < oldValue) {
            return newValue;
        } else {
            return oldValue;
        }
    }
    return null;
}

function getMaxValue(currentTeamData, prop, scoutingInfo) {
    oldValue = getPropOrNone(currentTeamData, prop, "max");
    newValue = checkPropForUnknown(scoutingInfo[prop]) ? "none" : parseInt(scoutingInfo[prop]);
    console.log("old, new value for", prop, "(max):", oldValue, newValue);
    if (oldValue === "none" && newValue !== "none") {
        return newValue;
    } else if (newValue !== "none") {
        if (newValue > oldValue) {
            return newValue;
        } else {
            return oldValue;
        }
    }
    return null;
}

let formQueue = new Queue(sq,scoutingFormSubmissions, (data,progress,resolve,reject) => {
    console.log("is this file doing anything even");
    console.log("running formqueue");
    let tournamentId = data.tournament;
    let orgId = data.org;
    let scoutingInfo = data.formResponses;
    let result = {};

    //describes accumulation required for fields on the scouting form
    /*
    * Each item in props is an expected property of the object sent to the server queue
    * by the scouting form.
    *
    * The accumulate property of each of the properties in props tells the server how to combine past and new data.
    * Min means that the server will output the lowest numerical value present for that field.
    * Max means that the server will output the highest numerical value present for that field.
    * Average means that the server will compute the mean value for the field.  This also adds a "count" property to allow
    *      future calculation of the average based on the current average.
    * Append is for string values, and will create a new string combining the latest text from the scouting form with the previous
    *      submitted text for the field.  If uniqueOnly is true, then the new string will only be added if it is not already present in the
    *      old string.
    * Count means that the server will count how many times a value occurs in a string.
    * None means that only the new value submitted will be saved and will overwrite the previously saved value.
    * Numerical fields will be checked for "Unknown."  If the value is "Unknown," the old server value, if any, will be used.
    *      If the value is not "Unknown," the value will be converted to an integer.
    */
    let props = {
        starsAverage: {
            accumulate: ["average"]
        },
        starsMax:{
          accumulate: ["max"]
        },
        cubesAverage: {
            accumulate: ["average"]
        },
        cubesMax: {
            accumulate: ["max"]
        },
        autonPlay: {
            accumulate: ["append"],
            uniqueOnly: true
        },
        hang: {
            accumulate: ["append"]
        },
        sturdiness: {
            accumulate: ["count"]
        },
        dropsObjects: {
            accumulate: ["count"]
        },
        lastScouted: {
            accumulate: ["none"]
        },
        scoredObjs: {
            accumulate: ["special-scoredObj"]
        },
        scoringDevices: {
            accumulate: ["append"],
            uniqueOnly: true
        },
        strafes: {
            accumulate: ["none"]
        },
        Team: {
            accumulate: ["none"]
        },
        autonSwing: {
            accumulate: ["min","max","average"]
        },
        autonStartTime: {
            accumulate: ["min","max","average"]
        }
    };
    console.log(tournamentId,orgId,scoutingInfo);
    //get scouting info for this team, if it exists
    fbQueue.database().ref("scouting/" + orgId + "/" + tournamentId + "/" + scoutingInfo.Team).once("value").then(function (snapshot) {
        let currentTeamData = snapshot.val();
        console.log("currentTeamData",currentTeamData);

        for (let prop in scoutingInfo) {
            if (scoutingInfo.hasOwnProperty(prop)) {
                console.log("now processing", prop);
                console.log("looping through accumulates requested");
                let currAccumulate;
                let oldValue, newValue;
                result[prop] = {};
                for (let i = 0; i < props[prop].accumulate.length; i++) {
                    currAccumulate = props[prop].accumulate[i];
                    console.log("processing accumulate", currAccumulate);
                    if (currAccumulate === "min") {
                        result[prop].min = getMinValue(currentTeamData, prop, scoutingInfo);
                    } else if (currAccumulate === "max") {
                        result[prop].max = getMaxValue(currentTeamData,prop,scoutingInfo);
                    }
                }
            }
        }
        return result;

    }).then((result) => {
        console.log("result",result);
        return fbQueue.database().ref("scouting/" + orgId + "/" + tournamentId + "/" + scoutingInfo.Team).set(result);
    }).then(resolve)
        .catch((e) => console.error("server error:",e.code,":",e.message));

});

var queue = new Queue(q, options, function(data, progress, resolve, reject) {
    let sku = data.sku;
    let tournamentID = data.tournament;
    console.log("running process skills");
    processSkills(sku,progress, tournamentID).then(resolve);

});
