/**
 * Create add-on menu
 *
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
                .createAddonMenu()
                .addItem('Settings', 'showSettings')
                .addItem('Setup scouts', 'setupScouts')
                .addSeparator()
                .addItem('Refresh match data', 'pullMatchData')
                .addItem('Refresh team data','pullTeamData')
                .addItem('Get high skills scores', 'getHighSkillsScores')
                .addToUi();
      
 
}

/**
 * Runs when the add-on is installed; calls onOpen() to ensure menu creation and
 * any other initializion work is done immediately.
 *
 * @param {Object} e The event parameter for a simple onInstall trigger.
 */
function onInstall(e) {
  onOpen(e);
  var ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
  savePrefs("spreadsheetid",ssId);
}

/**
 * Opens a sidebar. The sidebar structure is described in the Sidebar.html
 * project file.
 */
function showSidebar() {
  var ui = HtmlService.createTemplateFromFile('Sidebar')
      .evaluate()
      .setTitle(SIDEBAR_TITLE)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showSidebar(ui);
}

/**
 * Opens the Settings dialog.
 */
function showSettings() {
  var ui = HtmlService.createTemplateFromFile('Dialog')
      .evaluate()
      .setWidth(500)
      .setHeight(505)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showModalDialog(ui, "Settings");
}

/**
*
*
*/
function setupScouts() {
  var ui = HtmlService.createTemplateFromFile('ScoutSetup')
                      .evaluate()
                      .setWidth(500)
                      .setHeight(500)
                      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showModalDialog(ui, "Setup scouts");
}

/**
*
*
*
*/
function saveScoutData(goodScoutData, goodTeamData) {
  Logger.log(goodScoutData);
  Logger.log(goodTeamData);
  //process data
  createDatabase("DB_SCOUTS",true,["name","email","team"]);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scoutSheet = ss.getSheetByName("DB_SCOUTS");
  for (var i = 0; i < goodScoutData.length; i++) {
    scoutSheet.appendRow(goodScoutData[i]);
    Logger.log(goodScoutData[i]);
  }

  pullTeamData(); //refresh team data
  for (i = 0; i < goodTeamData.length; i++) {
    editRow("DB_TEAMS",{ team: getStandardizedTeamName(goodTeamData[i]) }, { highinterest: "true" }); //save highinterest as "true" to ensure it gets added to the spreadsheet.  After being added, the value should be stored as a boolean
    Logger.log(getStandardizedTeamName(goodTeamData[i]));
  }
  
  var highInterestTeams = getRows("DB_TEAMS", { highinterest: true }, "data") //highinterest is no longer a string after being converted into a boolean when added to the spreadsheet
  
  //pullMatchData(); //refresh match data
  
  //get match constraints for each team member.  No matches 15 min before or 5 min after a team member's match, which is about 4 matches before and 1 match after
  var teamScoutsSheet = ss.getSheetByName("DB_SCOUTS"),
      rowData,
      teamScoutSheetRows = getDatabaseSize("DB_SCOUTS")[0];
  var teamScoutInfo = [];
  var ourTeams = []; //teams that are ours, as indicated by scout info
  var matchesRawData = [];
  var matches = [];
  var badMatchRanges = [];
  for (i = 0; i < teamScoutSheetRows - 1; i++) {
    rowData = getRow("DB_SCOUTS",i,"data");
    Logger.log(getRow("DB_SCOUTS",i,"data"));
    Logger.log("Row data " + rowData.team);
    ourTeams.push(getStandardizedTeamName(rowData.team));
    //get all possible matches for this team
    Logger.log("getsRows  " + getRows("DB_MATCHES",{ blue1: rowData.team }, "data"));
    matchesRawData.push(getRows("DB_MATCHES",{ blue1: rowData.team }, "data"));
    matchesRawData.push(getRows("DB_MATCHES",{ blue2: rowData.team }, "data"));
    matchesRawData.push(getRows("DB_MATCHES",{ red1: rowData.team }, "data"));
    matchesRawData.push(getRows("DB_MATCHES",{ red2: rowData.team }, "data"));
    
    
    //matchesRawData ends up being a 2D array full of the results of the getRows searches.  Now, create one array full of the getRows results
    for(var k = 0; k < matchesRawData.length; k++) {
      for(var l = 0; l < matchesRawData[k].length; l++) {
        matches.push(matchesRawData[k][l]);
      }
    }
    Logger.log(matchesRawData + " = matches raw data");
    Logger.log("matches " + matches);
    Logger.log(getRows("DB_MATCHES",{ blue1: rowData.team }, "data"));
    for (var j = 0; j < matches.length; j++) {
        badMatchRanges.push([matches[j].matchnumber-4, matches[j].matchnumber+1]);
    }
    teamScoutInfo.push({"name": rowData.name, "email": rowData.email, "team": rowData.team, "badMatchRanges": badMatchRanges });
    badMatchRanges = [];
    matchesRawData = [];
    matches = [];
  }
  var matchInfo; //information about the match we're looking at
  var matchHITeams = [0,0,0,0]; //high-interest teams
  var matchHITeamNums = []; //this stores the actual team numbers for later use; right now, it seems like it'd be better to keep this separate to maintain the simplicity of the alliance bonus calculation
  var numMatchHITeams = 0;
  var matchNumAvailScouts = 0; //number of scouts who are predicted to be able to watch a match
  var scoutOKForMatch = true;
  var matchImportanceRating;
  var allianceBonus = 0;
  var idealNumScouts; //ideal number of scouts that can attend a match
  var ineligibleMatch = false; //if no scouts can watch this match; this prevents all future match importance ratings from being 0 after the first match with a match importance rating of 0
  var matchImportanceRatingSum = 0;
  var matchImportanceRatingTerms = 0;
  var mirPossibilities = [];
  var found = false;
  var averageMIR; //average match importance rating
  //loop through each match and compute a Match Importance Rating to create rankings
  for (i = 0; i < getDatabaseSize("DB_MATCHES")[0] - 1; i++) {
    matchInfo = getRow("DB_MATCHES",i, "data"); //get match info
    Logger.log(matchInfo + " match info");
      for (j = 0; j < highInterestTeams.length; j++) { //determine how many high-interest teams are competing in this match
        if (getStandardizedTeamName(matchInfo.blue1) === getStandardizedTeamName(highInterestTeams[j].team)) {
          matchHITeams[0] = 1;
          
          //this is valid because we're checking to see if a team in any spot of any alliance in this match is among the high-interest teams; if so, then we know we have a high-interest team for this match
          matchHITeamNums.push(matchInfo.blue1); //since the data in the matchHITeamNums array will not be comapared against anything, we don't need to standardize the values - a number or a string will be equally fine
        }
        if (getStandardizedTeamName(matchInfo.blue2) === getStandardizedTeamName(highInterestTeams[j].team)) {
           matchHITeams[1] = 1;
           matchHITeamNums.push(matchInfo.blue2); //since the data in the matchHITeamNums array will not be comapared against anything, we don't need to standardize the values - a number or a string will be equally fine
        }
        if (getStandardizedTeamName(matchInfo.red1) === getStandardizedTeamName(highInterestTeams[j].team)) {
           matchHITeams[2] = 2; 
           matchHITeamNums.push(matchInfo.red1); //since the data in the matchHITeamNums array will not be comapared against anything, we don't need to standardize the values - a number or a string will be equally fine
        }
        if (getStandardizedTeamName(matchInfo.red2) === getStandardizedTeamName(highInterestTeams[j].team)) {
           matchHITeams[3] = 2; 
           matchHITeamNums.push(matchInfo.red2); //since the data in the matchHITeamNums array will not be comapared against anything, we don't need to standardize the values - a number or a string will be equally fine
        }
      }
              //now, matchHITeams will contain 1s and 2s to indicate high-interest teams.  For example, if there were two blue high-interst teams and two red high-interest teams, matchHITeams will be [1,1,2,2].  Array indices 0 and 1, and 1 and 2, can be compared for the same value to determine the alliance bonus
        if (matchHITeams[0] === matchHITeams[1] && matchHITeams[0] !== 0 && matchHITeams[1] !== 0) { //blue alliance bonus
          allianceBonus++;
        }
        if (matchHITeams[2] === matchHITeams[3] && matchHITeams[2] !== 0 && matchHITeams[3] !== 0) { //blue alliance bonus
          allianceBonus++;
        }
      
      //determine number of scouts who could watch this match by looping through the array of scouts and verifying that this match is not within any of their badMatchRanges
      for(j = 0; j < teamScoutInfo.length; j++) {
        for(k = 0; k < teamScoutInfo[j].badMatchRanges.length; k++) {
          //current match number is i + 1
          if ((i + 1) >= teamScoutInfo[j].badMatchRanges[k][0] && i + 1 <= teamScoutInfo[j].badMatchRanges[k][1]) { //if this match is within one of this team member's badMatchRanges...
            scoutOKForMatch = false; //...record that the scout can't watch this match
            break; //no need to continue check badMatchRanges
          }
        }
        if(scoutOKForMatch) { //if this match wasn't in the scout's badMatchRanges, record that
          matchNumAvailScouts++;
        } else { //scoutOKForMatch is false
          scoutOKForMatch = true; //reset scoutOKForMatch
        }
      }
      
      //calculate number of high-interest teams
      for (var l = 0; l < matchHITeams.length; l++) {
        if(matchHITeams[l] === 1 || matchHITeams[l] === 2) {
          numMatchHITeams++;
        }
      }
      
      //calculate Match Importance Rating
      if (matchNumAvailScouts === 0 || numMatchHITeams === 0) {
        ineligibleMatch = true;
      } else if (numMatchHITeams === 1) {
        idealNumScouts = .5; //the number of scouts wanted would be 0 otherwise (1 - 1), so take half.  This also gives a slight bonus to matches with 1 high-interest team
      } else { //numMatchHITeans is greater than 1, so there won't be any division by 0
        idealNumScouts = numMatchHITeams - 1;
      }
      matchImportanceRating = (ineligibleMatch) ? 0 : numMatchHITeams + allianceBonus + matchNumAvailScouts/idealNumScouts; //give a match important rating of 0 if no scouts can watch it
      
      //record the Match Importance Rating
      editRow("DB_MATCHES", { matchnumber: i + 1 }, { matchimportancerating: matchImportanceRating });
      //record this match importance rating only if it hasn't already been recorded
      for (var m = 0; m < mirPossibilities.length; m++) {
        if (mirPossibilities[m] === matchImportanceRating) {
          found = true;
        }
      }
      
      if(!found) {
        mirPossibilities.push(matchImportanceRating);
      }
      matches.push({matchnum:i+1,mir:matchImportanceRating,importance:null,HITeams:matchHITeamNums});
      
      Logger.log("Match importance rating: " + matchImportanceRating);
      
      //below two lines used to determine relative importance of a matching in a more general manner (e.g., above average importance, average importance, below average importance)
      matchImportanceRatingSum += matchImportanceRating;
      matchImportanceRatingTerms++;
      
      //reset variables
      matchHITeams = [0,0,0,0]; //high-interest teams
      matchHITeamNums = []; //high-interest team numbers
      numMatchHITeams = 0;
      idealNumScouts = 0;
      matchNumAvailScouts = 0; //number of scouts who are predicted to be able to watch a match
      scoutOKForMatch = true;
      allianceBonus = 0;
      ineligibleMatch = false;
      found = false;

  }
  Logger.log(teamScoutInfo);
  var maxMIR = mirPossibilities[0];
  for (i = 1; i < mirPossibilities.length; i++) {
    if (mirPossibilities[i] > maxMIR) {
      maxMIR = mirPossibilities[i];
    }
  }
  
  //divide the highest MIR by 4 to get the MIR steps that will define the relative importance of matches
  //loop through each match and check it's MIR, then add it to the text for an email
  Logger.log(mirPossibilities);
  var emailMustSeeMatches = "";
  var emailOtherMatches = ""; //matches that are "must-see" but that might also be worth watching
  var emailNoSeeMatches = ""; //matches that no one will be able to see
  var mirPossibilitiesLength = mirPossibilities.length;
  var HITeamsToWatch = ""; //stores the stringified version of the high-interest teams for a match
  var HITeamsListLength; //store the length of the HI team list array for a match because we use it multiple times
  var plural = "";
  
  //importance is defined on a scale as follows (these generalized values make interpreting match importance ratings easier):
  //2 - it'll be easy to watch these matches, or if not, make an effort to watch these matches
  //1 - if you have downtime and there's no "2" match to watch, watch one of these matches
  //0 - it doesn't look like anyone will be able to see this match or there are no teams you're interested in seeing in this match
  for (i = 0; i < matches.length; i++) {
     if(matches[i].mir === maxMIR) {
       matches[i].importance = 2;
     } else if(matches[i].mir > 0) {
       matches[i].importance = 1;
     } else {
       matches[i].importance = 0;
     }
     
     HITeamsListLength = matches[i].HITeams.length;
     if(HITeamsListLength > 0) {
     //parse the HI teams list for this match and stringify it
       for (var j = 0; j < HITeamsListLength; j++) {
         if (HITeamsListLength - j > 1) { //if this isn't the last element in the array, add a comma after it
             HITeamsToWatch += matches[i].HITeams[j] + ", ";
         } else { //this is the last element of the array, so don't add a comma after it
             HITeamsToWatch += matches[i].HITeams[j];
         }
       }
     } else {
       HITeamsToWatch = "none";
     }
     switch (matches[i].importance) {
       case 2:
         plural = (matches[i].HITeams.length === 1) ? "" : "s";
         emailMustSeeMatches += "Q" + (i + 1) + ": team" + plural + " " + HITeamsToWatch + "\n";
         break;
       case 1:
         plural = (matches[i].HITeams.length === 1) ? "" : "s";
         emailOtherMatches += "Q" + (i + 1) + ": team" + plural + " " + HITeamsToWatch + "\n";
         break;
       case 0:
         emailNoSeeMatches += "Q" + (i + 1) + "\n";
     }
     
     //reset variables
     HITeamsToWatch = "";
     plural = "";
  }
  
  //parse the match data to create an email
  var email = "Hi and happy winter break; this is Evan.  You may disregard this TEST email from WA Robotics Scout.  I'm just making sure a cool new feature is working - more details when we get back from break.  :) \n\n  Make time to watch these matches:\n" + emailMustSeeMatches + "\n\nExtra time?  See if you can watch one of these matches:\n" + emailOtherMatches + "\n\nFor these remaining matches, either: 1) based on what you told WARS, it doesn't look like they'll be interesting, or 2) WARS doesn't think anyone on the team will be able to watch these matches:\n" + emailNoSeeMatches;
  var emailAddresses = "";
  var currentEditors = ss.getEditors();
  for (i = 0; i < currentEditors.length; i++) { 
    if (currentEditors.length - i > 1) { //if this isn't the last element in the array, add a comma after it
      emailAddresses += currentEditors[i] + ", ";
    } else {
      emailAddresses += currentEditors[i];
    }
  }
  
  Logger.log(email);
  Logger.log(emailAddresses);
  MailApp.sendEmail({to:"evan.strat@gmail.com", subject:"WA Robotics Scout Important Matches - TESTING ONLY",body: email, cc:emailAddresses});
}

