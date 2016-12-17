firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        signedInUser = user;
        firebase.database().ref("users/" + user.uid).once("value").then(function (snapshot) {
            if (!snapshot.val()) {
                writeUserData(signedInUser.uid, signedInUser.displayName, signedInUser.email, signedInUser.photoURL);
            }
        });

    }
    else {
        $("#firebaseui-auth-container").removeClass("hidden");
        $("#sign-in-loading").removeClass("is-active").addClass("hidden");
        // Initialize the FirebaseUI Widget using Firebase.

        // The start method will wait until the DOM is loaded.
        var ui = new firebaseui.auth.AuthUI(firebase.auth());
        ui.start('#firebaseui-auth-container', uiConfig);
    }
});

$(document).ready(function() {
    componentHandler.upgradeAllRegistered(); //to make sure the loading spinner appears and not just "Loading..."
});