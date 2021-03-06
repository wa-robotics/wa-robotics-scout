var express = require('express');
var router = express.Router();

//show an error if no sku is provided
//TODO: this should go to a page where the user can choose a tournament to use for scouting

router.get('/matchinfo/:org/:tournament/:qmatchnum',function (req, res, next) {
    //let sanitizedSku = req.params.sku.toUpperCase().trim();
    /*if (!/RE-VRC-[0-9]{2}-[0-9]{4}/gi.test(sanitizedSku)) {
     next();
     }*/
    res.render('matchinfo', {
        title: 'WARS: Scout matches',
        tournament: req.params.tournament,
        org: req.params.org,
        qmatch: req.params.qmatchnum
    });
});

router.get('/', function (req, res, next) {
    //let sanitizedSku = req.params.sku.toUpperCase().trim();
    /*if (!/RE-VRC-[0-9]{2}-[0-9]{4}/gi.test(sanitizedSku)) {
     next();
     }*/
    res.render('scout', {
        title: 'WARS: Scout matches'
    });
});


router.get('/:org/:tournament', function (req, res, next) {
    //let sanitizedSku = req.params.sku.toUpperCase().trim();
    /*if (!/RE-VRC-[0-9]{2}-[0-9]{4}/gi.test(sanitizedSku)) {
        next();
    }*/
    res.render('scout', {
        title: 'WARS: Scout matches',
        tournament: req.params.tournament,
        org: req.params.org
    });
});


module.exports = router;