/**
* Change the mode
* @param newMode The new mode to change to.  Valid values: "pre-tournament" - pre-tournament configuration; "tournament" - during practice and qualification rounds of a tournament;
*                                                          "data analysis" - right before alliance selection; "post-tournament" - stop functions
*/
function changeMode(newMode) {
  //testing
  /*newMode = "tournament";*/
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var oldMode = getRow("DB_SETTINGS", {key: "mode"}, "data");
  if (oldMode.value !== newMode && (newMode === "pre-tournament"
                                    || newMode === "tournament"
                                    || newMode === "pre-elimination"
                                    || newMode === "post-tournament")) { //only change the mode if it's different
    savePrefs("mode",newMode);
    if (newMode === "tournament") {
      //create forms
      createScoutingForm();
      createInterviewForm();
      
      //create triggers
      ScriptApp.newTrigger("pullMatchData")
      .timeBased()
      .everyHours(1)
      .create();
      
      ScriptApp.newTrigger("onFormSubmit")
        .forSpreadsheet(ss)
        .onFormSubmit()
        .create();
    }
  }
}

/**
* Query RobotEvents API to get match data
* Deprecated and replaced with pullMatchData()
*/
/*function getMatchData() {
  createDatabase("DB_MATCHES",true,["matchnumber","red1","red2","blue1","blue2",
                                    "redscore","bluescore","dqteams","noshowteams","r1emc","r2emc","b1emc","b2emc"]); //make the database if we need to
                                    
  //query the RobotEvents API
  var sku = getRow("DB_SETTINGS", { key: "roboteventssku" }, "data").value; //get the event sku from the settings database
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DB_MATCHES");
  if (sku === -1 || sku === "") { //throw an error if no SKU is set
    ui.alert("Event SKU not set",
                                 "You're trying to pull match data, but you haven't given the event SKU from RobotEvents yet in settings.  Find your event's SKU on robotevents.com, then copy and paste it in the RobotEvents SKU field in Settings.",
                                 ui.ButtonSet.OK);
  }
  var url = "http://api.vex.us.nallen.me/get_matches?sku=" + sku + "&round=2";
  var requestResult = UrlFetchApp.fetch(url).getContentText(); //get results of request
  var formattedResult = JSON.parse(requestResult); //parse the request to create a JSON object
  var results = formattedResult.result;
  results[7].redscore = 1000000;
  for (var i = 0; i < formattedResult.size; i++) {
    sheet.appendRow();
  }
}*/

