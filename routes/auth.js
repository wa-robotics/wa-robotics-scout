var express = require('express');
var router = express.Router();
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('auth', {
        title: 'WARS: Sign in',
        orgjoin: false
    });
});
module.exports = router;