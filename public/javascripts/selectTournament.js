$(document).ready(function () {
    $("#org-select").change(loadTournamentInfo);
    $("#team-select").change(enableContinueBtn);
    $("#continue").on("click",saveTournamentInfo);
});

function redirectToIndex() {
    window.location = "/";
}

function showError() {
    $("#error-div").text("There was a problem saving your preferences");
}

function enableContinueBtn() {
    $("#continue").removeAttr("disabled");
}

function saveTournamentInfo() {
    console.log("ran");

    firebase.auth().currentUser.getToken(/* forceRefresh */ true).then(function(idToken) {
        console.log(idToken);
        $("#continue").attr("disabled","disabled");
        $.ajax("/api/select/save", {
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({"token": idToken,
                tournament: $("#tournament-select").val(),
                team: $("#team-select").val()}),
            dataType:"json",
            success:redirectToIndex,
            error:showError
        });
    });

}

function goToScoutingForm() {
    window.location = "/scout/" + $('#org-select').val() + "/" + $('#tournament-select').val();
}


function finishGetTeamMatches(sku, queryTeam) {
    var url = "/api/" + sku + "/" + queryTeam;
    console.log(url);
    jQuery.ajax(url, {
        success: processResults
    });
    //modalInit();
    //console.log("queryTeam is " + queryTeam);
    //console.log("Show default team selection modal? " + promptDefaultTeam);
    //console.log(queryTeam);
    //console.log(userTeam);
    //console.log("promptDefaultTeam is " + promptDefaultTeam + " of type " + typeof promptDefaultTeam);
    /*if (promptDefaultTeam === "true") { //promptDefaultTeam becomes a string when it is inserted into a script tag (in index.html) with a printing scriptlet
     var dialog = document.querySelector('#default-team-select-dialog');
     console.log("promptDefaultTeam is " + promptDefaultTeam);
     dialog.showModal();
     } else if(queryTeam) {
     getTeamMatches(queryTeam);
     }*/
}
var queryTeam = "";

function getTeamMatches() {
    console.log("called2");
    queryTeam = $("#team-select").val();
    var sku;
    console.log("tournament sku id", $("#tournament-select").val());
    firebase.database().ref("/tournaments/"+ $("#tournament-select").val() +"/sku").once("value").then(function (snapshot) {
        finishGetTeamMatches(snapshot.val(), queryTeam);
    });
    console.log("sku", sku);
    //updateTeamDropdown();
    /*if (userTeam !== queryTeam) {
     if ($('#show-diff-team').hasClass('hidden')) { //only remove the hidden class if it's present
     $('#show-diff-team').removeClass('hidden');
     }
     }
     else if (!$('#show-diff-team').hasClass('hidden')) { //only add the hidden class if it's absent
     $('#show-diff-team').addClass('hidden');
     }*/
}
var config = {
    apiKey: "AIzaSyAIvK9HrI4P7MJlzjOHmcWeja2BPEInuTo",
    authDomain: "wa-robotics-scout.firebaseapp.com",
    databaseURL: "https://wa-robotics-scout.firebaseio.com",
    storageBucket: "wa-robotics-scout.appspot.com",
    messagingSenderId: "490870467180"
};
firebaseInit();
var globalInfo = {};

function setDropdownMenuItems(menuId, valueList, displayValueList, emptyFirst, defaultString) {
    menuId = "#" + menuId;
    if (emptyFirst) {
        $(menuId).empty().append("<option class='hidden' value=''>" + defaultString + "</option>");
    }
    for (var i = 0; i < displayValueList.length; i++) {
        $(menuId).append("<option value='" + valueList[i] + "'>" + displayValueList[i] + "</option>");
    }
    $(menuId).removeAttr("disabled");
}

function getOrgInfo(org, userId) {
    firebase.database().ref("/organizations/"+ org).once("value").then(function (snapshot) {
        globalInfo.orgInfo = snapshot.val();
        setDropdownMenuItems("org-select", [globalInfo.userorgs[0]], [globalInfo.orgInfo.name], true, "Select an organization");
        $("#org-select").removeAttr("disabled");
        $("#org-short-name").text(globalInfo.orgInfo.short_name);
        setDropdownMenuItems("team-select", globalInfo.orgInfo.teams, globalInfo.orgInfo.teams, true, "Select a team");
        $("#team-select").removeAttr("disabled");
    });
}

function resetDropdowns() {
    $("#org-select").empty().append('<option class="hidden" value="">Select an organization</option>').attr("disabled","disabled");
    $("#tournament-select").empty().append('<option class="hidden" value="">Select a tournament</option>').attr("disabled","disabled");
    $("#team-select").empty().append('<option class="hidden" value="">Select a team</option>').attr("disabled","disabled");
}

function getTournamentName(tournament) {
    var result;
    console.log("tournament", tournament);
    firebase.database().ref("/tournaments_names_orgs/"+ tournament).once("value").then(function (snapshot) {
        result = snapshot.val();
        setDropdownMenuItems("tournament-select", [tournament], [result], false, "");
    });
}

function loadTournamentInfo() {
    console.log("called");
    var currentOrg = $("#org-select").val();
    $("#tournament-select").empty().append('<option class="hidden" value="">Select a tournament</option>').attr("disabled","disabled");
    $("#team-select").empty().append('<option class="hidden" value="">Select a team</option>').attr("disabled","disabled");
    firebase.database().ref("/organizations/"+ currentOrg +"/tournaments").once("value").then(function (snapshot) {
        for (var i = 0; i < snapshot.val().length; i++) {
            getTournamentName(snapshot.val()[i]);
        }
    }, function (error) {}).then(function () {
        firebase.database().ref("/organizations/"+ currentOrg +"/teams").once("value").then(function (snapshot) {
            var teamList = [];
            console.log(snapshot.val());
            for (var team in snapshot.val()) {
                teamList.push(team);
            }
            setDropdownMenuItems("team-select", teamList, teamList, true, "Select a team");
        });
    });
}

function fillOrgSelect(orgs) {
    var i = 0;
    resetDropdowns();
    while (i < orgs.length) {
        firebase.database().ref("/organizations/"+ orgs[i]).once("value").then(function (snapshot) {
            setDropdownMenuItems("org-select", [snapshot.key], [snapshot.val().name], false, "");
        }).catch(function (error) {});
        i++;
    }
}

function getUserOrgs() {
    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref("/users/"+ userId).once("value").then(function (snapshot) {
        globalInfo.userorgs = snapshot.val().userorgs;
        fillOrgSelect(globalInfo.userorgs);
    });
}

function firebaseInit() {
    firebase.initializeApp(config);
}

function signOut() {
    firebase.auth().signOut();
}

firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        signedInUser = user;
        $("#sign-in").hide();
        getUserOrgs();
    } else {
        window.location = "/auth"; //user is not signed in, redirect to sign in page
    }
});