/**
* Update the currently loaded match data
* Deprecated and replaced with pullMatchData()
*/
/*function updateMatchData() {
  var sku = getRow("DB_SETTINGS", { key: "roboteventssku" }, "data").value; //get the event sku from the settings database
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DB_MATCHES");
  if (sku === -1 || sku === "") { //throw an error if no SKU is set
    ui.alert("Event SKU not set",
                                 "You're trying to pull match data, but you haven't given the event SKU from RobotEvents yet in settings.  Find your event's SKU on robotevents.com, then copy and paste it in the RobotEvents SKU field in Settings.",
                                 ui.ButtonSet.OK);
  }
  var url = "http://api.vex.us.nallen.me/get_matches?sku=" + sku + "&round=2";
  var requestResult = UrlFetchApp.fetch(url).getContentText(); //get results of request
  var formattedResult = JSON.parse(requestResult); //parse the request to create a JSON object
  var results = formattedResult.result;
  //add score, dq, and no-show data for rows that don't have them
  for (var i = 0; i < formattedResult.size; i++) {
    //Logger.log(getRow("DB_MATCHES",{matchnumber: results[i].matchnum}, "data"));
    if (getRow("DB_MATCHES",{matchnumber: parseInt(results[i].matchnum)}, "data").redscore === "") { //if not at least the red alliance does not have a score listed, update the scores for the match
      editRow("DB_MATCHES",{matchnumber: parseInt(results[i].matchnum)},{redscore: results[i].redscore, bluescore: results[i].bluescore});
    }
  }
}*/

/**
* Get the latest match data and update values as needed.
*/
function pullMatchData() {
  createDatabase("DB_MATCHES",true,["matchnumber","red1","red2","blue1","blue2",
                                    "redscore","bluescore","dqteams","noshowteams","r1emc","r2emc","b1emc","b2emc","blueadjustedscore","redadjustedscore","matchimportancerating"]); //make the database if we need to
  
  var sku = getRow("DB_SETTINGS", { key: "roboteventssku" }, "data").value; //get the event sku from the settings database
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DB_MATCHES");

  var fromTrigger = false;
  var badSku = false;
  try {
    var ui = SpreadsheetApp.getUi(); //try to get the spreadsheet UI.  This call won't work when this function is called from a trigger.
  }
  catch (e) {
    fromTrigger = true; //can't get spreadsheet UI, so can't show errors in user interface
  }

  if(!fromTrigger) {
    var ui = SpreadsheetApp.getUi();
    if (sku === -1 || sku === "") { //throw an error if no SKU is set
      ui.alert("Event SKU not set",
                                 "You're trying to pull match data, but you haven't given the event SKU from RobotEvents yet in settings.  Find your event's SKU on robotevents.com, then copy and paste it in the RobotEvents SKU field in Settings.",
                                 ui.ButtonSet.OK);
     badSku = true; 
    }
  }
  if(!badSku) {
    var url = "http://api.vex.us.nallen.me/get_matches?sku=" + sku + "&round=2";
    var requestResult = UrlFetchApp.fetch(url).getContentText(); //get results of request
    var formattedResult = JSON.parse(requestResult); //parse the request to create a JSON object
    var results = formattedResult.result,
        stdRed1 = "", //these variables are necessary because red1, red2, blue1, and blue2 will be team names
        stdRed2 = "",
        stdBlue1 = "",
        stdBlue2 = "";
  
    for (var i = 0; i < formattedResult.size; i++) {
      stdRed1 = "'" + results[i].red1;
      stdRed2 = "'" + results[i].red2;
      stdBlue1 = "'" + results[i].blue1;
      stdBlue2 = "'" + results[i].blue2;
      //stringTeamNum = getStandardizedTeamName(results[i].team);
      if (getRow("DB_MATCHES",{ matchnumber: parseInt(results[i].matchnum) },"data") === -1) { //if we can't find the data for this match; need to convert matchnum to an integer because the API gives it as a string
        sheet.appendRow([parseInt(results[i].matchnum), stdRed1, stdRed2, stdBlue1, stdBlue2, results[i].redscore, results[i].bluescore]); //create a new row with the data; need to convert matchnum to an integer because the API gives it as a string
      } else { //otherwise, there is data for this match, so let's just update what needs to be changed
        editRow("DB_MATCHES",
                { matchnumber: parseInt(results[i].matchnum) }, //need to convert matchnum to an integer because the API gives it as a string
                { red1: results[i].red1, red2: results[i].red2, blue1: results[i].blue1, blue2: results[i].blue2, redscore: results[i].redscore, bluescore: results[i].bluescore });
      }
  }
}
}

function pullTeamData() {
  createDatabase("DB_TEAMS",true,["team","rank","wins","losses","ties",
                                    "wp","sp","trsp","opr","dpr","ccwm","highinterest"]); //make the database if we need to
                                    
  //query the RobotEvents API
  var sku = getRow("DB_SETTINGS", { key: "roboteventssku" }, "data").value; //get the event sku from the settings database
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DB_TEAMS");
  if (sku === -1 || sku === "") { //throw an error if no SKU is set
    showAlert("Event SKU not set",
              "You're trying to pull team data, but you haven't given the event SKU from RobotEvents yet in settings.  Find your event's SKU on robotevents.com, then copy and paste it in the RobotEvents SKU field in Settings.",
              "NOTIFY");
  }
  var url = "http://api.vex.us.nallen.me/get_rankings?sku=" + sku;
  var requestResult = UrlFetchApp.fetch(url).getContentText(); //get results of request
  var formattedResult = JSON.parse(requestResult); //parse the request to create a JSON object
  var results = formattedResult.result;
  var stdTeamNum = "";
  for (var i = 0; i < formattedResult.size; i++) {
    stdTeamNum = "'" + results[i].team;
    //stringTeamNum = getStandardizedTeamName(results[i].team);
    if (getRow("DB_TEAMS",{ team: results[i].team },"data") === -1) { //if there is no data for this team
      sheet.appendRow([stdTeamNum, results[i].rank, results[i].wins, results[i].losses, results[i].ties, results[i].wp, results[i].sp, results[i].trsp, results[i].opr, results[i].dpr, results[i].ccwm]); //add the data for this team
    } else { //otherwise, there is data for this team, so let's just update what needs to be changed
      editRow("DB_TEAMS",
              { team: results[i].team }, //can look up team number as a string because team numbers are stored as strings within the teams database sheet
              { rank: results[i].rank, wins: results[i].wins, losses: results[i].losses, ties: results[i].ties, wp: results[i].wp, sp: results[i].sp, trsp: results[i].trsp, opr: results[i].opr,
                dpr: results[i].dpr, ccwm: results[i].ccwm });
    }
  }
}

