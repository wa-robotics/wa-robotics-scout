var express = require('express');
var router = express.Router();
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('scout', {
        title: 'WARS: Scout matches'
    });
});


module.exports = router;
