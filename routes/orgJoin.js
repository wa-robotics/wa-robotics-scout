const express = require('express');
const router = express.Router();
 /* GET home page. */
router.get('/:orgauth', function (req, res, next) {
    let code = req.params.orgauth;
    if (code.length !== 7) {
        next();
    }
    res.render('auth', {
        title: 'WARS: Sign in',
        orgJoin: code
    });
});


module.exports = router;