function getHighSkillsScores() {
  var sku = getRow("DB_SETTINGS", { key: "roboteventssku" }, "data").value; //get the event sku from the settings database
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DB_TEAMS");
  if (sku === -1 || sku === "") { //throw an error if no SKU is set
    showAlert("Event SKU not set",
              "You're trying to pull skills data, but you haven't given the event SKU from RobotEvents yet in settings.  Find your event's SKU on robotevents.com, then copy and paste it in the RobotEvents SKU field in Settings.",
              "NOTIFY");
  }
  
  //generate an array of teams
  var teamList = [];
  //pullTeamData(); //refresh team data in case the team list hasn't been retrieved yet or has changed
  
  var numTeams = getDatabaseSize("DB_TEAMS")[0] - 1;
  for (var i = 2; i <= numTeams + 1; i++) { //start i at 2 because first row is 1
    teamList.push(sheet.getRange(i, 1).getValue());
  }
  
  var robotSkillsScores = [];
  var programmingSkillsScores = [];
  for (var k = 0; k < teamList.length; k++) {
    var url = "http://api.vex.us.nallen.me/get_skills?team=" + teamList[k] + "&season=current";
    Logger.log(url);
    var requestResult = UrlFetchApp.fetch(url).getContentText(); //get results of request
    var formattedResult = JSON.parse(requestResult); //parse the request to create a JSON object
    Logger.log(formattedResult);
    var results = formattedResult.result;
    for (var j = 0; j < formattedResult.size; j++) {
      if(parseInt(results[j].type) === 0) { //robot skills
        robotSkillsScores.push({"team": teamList[k], "score": parseInt(results[j].score), "rank": parseInt(results[j].rank)});
      }
       else { //programming skills
        programmingSkillsScores.push({"team": teamList[k], "score":parseInt(results[j].score), "rank":parseInt(results[j].rank)});
      }
    }
  }
  
  //get top five scores for each skills challenge
  
  /*var topRobotSkills = [];
  var topProgrammingSkills = [];
  var currentScore;
  for (i = 0; i < robotSkillsScores.length; i++) {
    currentScore = robotSkillsScores[i];
    currentScore.score = parseInt(currentScore.score); //make sure score is stored an an integer
    if (i < 5) {
      topRobotSkills.push(currentScore);
    }
    else if (i === 5) {
       
    
    
    }
  }*/
  
  var rankedRobotSkillsScores = robotSkillsScores.sort(function (a,b) {
    if (parseInt(a.score) < parseInt(b.score)) {
      return 1;
    }
    if (parseInt(a.score) > parseInt(b.score)) {
      return -1;
    }
    return 0;
  
  });
  
  var rankedProgrammingSkillsScores = programmingSkillsScores.sort(function (a,b) {
    if (parseInt(a.score) < parseInt(b.score)) {
      return 1;
    }
    if (parseInt(a.score) > parseInt(b.score)) {
      return -1;
    }
    return 0;
  
  });
  
  var robotSkillsOutput = "";
  var programmingSkillsOutput = "";
  var number;
  var numTopTeams = rankedRobotSkillsScores.length < 10 ? rankedRobotSkillsScores.length : 10; //only get the top 10 teams or the number of teams that have results if there are less than 10 results
  var rank;
  var ordinalEnding;
  var rankNum;
  for (i = 0; i < numTopTeams; i++) {
    number = i + 1;
    rankNum = rankedRobotSkillsScores[i].rank;
    if (rankNum === 1) {
      ordinalEnding = "st";
    }
    else if (rankNum === 2) {
      ordinalEnding = "nd";
    }
    rank = (rankNum <= 2) ? " (score ranked " + rankNum + ordinalEnding + " at tournament where it was attained)" : "";
    robotSkillsOutput += number + ". " + rankedRobotSkillsScores[i].score + ", " + rankedRobotSkillsScores[i].team + rank + "\n";
    
  }
  
  var robotSkillsWM = rankedRobotSkillsScores[0].score - rankedRobotSkillsScores[1].score; //robot skills winning margin (1st place score minus 2nd place score)
  var robotSkillsWMPlural = "s";
  if (robotSkillsWM === 1) {
    robotSkillsWMPlural = "";
  }
  var progSkillsWM = rankedProgrammingSkillsScores[0].score - rankedProgrammingSkillsScores[1].score; //programming skills winning margin (1st place score minus 2nd place score)
  var progSkillsWMPlural = "s";
  if (progSkillsWM === 1) {
    progSkillsWMPlural = "";
  }
  
  numTopTeams = rankedProgrammingSkillsScores.length < 10 ? rankedProgrammingSkillsScores.length : 10; //only get the top 10 teams or the number of teams that have results if there are less than 10 results
  for (i = 0; i < numTopTeams; i++) {
    number = i + 1;
    rankNum = rankedProgrammingSkillsScores[i].rank;
    if (rankNum === 1) {
      ordinalEnding = "st";
    }
    else if (rankNum === 2) {
      ordinalEnding = "nd";
    }
    rank = (rankedProgrammingSkillsScores[i].rank <= 2) ? " (score ranked " + rankedProgrammingSkillsScores[i].rank + ordinalEnding + " at tournament where it was attained)" : "";
    programmingSkillsOutput += number + ". " + rankedProgrammingSkillsScores[i].score + ", " + rankedProgrammingSkillsScores[i].team + rank + "\n";
  }
  
  showAlert("Top skills results", "Here are up to 10 top robot and programming skills scores and the teams that attained those scores for all teams registered for the tournament with SKU " + sku + 
  ".  These rankings include all of a team's skills attempts for this season.  While they may contain scores from this tournament, these are *not* necessarily the skills rankings for this tournament.  To help you understand the data in context, scores that were high at their tournaments (i.e., the tournament where the team achieved that score) and ranked either 1st or 2nd have a note next to them.\n\n Robot skills:\n" + robotSkillsOutput + "\n Programming skills:\n" + programmingSkillsOutput + "\n The highest robot skills score was " + robotSkillsWM
  + " point" + robotSkillsWMPlural + " higher than the second highest score.  The highest programming skills score was " + progSkillsWM
  + " point" + progSkillsWMPlural + " higher than the second highest score.", "NOTIFY");
  
  Logger.log(robotSkillsOutput);
  Logger.log(programmingSkillsOutput);
  
}

function onFormSubmit(e) {
  var url = getRow("DB_SETTINGS",{key:"scoutingformurl"},"data").value;
  //var lastResponseWithEdit = getRow("DB_SETTINGS", {key:"lasteditablescoutingformresponse"},"data").value;
  var form = FormApp.openByUrl(url);
  formResponses = form.getResponses();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Form Responses 11")
  var editUrl = formResponses[formResponses.length-1].getEditResponseUrl();
  sheetSize = getDatabaseSize("Form Responses 11");
  var numCols = sheetSize[1];
  var numRows = sheetSize[0];
  var range = sheet.getRange(numRows, numCols+1);
  range.setValue(editUrl);
  Logger.log(e);
  savePrefs("testresponseediturl",editUrl);
}

