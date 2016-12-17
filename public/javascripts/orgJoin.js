firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        signedInUser = user;
        $("#sign-in-loading").removeClass("is-active").addClass("hidden");
    } else {
        window.location = "/auth?then=join&code=" + orgJoinCode; //user is not signed in, redirect to sign in page
    }
});

$(document).ready(function() {
    $("#finish-join-btn").on("click",finishJoin);
});


function redirectToIndex() {
    window.location = "/";
}

function showError(info) {
    console.log(info);
    $("#submit-error").removeClass("hidden").append("An error occurred while processing your request: " + info)
}
function finishJoin() {
    var teamNum = $("#team-stem").val();
    firebase.auth().currentUser.getToken(/* forceRefresh */ true).then(function(idToken) {
        console.log(idToken);
        $("#finish-join-btn").attr("disabled","disabled");
        $.ajax("/join/" + orgJoinCode + "/add", {
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({"token": idToken,
                                    "teamNum": teamNum}),
            dataType:"json",
            success:redirectToIndex,
            error:showError
        });
    });
}