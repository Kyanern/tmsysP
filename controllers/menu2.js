const express = require('express');
const router = express.Router();
const checksModel = require('../models/checks');

// middleware that is specific to this router
router.use(async (req, res, next) => {
    console.log('Time: ', Date.now());

    if(!req.session.isLoggedIn){
        res.redirect('login');
        return;
    }
    req.body.isAdmin = await checksModel.checkGroup(req.session.userid, 'admin');

    next();
});

router.get('/', (req,res)=>{
    res.render('menu2', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin});
});

module.exports = router;