/**
* Create the form for scouting teams
*/
function createScoutingForm () {
  var d = DriveApp.getRootFolder(); //get Google Drive permission necessary to create the form (Google Sheets will prompt to approve if the permission has not yet been approved)
  FormApp.getActiveForm();
  var sku = getRow("DB_SETTINGS",{key:"roboteventssku"},"data").value;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var form = FormApp.create("WARS Scouting Form for Tournament " + sku);
  //add editors of this sheet as editors of this form (to allow the form to be created by anyone with the ability to run this add-on in this sheet)
  var currentEditors = ss.getEditors();
  for (var i = 0; i < currentEditors.length; i++) {
    form.addEditor(currentEditors[i]);
    Logger.log(currentEditors[i]);
  }
  form.setDescription("Use this form to submit data for matches you\'ve been assigned to. \n\nAnswer questions based on what you observe during the match.  If you\'re unsure, you can choose \"I didn\'t see\" as your answer to the question.  \n\nTo change your response, go to the Form Responses 1 tab in WARS and click or tap on the link in the \'Edit this response\' column.")
      .setConfirmationMessage("Match data submitted successfully.")
      .setCollectEmail(true) //also sets setRequireLogin() to true
      .setAllowResponseEdits(false)
      .setAcceptingResponses(true)
      .setShowLinkToRespondAgain(true)
      .setDestination(FormApp.DestinationType.SPREADSHEET,ss.getId());
  
  var item;
  //question 1 - create select match dropdown menu
  item = form.addListItem()
             .setTitle("Select a match.")
             .setHelpText("[01-MNUM] Matches with data for 4 teams submitted are removed from this list.") 
             .setRequired(true);
  var matchChoices = [];
  var numMatches = getDatabaseSize("DB_MATCHES")[0] - 1; //get number of matches; subtract one because of headers
  var matchData;
  var choiceText = "";
  for (var match = 1; match <= numMatches; match++) { //generate the list of choices for the dropdown menu
    matchData = getRow("DB_MATCHES",{ "matchnumber": match},"data");
    choiceText = "Q" + match + " - " + matchData.red1 + "/" + matchData.red2 + " vs. " + matchData.blue1 + "/" + matchData.blue2;
    matchChoices.push(item.createChoice(choiceText));
  }
  item.setChoices(matchChoices);
 
  //question 2
  form.addTextItem()
      .setTitle("Enter the team number of the team you'll be scouting for this match.")
      .setHelpText("[01-TNUM] Check your response carefully to make sure you select the right team.")
      .setRequired(true);
  
  //question 3
  form.addCheckboxItem()
      .setTitle("I have verified my response to the above question.")
      .setHelpText("[01-VTNU]")
      .setRequired(true)
      .setChoices([item.createChoice("Yes.")]);
  
  //page 2 - autonomous
  var autonPage = form.addPageBreakItem()
                      .setTitle("Autonomous");
  
  //02-AUTO
  form.addMultipleChoiceItem()
      .setTitle("Did the team participate in the autonomous round?")
      .setHelpText("[02-AUTO]")
      .setChoiceValues(["Yes","No, because of technical difficulties (low battery, cortex/VEXnet problems, mechanical failure, etc.)",
                        "No", "I didn't see."])
      .setRequired(true);
      
 //02-AWIN
 form.addMultipleChoiceItem()
     .setTitle("Who won autonomous?")
     .setHelpText("[02-AWIN]")
     .setChoiceValues(["Red","Blue"])
     .setRequired(true);
     
 //02-ASKI
 form.addCheckboxItem()
     .setTitle("Did the team do any of the following during autonomous?")
     .setHelpText("[02-ASKI]")
     .setChoiceValues(["Scored in the high goal","Scored in the low goal","Picked up balls"]);
     
 //page 3 - driver control
 var driverControlPage = form.addPageBreakItem()
                             .setTitle("Driver Control")
                             .setHelpText("Note: All questions from this point on apply to the driver control period, not the autonomous period.");
                             
              
     
 //page 3 section header - Abilities
 form.addSectionHeaderItem()
     .setTitle("Abilities");
     
 //03-DCHG
 form.addCheckboxItem()
     .setTitle("During driver control, did the team successfully score in the high goal?")
     .setHelpText("[03-DCHG] (Check all that apply.)")
     .setChoiceValues(["Yes, from somewhere outside their starting tile",
                       "Yes, from within their starting tile",
                       "No, but they tried",
                       "No",
                       "I didn't see."])
     .setRequired(true);
     
 //03-DCLG
 form.addCheckboxItem()
     .setTitle("During driver control, did the team successfully score in the low goal?")
     .setHelpText("[03-DCHG] (Check all that apply.)")
     .setChoiceValues(["Yes, from somewhere outside their starting tile",
                       "Yes, from within their starting tile",
                       "No, but they tried",
                       "No",
                       "I didn't see."])
     .setRequired(true);
     
 //03-DCBA
 form.addCheckboxItem()
     .setTitle("How does the team score balls?")
     .setHelpText("[03-DCBA]")
     .setChoiceValues(["Shooter, picks up balls",
                       "Shooter, fed balls (either pre-loads by a human or balls on the field from its partner)",
                       "Dumps balls",
                       "Attempted to score balls but couldn't (i.e., the team scored no balls at any point during the match)",
                       "Did not attempt to score balls",
                       "I didn't see."])
     .setRequired(true);
     
 //page 3 section header - Teamwork
 form.addSectionHeaderItem()
     .setTitle("Teamwork");
 
 //03-TMWK
 form.addMultipleChoiceItem()
     .setTitle("Did the team appear to be working with their partner in any way?")
     .setHelpText("[03-TMWK]")
     .setChoiceValues(["Yes","No","I didn't see."])
     .setRequired(true);
     
 //03-LIFT
 form.addMultipleChoiceItem()
     .setTitle("Did the team participate in the end-of-match robot lifting?")
     .setHelpText("[03-LIFT] Don't worry about whether it was successful for this question.")
     .setChoiceValues(["Yes, this team's robot was lifted",
                       "Yes, this team's robot lifted their partner's robot",
                       "No","I didn't see."])
     .setRequired(true);
     
 //03-LRES
 form.addMultipleChoiceItem()
     .setTitle("If the team participated in end-of-match robot lifting, was the lifting successful?")
     .setHelpText("[03-LRES]")
     .setChoiceValues(["Yes, high lift",
                       "Yes, low lift",
                       "Yes, but too close to call a low or high lift",
                       "No, but they attempted",
                       "No; they didn't attempt",
                       "I didn't see."])
      .setRequired(true);
      
  //page 3 section header - Ratings
  form.addSectionHeaderItem()
     .setTitle("Ratings")
     .setHelpText("Rate the following characteristics of this team's robot.  Note that the highest option may not always be the best rating and that the lowest option may not always be the worst rating.\n\nDon't answer a question if you can't give an answer.");
  
  //03-SHTR
  form.addScaleItem()
      .setTitle("How consistent was the team's shooter?")
      .setHelpText("[03-SHTR] 0 - no shooter 1 - 0% but attempted 2 - 1-25% (more than one ball successful) 3 - 25-49% 4 - 50-75% 5 - 76-99% (not perfect) 6 - 100%")
      .setBounds(0,6)
      .setLabels("No shooter","100% (no shots missed)");
      
  //03-DVTR
  form.addScaleItem()
      .setTitle("If the team drove around the field, how fast was their drivetrain?")
      .setHelpText("[03-DVTR] 0 - Team didn't drive 1 - Way too slow or drivetrain problems 2 - Not fast enough - it seemed like the team was waiting (excessively) for their robot 3 - Fast enough; it never felt like they were waiting (excessively) on their robot 4 - Too fast, resulting in a lack of control")
      .setBounds(0,4)
      .setLabels("Team didn't drive","Too fast");
  
  //03-WLPR
  form.addScaleItem()
      .setTitle("If the team's robot *was lifted*, did the team have any issues resulting from its design driving onto their partner's robot?")
      .setHelpText("[03-WLPR] 0 - Successful lift 1 - A few minor issues that did not prevent success 2 - Minor problems (driving errors [not mechanical failures], time) prevented a successful lift 3 - Major problems (mechanical issues/failures, weak drivetrain, high center of gravity) caused lift attempt to be unsuccessful 4 - Did not attempt lifting")
      .setBounds(0,4)
      .setLabels("Successful lift", "Did not attempt lifting");
      
  //03-LPPR
  form.addScaleItem()
      .setTitle("If this team's robot *lifted the other team's robot*, did this team's robot have any issues resulting from its design that prevented a successful lift?")
      .setHelpText("[03-LPPR] 0 - Successful lift 1 - A few minor issues that did not prevent success 2 - Minor problems (driving errors [not mechanical failures], time) prevented a successful lift 3 - Major problems (mechanical issues/failures, weak drivetrain, high center of gravity) caused lift attempt to be unsuccessful 4 - Did not attempt lifting")
      .setBounds(0,4)
      .setLabels("Successful lift","Did not attempt lifting");
      
  //page 3 section header - Warnings and Penalties
  form.addSectionHeaderItem()
    .setTitle("Warnings and Penalities");
    
  //03-WPEC
  form.addCheckboxItem()
      .setTitle("Do any of the following apply to this team's performance during the match?")
      .setHelpText("[03-WPEC]")
      .setChoiceValues(["Multiple pinning warnings","Entanglement","Disablement","Disqualification","At least one member of the team showed up, but without a robot",
                        "The team did not show up for the match"]);
                        
  //page 3 section header - Other Notes
  form.addSectionHeaderItem()
      .setTitle("Other Notes");
  
  //03-NOTE
  form.addParagraphTextItem()
      .setTitle("Any other notes?")
      .setHelpText("[03-NOTE]");
      
  savePrefs("scoutingformurl", form.getPublishedUrl());
  
}

