const express = require("express");
const path = require("path");
const favicon = require("serve-favicon");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const index = require("./routes/index");
const search = require("./routes/search");
const api = require("./routes/api");
const scout = require("./routes/scout");
const authFlow = require("./routes/auth");
const utils = require("./utils");
const orgJoin = require("./routes/orgJoin");
const app = express();
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
//auth for staging instance on heroku
if (process.env.DEPLOY_TYPE === "STAGING") {
    app.use("/*", utils.basicAuth());
}
app.use("/", index);
app.use("/teams",function (req, res, next) {
    res.render("teamlist", {
        title: "WARS: Team list",
        showMenu: true
    });
});
app.use("/select", function (req,res,next) {
    res.render("selectTournament", {
        title: "WARS: Select tournament",
        showMenu: true
    });
});
app.use("/search", search);
app.use("/api", api);
app.use("/scout", scout);
app.use("/auth", authFlow);
app.use("/join",orgJoin);
app.use("/terms/privacy", function (req, res, next) {
        res.render("privacypolicy", {
            title: "WARS: Privacy policy",
            showMenu: true
        });
    });
    // catch 404 and forward to error handler
app.use(function (req, res, next) {
    const err = new Error("Not Found");
    err.status = 404;
    next(err);
});
// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render("error", {
        showMenu: true
    });
});
module.exports = app;
