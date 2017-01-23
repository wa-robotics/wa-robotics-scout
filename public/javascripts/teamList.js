var page = "teamList";

function renderTable () {
    $('#table_id').DataTable({
        fixedColumns: true,
        "scrollX": true,
        paging:false,
        ajax:"/api/" + userDefaults.tournamentSku + "/skills",
        "columns": [
            { "data": null,
                "render":function(data,type,full,meta) {
                    return '<button class="mdl-button mdl-js-button mdl-button--icon star-match-btn"><i id="' + data.team + '" class="material-icons">star_border</i></button>';
                }
            },
            { "data": "team" },
            // { "data": "r" },
            //{ "data": "p" },

        ]
        /*"aaSorting": [[ 1, "asc" ], [2, "asc"], [3, "asc"], [4, "asc"]]*/
    });

    $("#table-container").removeClass("hidden");
    $("#team-list-data-loading").removeClass("is-active");
}

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