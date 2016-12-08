function processResults (value) {
    var apiResponse = value.results;
    console.log(apiResponse);
    var currentTeamInfo;
    for (var i = 0; i < apiResponse.length; i++) {
        output = '<div class="team-info-table-container mdl-cell--2-col-desktop mdl-cell--4-col-tablet mdl-cell--4-col-phone"><h5><strong>' + apiResponse[i].position + ' - ' + apiResponse[i].result.team
            + ' </strong></h5><table class="team-info-table mdl-data-table mdl-js-data-table mdl-shadow--2dp full-width scouting-table-disp"><thead><tr><th class="mdl-data-table__cell--non-numeric">Property</th><th>Value</th></tr></thead><tbody>';

        if (apiResponse[i].result.hasOwnProperty("data")) {
            currentTeamInfo = apiResponse[i].result.data;


            for (var j = 0; j < currentTeamInfo.length; j++) {
                output += '<tr><td class="mdl-data-table__cell--non-numeric">' + currentTeamInfo[j].propName + '</td><td class="mdl-data-table__cell--non-numeric">' + currentTeamInfo[j].value + '</td></tr>';
            }

            output += '</tbody></table></div>';
        } else {
            output = '<div class="team-info-table-container mdl-cell--2-col-desktop mdl-cell--4-col-tablet mdl-cell--4-col-phone"><h5><strong>' + apiResponse[i].position + ' - ' + apiResponse[i].result.team
                + ' </strong></h5><i class="material-icons">info_outline</i> No data available';
        }
        $('#match-team-info-tables').append(output);

    }

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
    apiKey: "AIzaSyAIvK9HrI4P7MJlzjOHmcWeja2BPEInuTo"
    , authDomain: "wa-robotics-scout.firebaseapp.com"
    , databaseURL: "https://wa-robotics-scout.firebaseio.com"
    , storageBucket: "wa-robotics-scout.appspot.com"
    , messagingSenderId: "490870467180"
};
firebaseInit();

function initialize() {
    componentHandler.upgradeAllRegistered(); //to make sure the loading spinner appears and not just "Loading..."

    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            signedInUser = user;
            $("#sign-in").hide();
            $.ajax("/api/scout/1/1/1", { data: firebase.auth().getCurrentUser().getToken(), success: test, method: "POST"});
            //getUserOrgs();
        } else {
            window.location = "/auth"; //user is not signed in, redirect to sign in page
        }
    });



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