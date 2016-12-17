const express = require('express');
const router = express.Router();
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://wa-robotics-scout.firebaseio.com",
    databaseAuthVariableOverride: {
        uid: "org-join-manager"
    }
});

function validateOrgAuthCodeFormat(code, next) {
    if (code.length !== 7) {
        next();
    }
}

router.get('/:orgauth', function (req, res, next) {
    let code = req.params.orgauth;
    validateOrgAuthCodeFormat(code);
    let orgName = "";

    console.log(code);
    var db = admin.database();
    var ref = db.ref("/orgInvites/" + code);
    Promise.all([ref.once("value")]).then(function (snapshots) {
        return snapshots;
    }).then(function (snapshots) {
        let id = snapshots[0].val();
        console.log(snapshots[0].val());
        if (id === null) { //id is null; this invite code is invalid
            //send an error
            console.info("Code " + code + " is invalid.");
        } else {
            console.log("The organization which corresponds to this invite code is " + id);
            console.log("/organizations/" + id + "/name");
            return db.ref("/organizations/" + id + "/name").once("value");
        }

    }).then(function (name) {
        console.log(name.val());
        console.log("The organization this invite is for is called " + name.val());
        orgName = name.val();
        res.render('orgjoin', {
            title: 'WARS: Join organization',
            orgJoin: code,
            orgNameServer: orgName
        });
    }).catch(function (error) {
        console.error("Server error: " + error.message);
        res.locals.message = error.message;
        res.locals.error = req.app.get("env") === "development" ? error : {};
        // render the error page
        res.status(500);
        res.render("error", {
            showMenu: true
        });
    });


});


function getUid(token) {
    admin.auth().verifyIdToken(token).then(function(decodedToken) {
        console.log("decodedtoken",decodedToken.uid);
        return decodedToken.uid;
    });
}

router.post('/:orgauth/add', function (req, res, next) {
    const code = req.params.orgauth;
    const token = req.body.token;
    const teamNum = req.body.teamNum.toUpperCase();
    console.log("teamnum",teamNum);
    //console.log("token",req.body.toString());
    let orgId;
    let uid;
    validateOrgAuthCodeFormat(code);
    //Process:
    //1. Validate the orgauth token and if valid, get the organization it corresponds to
    //2. Take the user's token and get the UID from it (this prevents tampering
    //   and prevents invalid UIDs from being added to an organization's user list
    //3. Add the user to the organization assuming steps 1 and 2 complete successfully

    const db = admin.database();
    db.ref("/orgInvites/" + code).once("value").then(function(snapshot) {
        orgId = snapshot.val();
        console.log("oid",orgId);
        if (orgId !== null) { //the invite code is valid since an organization ID was returned
            return admin.auth().verifyIdToken(token);
        } else {
            Promise.reject(); //stop and throw an error; the code is invalid
        }
    }).then(function(decodedToken) {
        uid = decodedToken.uid;
        return db.ref("/organizations/" + orgId + "/users/" + uid).set(true);
    }).then(function() {
        let teamObj = {};
        if (/^[0-9]{1,5}[a-zA-Z]?$/.test(teamNum)) {
            teamObj[teamNum] = true;
            return db.ref("/organizations/" + orgId + "/teams").update(teamObj);
        }
    }).then(function() {
        res.status(200);
        res.send({"result":"added","status":1});
    }).catch(function (error) {
        console.error("Server error: " + error.message);
        res.status(500);
        res.send({"result":"error","status":0});
    });


});

module.exports = router;
