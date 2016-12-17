var express = require('express');
var router = express.Router();
/* GET home page. */
router.get('/', function (req, res, next) {
    let redirect = "",
        inviteCode = "";
    console.log(req.query.then);
    console.log(req.query.code);
    if (req.query.then === "join") {
        redirect = "join";
        inviteCode = req.query.code;
    }
    res.render('auth', {
        title: 'WARS: Sign in',
        orgjoin: false,
        redirect: redirect,
        inviteCode: inviteCode
    });
});
module.exports = router;