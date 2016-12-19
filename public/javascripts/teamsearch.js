console.log("firebase init");
var config = {
    apiKey: "AIzaSyAIvK9HrI4P7MJlzjOHmcWeja2BPEInuTo"
    , authDomain: "wa-robotics-scout.firebaseapp.com"
    , databaseURL: "https://wa-robotics-scout.firebaseio.com"
    , storageBucket: "wa-robotics-scout.appspot.com"
    , messagingSenderId: "490870467180"
};
firebaseInit();
var globalInfo = {};

function getOrgTeams(org, userId) {
    console.log("/organizations/"+ org +"/teams");
    firebase.database().ref("/organizations/"+ org +"/teams").once("value").then(function (snapshot) {
        globalInfo.teams = snapshot.val();
    });
}

function getUserOrgs() {
    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref("/users/"+ userId).once("value").then(function (snapshot) {
        globalInfo.userorgs = snapshot.val().userorgs;
        getOrgTeams(globalInfo.userorgs[0], userId);
    });
    return globalInfo.userorgs;
}
console.log("global js ran");

function firebaseInit() {
    console.log("init ran");
    firebase.initializeApp(config);
}

function writeUserData(userId, name, email, imageUrl) {
    firebase.database().ref("users/"+ userId).set({
        username: name
        , email: email
        , profile_picture: imageUrl
        , organizations: []
    });
}
firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        signedInUser = user;
        firebase.database().ref("users/"+ user.uid).once("value").then(function (snapshot) {
            if (!snapshot.val()) {
                writeUserData(signedInUser.uid, signedInUser.displayName, signedInUser.email, signedInUser.photoURL);
            }
            console.log(getUserOrgs());
        });
        $("#sign-in").hide();
    }
    else {
        console.log("Not signed in");
    }
});

function signIn() {
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then(function (result) {
        // This gives you a Google Access Token. You can use it to access the Google API.
        var token = result.credential.accessToken;
        // The signed-in user info.
        var user = result.user;
        signedInUser = user;
        console.log(signedInUser);
        console.log("Login Succeeded!");
        console.log(user);
        // ...
    }).catch(function (error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // The email of the user's account used.
        var email = error.email;
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;
        // ...
        console.log("Login Failed!");
        console.log(errorCode, errorMessage, email, credential);
    });
    $(document).ready(function () {
        $("#search").click(function () {
            var search = $("#search-team").val();
            if (/^[0-9]{1,5}[a-zA-Z]?$/.test(search)) {
                getTeamInfo(search);
            }
        });
    });
}

    function processResults(value) {
        var data = value.results;
        console.log(data);
    }

    function getTeamInfo(team) {
        //!!! NO REFRESH IS ENABLED!!!
        var url = "https://script.google.com/a/macros/woodward.edu/s/AKfycbxsKMe0cdyYScaJXipBoA2bFSY8Aj-jxlQqyS4aDOI/dev?prefix=processResults&norefresh&type=getTeamInfo&id=1vrZQpvtiJvcyKdlULZk5HOyRU5ystAiMZ4y8rF6d&id=" + instanceID + "&team=" + team;
        //get match details to determine which teams are competing in this match
        $("body").append('<script src="' + url + '"><\/script>');
    }

function signOut() {
    firebase.auth().signOut();
}
