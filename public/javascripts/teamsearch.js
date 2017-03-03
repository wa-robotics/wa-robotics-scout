console.log("firebase init");
page = "teamsearch";
var config = {
    apiKey: "AIzaSyAIvK9HrI4P7MJlzjOHmcWeja2BPEInuTo",
    authDomain: "wa-robotics-scout.firebaseapp.com",
    databaseURL: "https://wa-robotics-scout.firebaseio.com",
    storageBucket: "wa-robotics-scout.appspot.com",
    messagingSenderId: "490870467180"
};

function processResults (team,value) {
    console.log(team,value);
    var apiResponse = value;
    console.log(apiResponse);
    var currentTeamInfo;
    var propertyValue;
    var invalidTeamNum;
    output = '<div class="team-info-table-container mdl-cell--2-col-desktop mdl-cell--4-col-tablet mdl-cell--4-col-phone"><h5><strong>' + team +
        ' </strong></h5><table cellspacing="0" width="100%" class="display team-info-table mdl-shadow--2dp full-width scouting-table-disp"><thead><tr><th>Property</th><th>Value</th></tr></thead><tbody>';

    if (value !== null) {
        currentTeamInfo = value;

        for (var prop in value) {
            if (value.hasOwnProperty(prop) && prop !== "Team") {
                console.log(value);
                console.log("prop", prop);
                propertyValue = prop;
                output += '<tr><td>' + propertyValue + '</td><td>' + value[prop] + '</td></tr>';
            }
        }

        output += '</tbody></table></div>';
    } else {
        if (/^[0-9]{1,5}[a-zA-Z]?$/.test(team)) {
            invalidTeamNum = "";
        } else {
            console.log("invalid team num");
            invalidTeamNum = '<i class="material-icons">error_outline</i> Invalid team number <br />';
        }
        output = '<div class="team-info-table-container mdl-cell--2-col-desktop mdl-cell--4-col-tablet mdl-cell--4-col-phone"><h5><strong>' + team +
            ' </strong></h5>' + invalidTeamNum + '<i class="material-icons">info_outline</i> No data available';
    }
    $('#match-team-info-tables').append(output);



    $('#match-info-data-loading').removeClass("is-active").addClass("hidden");

}

function scoutingFormDataFetch(teams) {
    var team = teams.pop();
    firebase.database().ref('/scouting/' + userDefaults.org + '/' + userDefaults.tournament + "/" + team).once('value').then(function (snapshot) {

        //getRankInfo(team);
        if (snapshot.val() !== null) {
            scoutInfo = snapshot.val();
            console.log(scoutInfo);
            console.log(scoutInfo);
            processResults(team,scoutInfo);
        } else {
            processResults(team,null);
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
            $("#search-teams").val("");
            $("#search, #search-teams").removeAttr("disabled");
            $("#search-data-loading").removeClass("is-active");
        }
    });
}

function getScoutingInfo() {
    var teams = $("#search-teams").val().split(",").reverse().map(function(x) { return x.trim().toUpperCase(); }); //split the teams entered and remove spaces if teams were separated by commas and spaces

    //fetch scouting info for each team from Firebase

    //do this for each team
    $('#match-team-info-tables').children(".team-info-table-container").remove();
    $('#search-data-loading').addClass("is-active");
    $('#search, #search-teams').attr("disabled","disabled");
    scoutingFormDataFetch(teams);
    //query API and get current rank/OPR/DPR/CCWM data for each team in the match



}

$(document).ready(function() {
   $("#search").click(getScoutingInfo);
});