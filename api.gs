function getBool(value) {
  if (typeof value !== "undefined") {
    return true;
  } else {
    return false;
  }
}

function doGet(e) {
  var requestType = e.parameter.type;
  var returnVal;
  Logger.log(requestType);
  var noRefresh = getBool(e.parameter.norefresh);
  //var offline = getBool(e.parameter.offline);
  if (requestType === "checkAuth") {
    var sideNote = "",
        showId = "",
        setupNote = "",
        passedId = (typeof e.parameter.id !== "undefined") ? e.parameter.id : "";
    if ((passedId !== "") && (passedId.length > 44 || passedId.length < 44 || passedId.indexOf("%20") >= 0)) { //checked IDs of 4 Google Sheets (including one created a few years ago) and all had IDs that were 44 characters long and had no spaces (in the form of %20)
      sideNote = "<br /><br /><em style='font-size: 14px;'>An ID for a WA Robotics Scout instance was passed but is not being shown because it looks invalid (incorrect length or includes spaces).  To avoid this error, use the WA Robotics Scout add-on in your spreadsheet and go to the URL supplied at the end of the setup wizard.</em>";
    } else {
      showId = (passedId !== "") ? "?id=" + e.parameter.id : "";
      setupNote = "(this will also set it up for your next tournament) ";
    }
    var urlString = "https://script.google.com/macros/s/AKfycbzjo4-KCrLdrFOcpJCwg3kwWYenjFyV8C6aAxfVZs4/exec" + showId;
    return HtmlService.createHtmlOutput("<p style='font-family: Roboto, Helvetica, sans-serif;'><strong>You've successfully authorized WA Robotics Scout</strong> to access your Google Acccount, but <strong>there's still one more step</strong>! To make sure WA Robotics Scout Web works for you at the next tournament, please follow the link to authorize WA Robotics Scout Web, then follow the prompts: <a target='_blank' href='" + urlString + "'>Authorize WA Robotics Scout Web</a>" + sideNote + "</p>")
    .setFaviconUrl("https://wa-robotics-scout-web-assets.firebaseapp.com/favicon.ico")
    .setTitle("WA Robotics Scout Authorized");
  }
  
  switch (requestType) {
    case "getTeamMatches":
      if (!noRefresh) {
        pullMatchData(e.parameter.id); //refresh match data
      }
        returnVal = { status: 1, results: getTeamMatches(e) };
        break;
    case "getTeamInfo":
      if (!noRefresh) { //allow for a parameter to prevent data refresh, for instances where multiple back-to-back refreshes are not necessary
        pullTeamData(e.parameter.id); //refresh team data
      }
      returnVal = { status: 1, results: getTeamInfo(e,e.parameter.team) };
      break;
    case "getMatchInfo":
      if (!noRefresh) {
        pullMatchData(e.parameter.id);
      }
      returnVal = { status: 1, results: getMatchInfo(e) };
      break;
    case "getTeamInfoForMatch":
      if(!noRefresh) {
        pullMatchData(e.parameter.id);
        pullTeamData(e.parameter.id);
      }
      returnVal = { status: 1, results: getTeamInfoForMatch(e) };
      break;
    case "getUnscoredMatchInfo":
      if (!noRefresh) {
        pullMatchData(e.parameter.id);
      }
      returnVal = { status: 1, results: getUnscoredMatches(e) };
      break;
    default:
      returnVal = { status: 0, error: {code: 100, message: "Invalid request type specified.  Check API docs."}, result: [] };
  }
  
  return ContentService.createTextOutput(e.parameter.prefix + "(" + JSON.stringify(returnVal) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getTeamMatches(e) {
  var matchesRawData = [];
  var matches = [];
  matchesRawData.push(getRows("DB_MATCHES",{ blue1: e.parameter.team }, "data", e.parameter.id));
  matchesRawData.push(getRows("DB_MATCHES",{ blue2: e.parameter.team }, "data", e.parameter.id));
  matchesRawData.push(getRows("DB_MATCHES",{ blue3: e.parameter.team }, "data", e.parameter.id));
  matchesRawData.push(getRows("DB_MATCHES",{ red1: e.parameter.team }, "data", e.parameter.id));
  matchesRawData.push(getRows("DB_MATCHES",{ red2: e.parameter.team }, "data", e.parameter.id));
  matchesRawData.push(getRows("DB_MATCHES",{ red3: e.parameter.team }, "data", e.parameter.id));
    
    
    //matchesRawData ends up being a 2D array full of the results of the getRows searches.  Now, create one array full of the getRows results
    for(var k = 0; k < matchesRawData.length; k++) {
      for(var l = 0; l < matchesRawData[k].length; l++) {
        matches.push(matchesRawData[k][l]);
      }
    }
   
   matches.sort(function (a,b) {
     return a.round - b.round || a.instance - b.instance || a.matchnumber - b.matchnumber; //this will sort by round, then by instance, then by matchnumber, because the return statement will move on to the next OR if a.property - b.property = 0
   });
   
 return matches;
}

//this object is used to map database columns to display names for WARS Web
var propNameMap = {
  "timestamp":"Submitted",
  "match": "Match",
  "team": "Team",
  "alliance":"Alliance in scouted match",
  "autonstarttime": "Autonomous play starts",
  "autonpointsscored":"Points scored in auton.",
  "autonactions": "Auton. actions",
  "robottype": "Scoring method",
  "strafes": "Can strafe",
  "scoredobjects": "Scoring locations",
  "dchangstart": "Starts hanging at",
  "dchangtime": "Time to hang",
  "dchangassistance": "Requires partner to hang",
  "dchangresult":"Hang result"
}

/**
* @param e The parameters supplied with the GET request
* @param searchTeam An optional parameter to search for a team other than the one given with the request
* @return Information contained in the teams database about this team
**/
function getTeamInfo(e, searchTeam) {
  var result,
      teamInfo,
      teamInfoRaw,
      scoutInfo;
  if (searchTeam) {
    teamInfoRaw = getRows("DB_TEAMS", { team: searchTeam }, "data", e.parameter.id);
    Logger.log("teamInfoRaw = " + teamInfoRaw[teamInfoRaw.length - 1]);
    if (teamInfoRaw === -1) {
      teamInfo = "";
    } else {
      teamInfo = teamInfoRaw[teamInfoRaw.length - 1];
    }
    //searchTeam = (searchTeam.search(/([a-zA-Z])/) == -1) ? parseInt(searchTeam): searchTeam; //make searchTeam an integer if there are no letters in its name so that a corresponding row will be found in the scouting form responses spreadsheet
    scoutInfo = getRows("DB_SCOUTING_FORM_RESPONSES", { team: searchTeam }, "data", e.parameter.id);
    if (scoutInfo === -1) {
      result = {status:"No data available",team:searchTeam};
    } else {
      var testInfo = scoutInfo[scoutInfo.length - 1]; //just take the last result for now
      if (teamInfo === "") {
        result = { team: searchTeam, data: [] };
      } else {
        Logger.log("teamInfo = " + teamInfo);
        result = {
          team: searchTeam,
          data: [{
            propName: "Rank",
            value: teamInfo.rank
            }, {
            propName: "OPR",
            value: teamInfo.opr
            },
            { propName: "DPR",
              value: teamInfo.dpr
            },
            { propName: "CCWM",
              value: teamInfo.ccwm
            },
            { propName: "W-L-T",
              value: teamInfo.wins + "-" + teamInfo.losses + "-" + teamInfo.ties
            },
            { propName: "WP",
              value: teamInfo.wp
            },
            { propName: "SP",
              value: teamInfo.sp
            }]
        };
      }
      //skip timestamp entry
      for (var i in testInfo) {
        var val = {};
        val.propName = propNameMap[i];
        if (i === "scoredobjects" || i === "dchangend" || i === "team") { //scouting form entries that we don't want to display
          continue;
        }
        val.value = testInfo[i];
        result.data.push(val);
      }
    }
    Logger.log(typeof searchTeam);
    Logger.log(typeof searchTeam.toString());
  } else {
    result = getRows("DB_TEAMS", { team: e.parameter.team }, "data", e.parameter.id)[0];
  }
  return result;
}

function getUnscoredMatches(e) {
  var result = getRows("DB_MATCHES", { scored: 0 }, "data", e.parameter.id, parseInt(e.parameter.numMatches));

  return result;
}

function getMatchInfo(e) {
  var result = getRows("DB_MATCHES", { matchnumber: parseInt(e.parameter.match) } , "data", e.parameter.id);
  if (result.length >= 1) {
    return result[0];
  } else {
    return -1;
  }
}

function getTeamInfoForMatch(e) {
  var matchInfo = getMatchInfo(e); //get info for this match, which will include the teams in this match
  return [{position:"red1",result:getTeamInfo(e,matchInfo.red1)},{position:"red2",result:getTeamInfo(e,matchInfo.red2)},
  {position:"blue1",result:getTeamInfo(e,matchInfo.blue1)},{position:"blue2",result:getTeamInfo(e,matchInfo.blue2)}];
}