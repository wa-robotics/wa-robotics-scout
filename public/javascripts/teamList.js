var page = "teamList";

function renderTable () {
    $('#table_id').DataTable({
        fixedColumns: true,
        "scrollX": true,
        paging:false,
        ajax:"/api/" + userDefaults.tournamentSku + "/skills",
        "columns": [

            { "data": "team",
              "class": "align-right"},
            /*{ "data": "star" }*/
            { "data": null,
             "render":function(data,type,full,meta) {
             return '<button class="mdl-button mdl-js-button mdl-button--icon star-team-btn"><i id="' + data.team + '" class="material-icons">star_border</i></button>';
             }
            }

            // { "data": "r" },
            //{ "data": "p" },

        ]
        /*"aaSorting": [[ 1, "asc" ], [2, "asc"], [3, "asc"], [4, "asc"]]*/
    });

    $("#table-container").removeClass("hidden");
    $("#team-list-data-loading").removeClass("is-active");

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

var config = {
    apiKey: "AIzaSyAIvK9HrI4P7MJlzjOHmcWeja2BPEInuTo",
    authDomain: "wa-robotics-scout.firebaseapp.com",
    databaseURL: "https://wa-robotics-scout.firebaseio.com",
    storageBucket: "wa-robotics-scout.appspot.com",
    messagingSenderId: "490870467180"
};
firebaseInit();


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
        getUserDefaults();
    } else {
        window.location = "/auth"; //user is not signed in, redirect to sign in page
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
    var i = $(this).children("i")
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

$(document).ready(function() {
    $("#table_id").on("click","tbody > tr > td > button.star-team-btn","",teamToggleStar);
});