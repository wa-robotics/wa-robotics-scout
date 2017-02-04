var sku = "";

var cleanNames = {
    "auton-actions":"Auton. actions",
    "auton-pointsScored":"Auton. pts. scored",
    "auton-startTime":"Time left in auton. when play starts",
    "hang-duration":"Time to hang (if app.)",
    "hang-startTime":"Seconds left when hang starts",
    "hang-endTime":"Seconds left when hang ends",
    "hang-result":"Hang result",
    "hang-partnerHelp":"Partner help when hanging (if app.)",
    "robot-platformCubes":"# cubes platform holds (on avg.)",
    "robot-platformStars":"# stars platform holds (on avg.)",
    "robot-platformStability":"Sturdiness of scoring device",
    "robot-platformHolding":"How often robot drops objects when scoring",
    "robot-strafes":"Strafes",
    "robot-type":"Scoring method",
    "alliance":"Alliance in scouted match",
    "match":"Lasted scouted match",
    "team":"The team scouted (again)",
    "timestamp":"Ignore this value",
    "user":"Ignore this value"
}

function processResults (team,alliance,value) {
    console.log(team,alliance,value);
    var apiResponse = value;
    console.log(apiResponse);
    var currentTeamInfo;
    var propertyValue;
    output = '<div class="team-info-table-container mdl-cell--2-col-desktop mdl-cell--4-col-tablet mdl-cell--4-col-phone"><h5><strong>' + alliance + ' - ' + team
            + ' </strong></h5><table cellspacing="0" width="100%" class="display team-info-table mdl-shadow--2dp full-width scouting-table-disp"><thead><tr><th>Property</th><th>Value</th></tr></thead><tbody>';

        if (value !== null) {
            currentTeamInfo = value;

            for (var prop in value) {
                console.log(value);
                console.log("prop",prop);
                if (prop === "robot" || prop === "hang" || prop === "auton") {
                    for (var nestedProp in value[prop]) {
                        console.log("nestedProp",nestedProp);
                        propertyValue = cleanNames[prop + "-" + nestedProp];
                        output += '<tr><td>' + propertyValue + '</td><td>' + value[prop][nestedProp] + '</td></tr>';
                    }
                } else {
                    propertyValue = cleanNames[prop];
                    output += '<tr><td>' + propertyValue + '</td><td>' + value[prop] + '</td></tr>';
                }
            }

            output += '</tbody></table></div>';
        } else {
            output = '<div class="team-info-table-container mdl-cell--2-col-desktop mdl-cell--4-col-tablet mdl-cell--4-col-phone"><h5><strong>' + alliance + ' - ' + team
                + ' </strong></h5><i class="material-icons">info_outline</i> No data available';
        }
        $('#match-team-info-tables').append(output);



    $('#match-info-data-loading').removeClass("is-active").addClass("hidden");

}

function processMatchTeams(value) {
    var match = value.results,
        partner,
        opponent1,
        opponent2;
    alert(match.matchnumber);
    //determine alliance and position on alliance
    if (match.red1 === queryTeam) {
        alliance = "red";
        alliancePosition = "red1";
    } else if (match.red2 === queryTeam) {
        alliance = "red";
        alliancePosition = "red2";
    } else if (match.blue1 === queryTeam) {
        alliance = "blue";
        alliancePosition = "blue1";
    } else if (match.blue2 === queryTeam) {
        alliance = "blue";
        alliancePosition = "blue2";
    }

    //determine partner for this match
    if (alliance === "red") {
        if (alliancePosition === "red1") {
            partner = match.red2;
        } else { //this team is red2, so partner is red1
            partner = match.red1;
        }
    } else if (alliance === "blue") {
        if (alliancePosition === "blue1") {
            partner = match.blue2;
        } else { //this team is blue2, so partner is blue1
            partner = match.blue1;
        }
    }

    if (alliance === "red") {
        opponent1 = match.blue1;
        opponent2 = match.blue2;
    } else {
        opponent1 = match.red1;
        opponent2 = match.red2;
    }

    //getTeamInfo(partner);
    //getTeamInfo(opponent1);
    //getTeamInfo(opponent2);
    console.log(alliance);
    console.log(alliancePosition);
}

function getTeamInfo(team) {
    //var url = "https://script.google.com/a/macros/woodward.edu/s/AKfycbxsKMe0cdyYScaJXipBoA2bFSY8Aj-jxlQqyS4aDOI/dev?prefix=processResults&type=getTeamInfo&id=1vrZQpvtiJvcyKdlULZk5HOyRU5ystAiMZ4y8rF6dJEg&team=" + team;
    console.log(team);
    console.log(url);
    //$('body').append('<script src="' + url + '"><\/script>');
}

function test() {
    console.log("haiiii");
}

