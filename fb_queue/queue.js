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
        //console.log("object",object[prop][attribute]);
        if (typeof object[prop] !== "object" || object[prop] == null || checkPropForUnknown(object[prop])) {
            console.log("inside first branch of if statement");
            return "none";
        } else if (typeof object[prop][attribute] === "undefined") {
            return "none";
        }
        return object[prop][attribute];
    } catch(e) { return "none"; }

/*    try {
        if (typeof object[prop][attribute] === "undefined") {
            return "none";
        }
        return object[prop][attribute];
    } catch(error) {
        return "none";
    }*/
}

function checkPropForUnknown(value) {
    return value.toString().toLowerCase().indexOf("unknown") >= 0;
}

function getMinValue(currentTeamData, prop, scoutingInfo,noCurrentTeamData) {
    let oldValue = "none";
    if (!noCurrentTeamData) {
        oldValue = getPropOrNone(currentTeamData, prop, "min");
    }
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

function getMaxValue(currentTeamData, prop, scoutingInfo, noCurrentTeamData) {
    let oldValue = "none";
    if (!noCurrentTeamData) {
        console.log("getting old value");
        oldValue = getPropOrNone(currentTeamData, prop, "max");
        //console.log("currentteamdata,prop,max,values", currentTeamData, prop, "max", currentTeamData[prop], currentTeamData[prop].max, oldValue);
    }
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

function getNewAverage(currentTeamData,prop,scoutingInfo,noCurrentTeamData) {
    let oldAverage = "none", oldCount = "none";
    if (!noCurrentTeamData) {
        oldAverage = getPropOrNone(currentTeamData, prop, "average");
        console.log("oldaverage", oldAverage);}
    let newValue = checkPropForUnknown(scoutingInfo[prop]) ? "none" : parseInt(scoutingInfo[prop]);
    console.log("oldavg,oldct,newavg", oldAverage.average, oldAverage.count, newValue);
    let count, average;
    if (noCurrentTeamData) { //the old value isn't a number
        count = 1;
        if (typeof newValue === "number") {
            return {average: newValue,
                    count: count };
        }
    } else if (typeof oldAverage.average === "number" && typeof oldAverage.count === "number") {
        if (oldAverage.count >= 1) {
            count = oldAverage.count + 1;
            if (typeof newValue === "number") {
                return { average: (newValue + oldAverage.average * oldAverage.count) / count,
                    count: count};
            }
        }

    }
    /*    console.log("old, new value for", prop, "(max):", oldValue, newValue);
     if (oldValue === "none" && newValue !== "none") {
     return newValue;
     } else if (newValue !== "none") {
     if (newValue > oldValue) {
     return newValue;
     } else {
     return oldValue;
     }
     }*/
    return null;
}

function getCounts(currentTeamData,prop,scoutingInfo,noCurrentTeamData) {
    let oldData = "none";
    if (!noCurrentTeamData) {
        oldData = currentTeamData[prop];
        if (typeof oldData === "undefined") {
            oldData = "none";
        }
        console.log("olddata is",oldData);
    }
    let newData = checkPropForUnknown(scoutingInfo[prop]) ? "none" : scoutingInfo[prop];
    console.log("newData is",newData);
    let split = newData.split(", ");
    console.log("newData split is",split);
    let result = {};
    if (oldData === "none" && newData !== "none") {
        for (let i = 0; i < split.length; i++) {
            result[split[i]] = 1;
        }
        return result;
    } else if (newData !== "none") {
        let elem,
            oldObjectKeys = Object.keys(oldData);
        result = currentTeamData[prop];
        for (let i = 0; i < split.length; i++) {
            elem = split[i];
            if (oldObjectKeys.indexOf(elem) >= 0) {
                result[elem] += 1;
            } else {
                result[elem] = 1;
            }
        }
        return result;
    }

    return null;
}

function getAppend(currentTeamData,prop,scoutingInfo,noCurrentTeamData,uniqueValsOnly) {
    let currentVal = "";
    if (!noCurrentTeamData) {
        currentVal = currentTeamData[prop];
        if (typeof currentVal === "undefined" || currentVal == null) {
            currentVal = "";
        }
    }
    let newVal = checkPropForUnknown(scoutingInfo[prop]) ? "none" : scoutingInfo[prop];
    if (!uniqueValsOnly || currentVal.indexOf(newVal) === -1) {
        currentVal += ", " + newVal;
        return currentVal;
    }

    return null;

}

function getScoredObjAnalysis(currentTeamData,prop,scoutingInfo,noCurrentTeamData) {
    let result;
    let output = "";
    if (typeof scoutingInfo[prop] === "object") {
        result = parseScoredObjs(scoutingInfo[prop]);
    }
    console.log(result);
    let currentVal = "";
    if (!noCurrentTeamData) {
        currentVal = currentTeamData[prop];
        if (typeof currentVal === "undefined" || currentVal == null) {
            currentVal = "";
        } else if (checkPropForUnknown(currentVal)) {
            currentVal = "";
        }
    }
    if (currentVal.length > 0) {
        currentVal += " | ";
    }
    console.log(currentVal);
    if (typeof result !== "number") {
        let pctNear = result.percentNear,
            pctFar = result.percentFar,
            cycleTime = result.avgScoreTime,
            num = result.numScores;
        return currentVal + `${round(cycleTime,1)}: ${round(pctNear,1)}% near, ${round(pctFar,1)}% far (${num})`; //4.2s: "45.2% near, 25.2% far (20)

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
            accumulate: ["append"],
            uniqueOnly: false
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
            accumulate: ["count"]
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
        let noCurrentTeamData = currentTeamData == null;
        for (let prop in scoutingInfo) {
            if (scoutingInfo.hasOwnProperty(prop)) {
                console.log("now processing", prop);
                let currAccumulate;
                let oldValue, newValue;
                result[prop] = {};
                for (let i = 0; i < props[prop].accumulate.length; i++) {
                    currAccumulate = props[prop].accumulate[i];
                    if (checkPropForUnknown(scoutingInfo[prop])) { //if the value is unknown, skip it
                        continue;
                    }
                    console.log("processing accumulate", currAccumulate);
                    if (currAccumulate === "min") {
                        result[prop].min = getMinValue(currentTeamData, prop, scoutingInfo,noCurrentTeamData);
                    } else if (currAccumulate === "max") {
                        result[prop].max = getMaxValue(currentTeamData,prop,scoutingInfo,noCurrentTeamData);
                    } else if (currAccumulate === "average") {
                        result[prop].average = getNewAverage(currentTeamData,prop,scoutingInfo,noCurrentTeamData);
                    } else if (currAccumulate === "none") {
                        if (!checkPropForUnknown(scoutingInfo[prop])) {
                            result[prop] = scoutingInfo[prop];
                        }
                    } else if (currAccumulate === "count") {
                        result[prop] = getCounts(currentTeamData,prop,scoutingInfo,noCurrentTeamData);
                    } else if (currAccumulate === "append") {
                        result[prop]= getAppend(currentTeamData,prop,scoutingInfo,noCurrentTeamData,props[prop].uniqueOnly);
                    } else if (currAccumulate === "special-scoredObj") {
                        result[prop] = getScoredObjAnalysis(currentTeamData,prop,scoutingInfo,noCurrentTeamData);
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