function createInterviewForm() {
  var d = DriveApp.getRootFolder(); //get Google Drive permission necessary to create the form (Google Sheets will prompt to approve if the permission has not yet been approved)
  FormApp.getActiveForm();
  var sku = getRow("DB_SETTINGS",{key:"roboteventssku"},"data").value;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var form = FormApp.create("WARS Team Interviews at Tournament " + sku);
  //add editors of this sheet as editors of this form (to allow the form to be created by anyone with the ability to run this add-on in this sheet)
  var currentEditors = ss.getEditors();
  for (var i = 0; i < currentEditors.length; i++) {
    form.addEditor(currentEditors[i]);
    Logger.log(currentEditors[i]);
  }
  form.setDescription("Introduce yourself, then tell teams the following:\n\nWould you be willing to complete a short questionnaire so we can learn more about your team for our alliance selection processes?  We'll also use this data to help us continue to develop our team ranking program.")
      .setConfirmationMessage("Team data submitted successfully.")
      .setCollectEmail(true) //also sets setRequireLogin() to true
      .setAllowResponseEdits(false)
      .setAcceptingResponses(true)
      .setShowLinkToRespondAgain(true)
      .setDestination(FormApp.DestinationType.SPREADSHEET,ss.getId());
  
  //page 1 section header - General Info
  form.addSectionHeaderItem()
      .setTitle("General Info");

  //01-LCNS
  var item = form.addTextItem();
  //var choices = [];
  //var teams = ss.getSheetByName("DB_TEAMS").getRange(getDatabaseSize("DB_TEAMS")[0],1);
  //for (var team = 0; team < teams.length; team++) {
  //  choices.push(item.createChoice(teams[team][0]));
  //}
  //item.setChoices(choices);
  
  item.setTitle("What is your robot license plate number?")
     .setHelpText("[01-LCNS] Note - the version in WARS should have this as a drop-down (maybe with \"other\" option just in case)")
     .setRequired(true);
     
  //01-LGSC
  form.addCheckboxItem()
      .setTitle("From where on the field can you consistently score in the low goal?")
      .setHelpText("[01-LGSC]")
      .setChoiceValues(["Any starting tile","Center of the field","Right next to the goal",
                        "Anywhere","Only red starting tiles","Only blue starting tiles",
                        "Cannot score consistently in low goal"])
      .showOtherOption(true)
      .setRequired(true);
      
 //01-HGSC
 form.addCheckboxItem()
      .setTitle("From where on the field can you consistently score in the high goal?")
      .setHelpText("[01-HGSC]")
      .setChoiceValues(["Any starting tile","Center of the field","Right next to the goal",
                        "Anywhere","Only red starting tiles","Only blue starting tiles",
                        "Cannot score consistently in high goal"])
      .showOtherOption(true)
      .setRequired(true);
      
 //page 2 - autonomous
 var page2 = form.addPageBreakItem()
                 .setTitle("Autonomous");
     
 //page 2 question stems
 var APTS2 = form.addMultipleChoiceItem();
     
 
 //create the remaining pages and the bases for the questions so that page logic will work and questions will be on the right page
 
 //page 3 - additional autonomous questions 1
 var page3 = form.addPageBreakItem()
     .setTitle("Autonomous");
 
 //page 3 question stems
 var APGL3 = form.addCheckboxItem(),
     ATLE3 = form.addCheckboxItem(),
     LSTL3 = form.addMultipleChoiceItem();

 //page 4 - additional autonomous questions 2
 var page4 = form.addPageBreakItem()
                 .setTitle("Autonomous");
                 
 //page 4 question stems 
 var AOFL4 = form.addTextItem();
 
 //page 5 - Climbing Period
 var page5 = form.addPageBreakItem()
     .setTitle("Climbing Period");
     
 //page 5 question stems
 var ELEV5 = form.addMultipleChoiceItem();
 
 //page 6 - Climbing Period additional questions 1
 var page6 = form.addPageBreakItem()
     .setTitle("Climbing Period");
 
 //page 6 question stems
 var LRES6 = form.addTextItem();
 
 //page 7 - More Climbing Period questions
 var page7 = form.addPageBreakItem()
     .setTitle("Climbing Period");
 
 //page 7 question stems 
 var EDIF7 = form.addMultipleChoiceItem();
 
 //page 8 - Climbing Period additional questions 2
 var page8 = form.addPageBreakItem()
     .setTitle("Climbing Period");
     
 //page 8 question stems
 var LDIF8 = form.addParagraphTextItem();
 
 //page 9 - Other Notes
 var page9 = form.addPageBreakItem()
     .setTitle("Other Notes");
     
 //page 9 question stems
 var NOTE9 = form.addParagraphTextItem()
 
 //02-APTS
 APTS2.setTitle("How many points can you consistently score in autonomous?")
     .setHelpText("[02-APTS]");
     
 APTS2.setChoices([APTS2.createChoice("No consistent autonomous play",page5),
                   APTS2.createChoice("1-5", page3),
                   APTS2.createChoice("6-10", page3),
                   APTS2.createChoice("11-15", page3),
                   APTS2.createChoice("16-20", page3),
                   APTS2.createChoice("20+", page3)])
      .setRequired(true);
     
     
 //03-APGL
 APGL3.setTitle("Where do you score your points?")
            .setHelpText("[03-APGL] Keep \"Other\" succinct, please - this question is for \"where,\" not \"how.\"")
            .setChoiceValues(["Low goal","High goal"])
            .showOtherOption(true);
            
 //03-ATLE
 ATLE3.setTitle("Which tiles do your autonomous plays work from?")
      .setHelpText("[03-ATLE] Select all that apply, where the back of the field is the side opposite the side where the goals are.")
      .setChoiceValues(["Side red","Back red","Side blue","Back blue"]);
     
 //03-LSTL
 LSTL3.setTitle("Do you leave the starting tile during autonomous play?")
      .setHelpText("[03-LSTL]")
      .setChoices([LSTL3.createChoice("Yes", page4),
                   LSTL3.createChoice("No", page5)])
      .setRequired(true);
            

     
 //04-AOFL
 AOFL4.setTitle("Where does your robot go?")
      .setHelpText("[04-AOFL]")
      .setRequired(true);
     

     
 //05-ELEV
 ELEV5.setTitle("Can you elevate your partner?")
      .setHelpText("[05-ELEV]")
      .setRequired(true)
      .setChoices([ELEV5.createChoice("Yes, high elevation", page6),
                   ELEV5.createChoice("Yes, low elevation", page6),
                   ELEV5.createChoice("No", page7)]);
                  
            

     
 
 //06-LRES
 LRES6.setTitle("Are there any restrictions when you elevate your partner?  If so, what are they?")
      .setHelpText("[06-LRES]")
      .setRequired(true);
     

     
 //07-EDIF
 EDIF7.setTitle("Is it easy to elevate your robot?")
      .setHelpText("[07-EDIF]")
      .setRequired(true)
      .setChoices([EDIF7.createChoice("Yes", page9),
                   EDIF7.createChoice("No", page8)]);
 

     
 //08-LDIF
 LDIF8.setTitle("What problems can make lifting your robot difficult?")
      .setHelpText("[08-LDIF]")
      .setRequired(true);
 

     
 //09-NOTE
 NOTE9.setTitle("(Don't ask this question to teams.)  Any other notes/observations?")
     .setHelpText("[09-NOTE] Leave this question blank if no.");
  
 savePrefs("interviewformurl", form.getPublishedUrl());
}

/**
* Create a new database for data storage.  Database sheets automaticaly have edit warnings enabled.
* @param db_name The name of the database
* @param if_not_exist Only create the database if one with that name doesn't already exist (note - this checks by name, not by columns, because two databases cannot have the same name, no matter what)
* @param columns Array of column names for the database
*/
function createDatabase(dbName, ifNotExist, columns) { 
  var ss = SpreadsheetApp.getActiveSpreadsheet(),
      create = true;
  if (ifNotExist) { //if we need to check if the sheet exists
    var sheets = ss.getSheets();
    if (sheets.length >= 1) {
      for (var i = 0; i < sheets.length; i++) {
        if (sheets[i].getSheetName() === dbName) {
          create = false; //if a sheet with the name given is found, don't create a new database
          break; //stop looping because we found a duplicate
        }
      }
    }
  }
  if (create) {
    ss.insertSheet(dbName);
    var sheet = ss.getSheetByName(dbName);
    sheet.protect().setWarningOnly(true).setDescription("Warn on manual database edits"); //add protection against inadvertant changes to the database
    sheet.appendRow(columns);
  }
}


/*
* Given a database, return an array containing its headers.
* @param database The database to get columns for
* @return An array of the headers for the database
*/
function getDatabaseColumns(database) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(database),
      values = sheet.getDataRange().getValues();
  
  return values[0]; //the first row of data will be the column headers
}

