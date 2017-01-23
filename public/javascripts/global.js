var userDefaults;
function getUserDefaults() {
    var db = firebase.database();
    db.ref("/userDefaults/" + firebase.auth().currentUser.uid).once("value").then(function (snapshot) {
        userDefaults = snapshot.val();
        /*organization = userDefaults.org;
        tournament = userDefaults.tournament;
        team = userDefaults.team;*/
        if (userDefaults === null || new Date(userDefaults.expiry).getDate() < new Date().getDate()) { //defaults have expired
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
        $("#viewing-info > div").text("Viewing " + userDefaults.orgName + " > " + userDefaults.tournamentName);
        $("#viewing-info").removeClass("hidden");
        if (page === "index") {
            getTeamMatches();
        } else if (page === "teamList") {
            renderTable();
        }
    });
}
