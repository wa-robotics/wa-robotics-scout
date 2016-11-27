var express = require('express');
var httpAuth = require('basic-auth');
var router = express.Router();
/* GET home page. */

function auth (req, res, next) {
    if (process.env.DEPLOY_TYPE === "STAGING") {
        let creds = httpAuth(req);
        if (!creds || creds.name !== process.env.STAGING_USER ||
            creds.pass !== process.env.STAGING_PW) {
            res.setHeader('WWW-Authenticate', 'Basic realm="example"');
            const err = new Error("Forbidden");
            err.status = 403;
            res.locals.message = err.message;
            res.locals.error = req.app.get("env") === "development" ? err : {};
            // render the error page
            res.status(err.status || 500);
            res.render("error");
        } else {
            return next();
        }
    } else { //No auth required for production
        return next();
    }
}

router.get('/', auth,function (req, res, next) {
    res.render('index', {
        title: 'WARS: Dashboard'
    });
});
module.exports = router;