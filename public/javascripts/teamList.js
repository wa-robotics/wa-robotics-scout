var page = "teamList";

function finishRenderTable(response) {
    console.log(response);


    $('#table_id').DataTable({
         fixedColumns: true,
         "scrollX": true,
         paging:false,
         autoWidth:true,
         data:response,
         "columnDefs": [
             { targets: [0], width: '3em' },
             { targets: [2,3,4], width: '1em' },
             { targets: [7,14,15], width: '12em' },
             { targets: [9,12], width: '6em' },
             { targets: [13],"type":"numeric"}


         ],
         "columns": [
             {"title": "Team number",
              "class":"align-right"},
             {"title": "Star",
                 "render":function(data,type,row) {
                 return '<button class="mdl-button mdl-js-button mdl-button--icon star-team-btn"><i id="' + row[0] + '" class="material-icons">star_border</i></button>';
             }},
             {"title": "Last scouted match" },
             {"title": "Robot type" },
             {"title": "Claw sturdiness" },
             {"title": "Auton. swing" },
             {"title": "Auton. play" },
             {"title": "Score stats" },
             {"title": "Avg. stars held" },
             {"title": "Max stars held" },
             {"title": "Avg. cubes held" },
             {"title": "Max cubes held" },
             {"title": "Drops objects" },
             {"title": "Strafes" },
             {"title": "Hang" },
             {"title": "Max CS" },
             {"title": "Max RS"},
             {"title": "Max PS" },
       /*      { "data": "team",
                 "class": "align-right"},
             /!*{ "data": "star" }*!/
             { "data": null,


             }*/

             // { "data": "r" },
             //{ "data": "p" },

         ]//,
         //"order": [[ 3, "desc" ], [5, "desc"], [4, "desc"]]
     });
    $("#table-container").removeClass("hidden");
    $("#team-list-data-loading").removeClass("is-active");


    refreshTeamListData();
}

function renderTable () {
    firebase.auth().currentUser.getToken(/* forceRefresh */ false).then(function(idToken) {
        //console.log(idToken);
        firebase.database().ref("/tournaments/" + userDefaults.tournament + "/pretourneySkillsLastUpdated").once("value").then(function(snapshot) {
            var lastUpdate = new Date(snapshot.val()).toISOString();
            $("#skills-last-update").append(snapshot.val() + ".").removeClass("hidden");
        });
        $.ajax("/api/pretournament/fetch", {
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({"token": idToken,
                "tournament": userDefaults.tournament}),
            dataType:"json",
            success:finishRenderTable,
            error:function(e) { console.error(e); }
        });
    });

    //firebaseListenStars();
}
var run = true;

$("#table_id").on( 'draw.dt', function () {
    if (run) {
        $('tr td:nth-child(2)').each(function () {
            var team = $(this).children("button").children("i").attr("id");
            $(this).children("button").children("i").removeAttr("id");
            console.log("team id", team);
            $(this).attr('id', team);
        });
        firebaseListenStars();
    }
});




function firebaseListenStars() {
    var db = firebase.database();
    db.ref("/tournament_team_stars/" + userDefaults.tournament).on("child_added",function (snapshot) {
        var selector = "#" + snapshot.key;
        var t = $("#table_id").DataTable().cell(selector).node();
        $(t).children("button").children("i").text("star");
        console.log(selector);
        //$(selector).text("star");
        //$("#table_id").DataTable().draw();
    });

    db.ref("/tournament_team_stars/" + userDefaults.tournament).on("child_removed",function (snapshot) {
        var selector = "#" + snapshot.key;
        var t = $("#table_id").DataTable().cell(selector).node();
        $(t).children("button").children("i").text("star_border");
        //$("#table_id").DataTable().draw();
    });
}

function teamToggleStar() {
    var i = $(this).children("i");
    var state = i.text();
    var team = $(this).parents("td").attr("id");
    var tournament = userDefaults.tournament;
    if (state === "star_border") {
        console.log("star match");
        console.log("/tournament_match_stars/" + tournament + "/" + team);
        firebase.database().ref("/tournament_team_stars/" + tournament + "/" + team).set(true);

    } else if (state === "star") {
        console.log("unstar match");
        firebase.database().ref("/tournament_team_stars/" + tournament + "/" + team).remove();


    }
    console.log(team,state);
}

//from Google Developers - https://developers.google.com/web/fundamentals/engage-and-retain/push-notifications/permissions-subscriptions
function initialiseState() {
    if (Notification.permission !== 'granted') { //since user has given permission to show push notifciations,
        console.log('The user has not granted the notification permission.');
        return;
    } else if (Notification.permission === "blocked") {
        /* the user has previously denied push. Can't reprompt. */
    } else {
        /* show a prompt to the user */
    }

    // Use serviceWorker.ready so this is only invoked
    // when the service worker is available.
    navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
        serviceWorkerRegistration.pushManager.getSubscription()
            .then(function(subscription) {
                if (!subscription) {
                    // Set appropriate app states.
                    return;
                }
            })
            .catch(function(err) {
                console.log('Error during getSubscription()', err);
            });
    });
}

$(document).ready(function() {
    $("#table_id").on("click","tbody > tr > td > button.star-team-btn","",teamToggleStar);
    $("#refresh-skills-data").on("click",refreshTeamListData);



});

function refreshTeamListData() {
    //$("#refresh-skills-data").attr("disabled","disabled").text("Working...");
    firebase.auth().currentUser.getToken(/* forceRefresh */ false).then(function(idToken) {
        //console.log(idToken);
        $.ajax("/api/skills/pretournament/refresh", {
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                "token": idToken,
                "tournament": userDefaults.tournament
            }),
            dataType: "json",
            }
        ).then(function(result) {
           console.log("result",result);
        });
    });
}