function firebaseInit() {
    firebase.initializeApp(config);
}
var config = {
    apiKey: "AIzaSyAIvK9HrI4P7MJlzjOHmcWeja2BPEInuTo",
    authDomain: "wa-robotics-scout.firebaseapp.com",
    databaseURL: "https://wa-robotics-scout.firebaseio.com",
    storageBucket: "wa-robotics-scout.appspot.com",
    messagingSenderId: "490870467180"
};
firebaseInit();

function renderMatchInfo(data) {
    console.log(data);
    processResults(data);
}
function signOut() {
    firebase.auth().signOut();
}
var rankInfo;

function setRankInfo(data) {
    console.log("data",data);
    rankInfo = data.results[0];
}

function getRankInfo(team) {
    $.ajax('/api/' + sku + '/rank/' + team, {
        success:setRankInfo
    });
}

function scoutingFormDataFetch(teams,elim) {
    var allianceColor = "";
    if (!elim) {
        if (teams.length > 2) {
            allianceColor = "blue";
        } else {
            allianceColor = "red";
        }
    } else {
        if (teams.length > 3) {
            allianceColor = "blue";
        } else {
            allianceColor = "red";
        }
    }
    var team = teams.pop();
    firebase.database().ref('/scouting/' + userDefaults.org + '/' + userDefaults.tournament).orderByChild("team").equalTo(team).limitToLast(1).once('value').then(function (snapshot) {

        //getRankInfo(team);
        if (snapshot.val() !== null) {
            scoutInfo = snapshot.val();
            console.log(scoutInfo);
            console.log(scoutInfo[Object.keys(scoutInfo)[0]]);
            processResults(team,allianceColor,scoutInfo[Object.keys(scoutInfo)[0]]);
        } else {
            processResults(team,allianceColor,null);
        }
        //processResults(scoutInfo[Obj.keys(scoutInfo)[0]]);
/*        var toDisplay = {
            rank: rankInfo,
            scout: scoutInfo
        };*/
        //console.log(toDisplay);
        //processResults(toDisplay)
        if (teams.length >= 1) {
            scoutingFormDataFetch(teams);
        } else {
            $(".team-info-table-container > table.team-info-table").each(function() {
                console.log("ran");
               $(this).DataTable({
                    paging:false,
                   scrollX:true,
                   fixedColumns:true
                });
                console.log($(this));
            });
        }
    });
}

function getScoutingInfo(matchData) {
    var data = matchData.results[0];
    console.log(data);

    var teams = [];
    var elim = false;
    if (data.blue3 !== "") {//there's a 3rd team on the blue alliance, so account for 3 team alliances
        teams = [data.red1, data.red2, data.red3, data.blue1, data.blue2, data.blue3];
        elim = true;
    } else { //qual or practice match, 2 team alliances
        teams = [data.red1, data.red2, data.blue1, data.blue2];
    }

    //fetch scouting info for each team from Firebase

    //do this for each team
    scoutingFormDataFetch(teams,elim);
    //query API and get current rank/OPR/DPR/CCWM data for each team in the match



}

function getTeamsInMatch(sku) {
    var matchnum = parseInt(qmatch);
    $.ajax('/api/' + sku + '/match/2/1/' + qmatch, {
        success:getScoutingInfo
    });
}
var page = "matchInfo";
firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        signedInUser = user;
        $("#sign-in").hide();
        /*firebase.auth().currentUser.getToken(true).then(function(idToken) {
            $.ajax("/api/scout/" + org + "/" + tournament + "/" + qmatch, { data: JSON.stringify({"token":idToken}),
                dataType:"json", success:renderMatchInfo,method: "POST",contentType:"application/json"});
        });*/
        getUserDefaults();

    } else {
        window.location = "/auth"; //user is not signed in, redirect to sign in page
    }
});

function initialize() {
    componentHandler.upgradeAllRegistered(); //to make sure the loading spinner appears and not just "Loading..."

    //show a warning if the user is looking at a match for a different team (one that they aren't on)
    /*if (userTeam !== queryTeam) {
        if ($('#show-diff-team').hasClass('hidden')) { //only remove the hidden class if it's present
            $('#show-diff-team').removeClass('hidden');
        }
    } else if (!$('#show-diff-team').hasClass('hidden')) { //only add the hidden class if it's absent
        $('#show-diff-team').addClass('hidden');
    }*/

    //!!!NO REFRESH IS ENABLED!!!
    //var url = "https://script.google.com/a/macros/woodward.edu/s/AKfycbxsKMe0cdyYScaJXipBoA2bFSY8Aj-jxlQqyS4aDOI/dev?prefix=processResults&type=getTeamInfoForMatch&id=" + instanceID + "&norefresh&match=" + matchNum;

    //get match details to determine which teams are competing in this match
    //$('body').append('<script src="' + url + '"><\/script>');




}
initialize();