/*
* Fetch data from a row in a database, but support returning multiple matching rows rather than just one
* @param database The database to look in
* @param search An object containing key-value pairs for search terms and expected values, or a row number (zero-indexed where the first row after the database headers is row 0 (e.g., first row of data after the database headers would be row 0))
* @param mode Either "data" or "number" - "data" will return the data in the found row (if any) as an object; "number" will return the row number of the found row
* @param spreadsheetID Optional paramater used to facilitate API requests
* @return Depending on mode, either an object of row data or a row number (row number is zero-indexed).  In both cases, the result will come in the form of an array.  Returns -1 if no match found, or an empty array .  Returns "Bad mode parameter value" if the mode parameter has an invalid value.
*/
function getRows(database, search, mode, spreadsheetID) {
//testing:
/*database = "DB_SETTINGS";
search = {key: "roboteventssku"};
mode = "data";*/
  var spreadsheet,
      useID = false;
  if (spreadsheetID) {
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetID);
    } catch(e) {
      return {error: { code: 200, message: "Couldn't get spreadsheet with ID specified because of an error: " + e }};
    }
    useID = true; //this will only run if there was no error and the return statement wasn't called
  }
  
  spreadsheet = (!useID) ? SpreadsheetApp.getActiveSpreadsheet() : spreadsheet; //if no spreadsheet ID was specified, 
  var sheet = spreadsheet.getSheetByName(database);
  var data = getRowsData(sheet);
  var match = true;
  var result = []; //store the results of the search; only used for queries
  var searchType = typeof search;
  var searchMode = ((searchType) === 'object') ? "object" : (searchType === "number" ? "rowNum": ""); //allow a row number to be specified, too
  var emptyRow = false;
  if (searchMode === -1) { //if the value of the search parameter is invalid, return -1 to indicate a problem
    return -1;
  }
  
  /*if (mode !== "data" || mode !== "number") { //verify value of mode parameter
    return "Bad mode parameter value";
  }*/
  if (searchMode === "rowNum" && mode === "number") {
    return search; //the search parameter is the row number requested; no need to do any extra work because the row number in the search parameter would end up being the row number return anywys
  } else if (searchMode === "object") { //need to search for the row
    for (var row = 0; row < data.length; row++) { //getRowsData will exclude the header of the database
      for (var searchTerm in search) { //loop through search terms to check them
        if (search.hasOwnProperty(searchTerm)) { //make sure we're looking at the searchTerm properties only (not those of a prototype, for example)
          if (search[searchTerm] !== data[row][searchTerm]) { //check if the value for the search term column is the same as the value for this row in that column
            match = false;
          }
        }
      }
      if(match) {
        if (mode === "data") {
          result.push(data[row]);
        }
        else { //mode is "number"
          result.push(row);
        }
      }
      match = true; //reset match for next row.  Do this every time so that multiple matches can be found

    }
  } else { //searchMode will be "rowNum"; just return the contents of the row, or [] if the row is empty.
    try {
      result.push(data[search]);
    } catch(e) {
       //record that the row was empty so that an empty array rather than -1 can be returned
       emptyRow = true;
    }
  }
  return (result.length >= 1 || emptyRow) ? result : -1; //return the result or -1 if there were no matches
}

/*
* DEPRECATED as of 15-Nov-2015.  This function has been retained for backwards compatibility prior to future refactoring.  Use this function's successor getRows instead.
* Fetch data from a row in a database
* @param database The database to look in
* @param search An object containing key-value pairs for search terms and expected values, or a row number (zero-indexed where the first row after the database headers is row 0 (e.g., first row of data after the database headers would be row 0))
* @param mode Either "data" or "number" - "data" will return the data in the found row (if any) as an object; "number" will return the row number of the found row
* @return Depending on mode, either an object of row data or a row number (row number is zero-indexed).  Returns -1 if no match found, or an empty array .  Returns "Bad mode parameter value" if the mode parameter has an invalid value.
*/
function getRow(database, search, mode) {
  //testing
  /*database = "DB_SCOUTS";
  search = 0;
  mode = "data";*/
  
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(database);
  var data = getRowsData(sheet);
  var match = true;
  var searchType = typeof search;
  var searchMode = ((searchType) === 'object') ? "object" : (searchType === "number" ? "rowNum": ""); //allow a row number to be specified, too
  if (searchMode === -1) { //if the value of the search parameter is invalid, return -1 to indicate a problem
    return -1;
  }
  
  /*if (mode !== "data" || mode !== "number") { //verify value of mode parameter
    return "Bad mode parameter value";
  }*/
  if (searchMode === "rowNum" && mode === "number") {
    return search; //the search parameter is the row number requested; no need to do any extra work because the row number in the search parameter would end up being the row number return anywys
  } else if (searchMode === "object") { //need to search for the row
    for (var row = 0; row < data.length; row++) { //getRowsData will exclude the header of the database
      for (var searchTerm in search) { //loop through search terms to check them
        if (search.hasOwnProperty(searchTerm)) { //make sure we're looking at the searchTerm properties only (not those of a prototype, for example)
          if (search[searchTerm] !== data[row][searchTerm]) { //check if the value for the search term column is the same as the value for this row in that column
            match = false;
          }
        }
      }
      if(match) {
        if (mode === "data") {
          return data[row];
        }
        else { //mode is "number"
          return row;
        }
      }
      else {
        match = true; //reset match for next row
      }
    }
  } else { //searchMode will be "rowNum"; just return the contents of the row, or [] if the row is empty
    try {
      Logger.log(data[search]);
      return data[search];
    } catch(e) {
      return []; //if search is an invalid bounds for the data array, the row must be empty because it is not in the row.  We can assume search is a number because -1 is returned towards the beginning of this function if the value of searchMode is of the wrong type
    }
  }
  
  return -1; //if no match found, the function will reach this point
  
}

/*
* Edit a row.  Finds row using search parameters and changes specified values in change.  If search finds no matches, a new row will be created.  Note that execution could take more than 30 seconds if the function has to wait for a lock to be released.
* @param database The database in which the row to edit will reside
* @param search An object containing search parameters.  Properties should be column names; values for properties should be search values.
* @param change An object containing columns and new values.  Properties should be column names; values for properties should be new values.  Only specify values you want changed.
* @return nothing, or "Busy" if there was a problem creating the row because other calls of this function were running
*/
function editRow (database, search, change) {
  //testing:
  /*database = "DB_SETTINGS";
  search = {
    key: "roboteventssku"
  };
  change = {
    value: "1234-5467-5462"
  };*/
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(database),
      rowNum = getRow(database, search, "number"), //get row number of row to edit
      oldRow = getRow(database, search, "data"), //object
      numCols = getDatabaseColumns(database).length,
      changedValue = false; //tracker to see if any row actually needs to be editied
  if (rowNum !== -1) {//if getRow says the row does not exist
    //Set up the new row and change values
    var newRow = oldRow; //object
    for (var newValue in change) { //change is the object, newValue is the property, and change[newValue] is the value of the newValue property in change
      if(change.hasOwnProperty(newValue)) { //if the property newValue exists in change, and if the new value is not the same as the old value...
          newRow[newValue] = change[newValue]; //change the value of the property newValue in newRow to the value for the property newValue specified in change
        changedValue = true; //change changedValue to true to make sure the row is edited
      }
    }
    
    if (changedValue) { //only change the row if it actually needs to be changed
      
       //check to see if the new row involves a team name
      if(newRow.hasOwnProperty("team")) {
         newRow.team = "'" + newRow.team; //if so, we're setting the team property and need to make sure that we include the apostrophe before the team name to ensure that it is saved as a string
      }
         
      if(newRow.hasOwnProperty("red1")) {
        newRow.red1 = "'" + newRow.red1;
      }
        
      if(newRow.hasOwnProperty("red2")) {
         newRow.red2 = "'" + newRow.red2;
      }
         
      if(newRow.hasOwnProperty("blue1")) {
        newRow.blue1 = "'" + newRow.blue1;
      }
        
      if(newRow.hasOwnProperty("blue2")) {
         newRow.blue2 = "'" + newRow.blue2;
      }
         
      var newRowData = []; //the row array for newRowRange
      for (var value in newRow) {
        newRowData.push(newRow[value]);
      }
      //Change the row values in the sheet
      var lock = LockService.getScriptLock(); //create a lock to prevent multiple new rows from being added at the same time during concurrent executions
      if(lock.tryLock(30000)) {
        sheet.getRange(rowNum+2, 1, 1, numCols).setValues([newRowData]); //range will be at rowNum and the first column and will extend one row and as many columns as exist in the database.  add 1 to rowNum because getRow in "number" mode returns a zero-indexed row
        SpreadsheetApp.flush();
      }
      else {
        return "Busy";
      }
      lock.releaseLock();
      Logger.log(newRowData);
    }
    //debugger;
  }
}

/*
* Creates a row in the specified database.
* @param database The database to add the row to
* @param values An array containing the values to add to the row.  Use "" to add a blank cell.
*/
function createRow(database, values) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(database);
  sheet.appendRow(values);
}


function dbSize(rows, cols) {
  this.rows = rows;
  this.cols = cols;
}

function getDatabaseSize(database) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(database),
      values = sheet.getDataRange().getValues(), //gives the values in the database as a two-dimensional array
      numCols = values[0].length, //where rows are arrays, number of columns = length of an array representing a row
      numRows = values.length; //values is an array containing arrays of rows.  Thus, length of values = number of row arrays = number of rows in database
  Logger.log(numCols + numRows);
  return [numRows, numCols]; //array representing database size
  debugger;
}

