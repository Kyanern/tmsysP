const express = require('express');
const router = express.Router();
const checksModel = require('../models/checks');
const dbModel = require('../models/db');
const argon2Model = require('../models/argon2');
const errorStr = require('../config/errorstring.config.json');

// middleware that is specific to this router
router.use(async (req, res, next) => {
    // console.log('Time: ', Date.now());

    if(!req.session.isLoggedIn){
        res.redirect('/login');
        return;
    }

    next();
});

router.get('/passwordchange', (req,res)=>{
    res.render('user_passwordchange', {isLoggedIn: req.session.isLoggedIn});
});

router.post('/passwordchange', async (req,res)=>{
    const {passwordOld, passwordNew, passwordNew2} = req.body;
    if(!(passwordNew === passwordNew2)){
        res.render('user_passwordchange', {isLoggedIn:req.session.isLoggedIn, error: errorStr.passwordDiffNew});
        return;
    }
    if (passwordOld === passwordNew){
        res.render('user_passwordchange', {isLoggedIn:req.session.isLoggedIn, error: errorStr.passwordOldNewSame});
        return;
    }
    if (!checksModel.checkPasswordRequirements(passwordNew)){
        res.render('user_passwordchange', {isLoggedIn: req.session.isLoggedIn, error:errorStr.passwordReqFail});
    }

    //1. verify old password
    //2a. if isOK, hash new password and update.
    //2b. if not isOK, error out.
    var myQuery = `SELECT ${dbModel.getDbLoginSchemaColPassword()} FROM ${dbModel.getDbLoginSchema()} WHERE ${dbModel.getDbLoginSchemaColUsername()}='${req.session.username}'`;
    let retQ = await dbModel.performQuery(myQuery);
    let result = retQ.result;
    let error = retQ.error;

    if(error){
        res.render('user_passwordchange', {isLoggedIn: req.session.isLoggedIn, error:errorStr.internalErrorDB});
        return;
    }
    if(result.length > 1 || result.length < 1){
        res.render('user_passwordchange', {isLoggedIn: req.session.isLoggedIn, error:'An Internal Error occurred. (Database or Website)'});
        return;
    }

    let retver = new Object();
    retver = await argon2Model.argon2Verify(result[0].password,passwordOld);
    if(retver.error){
        res.render('user_passwordchange', {isLoggedIn: req.session.isLoggedIn, error:errorStr.internalErrorArgon2});
        return;
    }
    if(!retver.verified){
        // console.log('***');
        // console.log(result[0].password);
        // console.log('XXX');
        // console.log(passwordOld);
        // console.log('===');
        // console.log(retver.verified);
        // console.log('***');
        res.render('user_passwordchange', {isLoggedIn: req.session.isLoggedIn, error:errorStr.passwordOldWrong});
        return;
    }

    let rethash = new Object();
    rethash = await argon2Model.argon2Hash(passwordNew);
    if(rethash.error){
        res.render('user_passwordchange', {isLoggedIn: req.session.isLoggedIn, error:errorStr.internalErrorArgon2});
        return;
    }

    myQuery = `UPDATE ${dbModel.getDbLoginSchema()} SET ${dbModel.getDbLoginSchemaColPassword()}='${rethash.hash}' WHERE ${dbModel.getDbLoginSchemaColUsername()}='${req.session.username}'`;
    retQ = await dbModel.performQuery(myQuery);
    result = retQ.result;
    error = retQ.error;
    if(error){
        res.render('user_passwordchange', {isLoggedIn: req.session.isLoggedIn, error:errorStr.internalErrorDB});
        return;
    }

    if (result.changedRows){
        var successString = 'Password successfully changed.';
        res.render('user_passwordchange', {isLoggedIn: req.session.isLoggedIn, success:successString});
    } else {
        res.render('user_passwordchange', {isLoggedIn: req.session.isLoggedIn, error:errorStr.internalErrorWebsite});
    }
});

router.get('/emailchange', (req, res)=>{
    res.render('user_emailchange',{isLoggedIn: req.session.isLoggedIn, error: false});
});

router.post('/emailchange', async (req,res)=>{
    const { emailNew } = req.body;
    let myQuery = `UPDATE ${dbModel.getDbLoginSchema()} SET ${dbModel.getDbLoginSchemaColEmail()}='${emailNew}' WHERE ${dbModel.getDbLoginSchemaColUsername()}='${req.session.username}'`;
    let retQ = await dbModel.performQuery(myQuery);
    let result = retQ.result;
    let error = retQ.error;
    if(error){
        res.render('user_emailchange', {isLoggedIn: req.session.isLoggedIn, error:errorStr.internalErrorDB});
        return;
    }
    if (result.changedRows){
        var successString = 'Email successfully changed.';
        res.render('user_emailchange', {isLoggedIn: req.session.isLoggedIn, success:successString});
    } else {
        res.render('user_emailchange', {isLoggedIn: req.session.isLoggedIn, error:errorStr.internalErrorWebsite});
    }
});


module.exports = router;