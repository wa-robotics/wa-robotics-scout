const express = require("express");
const httpAuth = require("basic-auth");

exports.basicAuth = function () {
    return function (req,res,next) {
        let user = httpAuth(req);
        if (!user || user.name !== process.env.STAGING_USER ||
            user.pass !== process.env.STAGING_PW) {
            res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
            const err = new Error("Unauthorized");
            err.status = 401;
            res.locals.message = err.message;
            res.locals.error = req.app.get("env") === "development" ? err : {};
            // render the error page
            res.status(err.status || 500);
            res.render("error",  { showMenu: false });
        } else {
            next();
        }
    };

};