/**
* Save preferences to the settings database.  Note that execution could take more than 90 (30 second wait for lock to be released for this function, but another possible 2*30 = 60 seconds for editRow) seconds if the function is waiting for a lock to be released.
* @param key The descriptor of the value
* @param value Value to store with the key
*/
function savePrefs(prefKey, prefValue) {
  /*//testing:
  prefKey = "roboteventssku";
  prefValue = "1234";*/
  
  //prevent this function from running multiple times to prevent a situation in which two concurrent execution of this function both call createDatabase, and in the slight difference of timing, the row that is supposed
  //     to come later in the spreadsheet ends up in the first row and displaces the column headers.  See WA Robotics Scout Planning Doc (https://docs.google.com/document/d/1DM4OHtkywGLhlSI_wnO3ENEwTxvN_11SSOWw6ELoXOo/edit) for
  //     more information.
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); //execeptions resulting from this line should be handled when the function is called using the .withFailureHandler method of google.script.run
  
  createDatabase("DB_SETTINGS", true, ["key","value"]); //create a settings database only if necessary
  
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DB_SETTINGS"); //get the settings database sheet
  
  if(getRow("DB_SETTINGS",{key: prefKey}, "number") === -1) { //find out if this setting already exists in the database
    createRow("DB_SETTINGS", [prefKey, prefValue]); //create a row for the setting if it doesn't
  } else {
    var editResult;
    for (var attempt = 1; attempt <= 2; attempt++) { //attempt editRow twice in case editRow fails the first time
      editResult = editRow("DB_SETTINGS",{"key": prefKey},{"value": prefValue}); //just change the setting value if it the setting already exists
      if (editResult !== "Busy") {
        break; //don't rerun the function if it was successful
      }
      //otherwise, try running editRow again
    }
  }
  SpreadsheetApp.flush(); //make sure changes to sheet are applied before the lock is released
  lock.releaseLock(); //release the lock on this function
  debugger;
}

/**
* Show an alert to the user.  Note: automatically closes an open dialog box
* @param title The title of the alert
* @param text The text to show in the alert
* @param type Acceptable values: "NOTIFY" - shows an Ok button; "OK_TO_CONTINUE" - offers Ok and cancel options for confirming that the user wants to continue without having to ask a question; "CONFIRM_CONTINUE" - offers yes and no options for situations where no can double as an option to cancel; "CONFIRM_CANCEL" - offers yes, no, and cancel options for
*             situations where both yes and no will do something; [not specified] - if no value is given, will default to just an Ok button
* @return A string containing the name of the button the user pressed: "Ok" - "Yes" - "No" - "Cancel" or 0 if the alert prompt gives an unexpected result
*/
function showAlert (title, text, type) {
  //testing:
  /*title = "Saved!";
  text = "Settings saved successfully.";
  type = "OK_TO_CONTINUE";*/
  //google.script.host.close(); //close any dialogs that are currently open
  var ui = SpreadsheetApp.getUi();
  switch (type) {
    case "NOTIFY":
      type = ui.ButtonSet.OK;
      break;
    case "OK_TO_CONTINUE":
      type = ui.ButtonSet.OK_CANCEL;
      break;
    case "CONFIRM_CONTINUE":
      type = ui.ButtonSet.YES_NO;
      break;
    case "CONFIRM_CANCEL":
      type = ui.ButtonSet.YES_NO_CANCEL;
      break;
    default:
      type = ui.ButtonSet.OK;
  }
  var result = ui.alert(title, text, type);
  switch (result) {
    case ui.Button.OK:
      return "Ok";
    case ui.Button.YES:
      return "Yes";
    case ui.Button.NO:
      return "No";
    case ui.Button.CANCEL:
      return "Cancel";
    default:
      return 0; //fallback if the value of result is something unexpected
  }
}

/**
* Return a team number as a string if it isn't already one (because Google Sheets will store team numbers that are strings as numbers, but
*      within code, team numbers need to be of the same type
* @param team The team number to check
* @return The team number inputted as a string
*/
function getStandardizedTeamName(team) {
  if (typeof team === "number") {
    Logger.log(typeof team);
    Logger.log(typeof team.toString());
    return team.toString();
  }
  return team; //if the team number is already a string, just return the team number given
}

//below code is from New Visions for Public Schools' Cloud Lab (http://cloudlab.newvisions.org/technical-blog/readingandwritingdatainsheetsviaspreadsheetapp)
// getRowsData iterates row by row in the input range and returns an array of objects.
// Each object contains all the data for a given row, indexed by its normalized column name.
// Arguments:
//   - sheet: the sheet object that contains the data to be processed
//   - range: the exact range of cells where the data is stored
//       This argument is optional and it defaults to all the cells except those in the first row
//       or all the cells below columnHeadersRowIndex (if defined).
//   - columnHeadersRowIndex: specifies the row number where the column names are stored.
//       This argument is optional and it defaults to the row immediately above range;
// Returns an Array of objects.
/*
 * @param {sheet} sheet with data to be pulled from.
 * @param {range} range where the data is in the sheet, headers are above
 * @param {row} 
 */
function getRowsData(sheet, range, columnHeadersRowIndex) {
  if (sheet.getLastRow() < 2){
    return [];
  }
  var headersIndex = columnHeadersRowIndex || (range ? range.getRowIndex() - 1 : 1);
  var dataRange = range ||
    sheet.getRange(headersIndex+1, 1, sheet.getLastRow() - headersIndex, sheet.getLastColumn());
  var numColumns = dataRange.getLastColumn() - dataRange.getColumn() + 1;
  var headersRange = sheet.getRange(headersIndex, dataRange.getColumn(), 1, numColumns);
  var headers = headersRange.getValues()[0];
  return getObjects_(dataRange.getValues(), normalizeHeaders(headers));
}

// For every row of data in data, generates an object that contains the data. Names of
// object fields are defined in keys.
// Arguments:
//   - data: JavaScript 2d array
//   - keys: Array of Strings that define the property names for the objects to create
function getObjects_(data, keys) {
  var objects = [];
  var timeZone = Session.getScriptTimeZone();

  for (var i = 0; i < data.length; ++i) {
    var object = {};
    var hasData = false;
    for (var j = 0; j < data[i].length; ++j) {
      var cellData = data[i][j];
      if (isCellEmpty_(cellData)) {
        object[keys[j]] = '';
        continue;
      }
      object[keys[j]] = cellData;
      hasData = true;
    }
    if (hasData) {
      objects.push(object);
    }
  }
  return objects;
}


// Returns an Array of normalized Strings.
// Empty Strings are returned for all Strings that could not be successfully normalized.
// Arguments:
//   - headers: Array of Strings to normalize
function normalizeHeaders(headers) {
  var keys = [];
  for (var i = 0; i < headers.length; ++i) {
    keys.push(normalizeHeader(headers[i]));
  }
  return keys;
}

// Normalizes a string, by removing all alphanumeric characters and using mixed case
// to separate words. The output will always start with a lower case letter.
// This function is designed to produce JavaScript object property names.
// Arguments:
//   - header: string to normalize
// Examples:
//   "First Name" -> "firstName"
//   "Market Cap (millions) -> "marketCapMillions
//   "1 number at the beginning is ignored" -> "numberAtTheBeginningIsIgnored"
function normalizeHeader(header) {
  var key = "";
  var upperCase = false;
  for (var i = 0; i < header.length; ++i) {
    var letter = header[i];
    if (letter == " " && key.length > 0) {
      upperCase = true;
      continue;
    }
    if (!isAlnum_(letter)) {
      continue;
    }
    if (key.length == 0 && isDigit_(letter)) {
      continue; // first character must be a letter
    }
    if (upperCase) {
      upperCase = false;
      key += letter.toUpperCase();
    } else {
      key += letter.toLowerCase();
    }
  }
  return key;
}

// Returns true if the cell where cellData was read from is empty.
// Arguments:
//   - cellData: string
function isCellEmpty_(cellData) {
  return typeof(cellData) == "string" && cellData == "";
}

// Returns true if the character char is alphabetical, false otherwise.
function isAlnum_(char) {
  return char >= 'A' && char <= 'Z' ||
    char >= 'a' && char <= 'z' ||
    isDigit_(char);
}

// Returns true if the character char is a digit, false otherwise.
function isDigit_(char) {
  return char >= '0' && char <= '9';
}
//end of code from New Visions for Public Schools Cloud Lab
