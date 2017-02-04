var userDefaults;
function getUserDefaults() {
    var db = firebase.database();
    db.ref("/userDefaults/" + firebase.auth().currentUser.uid).once("value").then(function (snapshot) {
        userDefaults = snapshot.val();
        /*organization = userDefaults.org;
         tournament = userDefaults.tournament;
         team = userDefaults.team;*/
        //console.log(new Date(userDefaults.expires));
        console.log(new Date().getDate());
        if (userDefaults == null) {  //if userDefaults is null, redirect to selection page
            window.location = "/select";
        } else if (new Date(userDefaults.expires) < new Date()) { //defaults have expired
            window.location = "/select";
        }
        console.log(userDefaults);
        return db.ref("/organizations/" + userDefaults.org + "/name").once("value");
    }).then(function (snapshot) {
        userDefaults.orgName = snapshot.val();
        return db.ref("/tournaments_names_orgs/" + userDefaults.tournament).once("value");
    }).then(function (snapshot) {
        userDefaults.tournamentName = snapshot.val();
        return db.ref("/tournaments/" + userDefaults.tournament + "/sku").once("value");
    }).then(function (snapshot) {
        userDefaults.tournamentSku = snapshot.val();
        $("#viewing-info > div").text("Viewing " + userDefaults.orgName + " > " + userDefaults.tournamentName).append(' (<a href="/select">change</a>)');
        $("#viewing-info").removeClass("hidden");
        if (page === "index") {
            getTeamMatches();
        } else if (page === "teamList") {
            renderTable();
        } else if (page === "scout") {
            firebase.database().ref('/tournaments/' + userDefaults.tournament + '/sku').once('value').then(function (snapshot) {
                sku = snapshot.val();
                finishGetUnscoredMatches(sku);
            });
        } else if (page === "matchInfo") {
            getTeamsInMatch(userDefaults.tournamentSku);
        }
    });
}
