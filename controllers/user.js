const express = require('express');
const router = express.Router();
const checksModel = require('../models/checks');
const dbModel = require('../models/db');
const argon2Model = require('../models/argon2');
// middleware that is specific to this router
router.use(async (req, res, next) => {
    console.log('Time: ', Date.now());

    if(!req.session.isLoggedIn){
        res.redirect('login');
        return;
    }

    next();
});

router.get('/passwordchange', (req,res)=>{
    res.render('passwordchange', {isLoggedIn: req.session.isLoggedIn});
});

router.post('/passwordchange', async (req,res)=>{
    const {passwordOld, passwordNew, passwordNew2} = req.body;
    if(!(passwordNew === passwordNew2)){
        var errorString = 'Please enter the same password in both New Password fields.';
        res.render('passwordchange', {isLoggedIn:req.session.isLoggedIn, error: errorString});
        return;
    }
    if (passwordOld === passwordNew){
        var errorString = 'Old password and new password fields cannot contain the same string.';
        res.render('passwordchange', {isLoggedIn:req.session.isLoggedIn, error: errorString});
        return;
    }
    if (!checksModel.checkPasswordRequirements(passwordNew)){
        var errorString = 'Please ensure your new password is between 8 to 10 characters. It must also contain at least one alphabet, one number and one special character.';
        res.render('passwordchange', {isLoggedIn: req.session.isLoggedIn, error:errorString});
    }

    //1. verify old password
    //2a. if isOK, hash new password and update.
    //2b. if not isOK, error out.
    var myQuery = `SELECT ${dbModel.getDbLoginSchemaColPassword()} FROM ${dbModel.getDbLoginSchema()} WHERE ${dbModel.getDbLoginSchemaColId()}='${req.session.userid}'`;
    let retQ = await dbModel.performQuery(myQuery);
    let result = retQ.result;
    let error = retQ.error;

    if(error){
        res.render('passwordchange', {isLoggedIn: req.session.isLoggedIn, error:'An Internal Error occurred. (Database)'});
        return;
    }
    if(result.length > 1 || result.length < 1){
        res.render('passwordchange', {isLoggedIn: req.session.isLoggedIn, error:'An Internal Error occurred. (Database or Website)'});
        return;
    }

    let retver = new Object();
    retver = await argon2Model.argon2Verify(result[0].password,passwordOld);
    if(retver.error){
        res.render('passwordchange', {isLoggedIn: req.session.isLoggedIn, error:'An Internal Error occurred. (argon2 - verify)'});
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
        res.render('passwordchange', {isLoggedIn: req.session.isLoggedIn, error:'Old Password is incorrect.'});
        return;
    }

    let rethash = new Object();
    rethash = await argon2Model.argon2Hash(passwordNew);
    if(rethash.error){
        res.render('passwordchange', {isLoggedIn: req.session.isLoggedIn, error:'An Internal Error occurred. (argon2 - hash)'});
        return;
    }

    myQuery = `UPDATE ${dbModel.getDbLoginSchema()} SET ${dbModel.getDbLoginSchemaColPassword()}='${rethash.hash}' WHERE ${dbModel.getDbLoginSchemaColId()}='${req.session.userid}'`;
    retQ = await dbModel.performQuery(myQuery);
    result = retQ.result;
    error = retQ.error;
    if(error){
        res.render('passwordchange', {isLoggedIn: req.session.isLoggedIn, error:'An Internal Error occurred. (Database)'});
        return;
    }

    if (result.changedRows){
        var successString = 'Password successfully changed.';
        res.render('passwordchange', {isLoggedIn: req.session.isLoggedIn, success:successString});
    } else {
        var errorString = 'An Internal Error occurred. (Website)'
        res.render('passwordchange', {isLoggedIn: req.session.isLoggedIn, error:errorString});
    }
});

router.get('/emailchange', (req, res)=>{
    res.render('emailchange',{isLoggedIn: req.session.isLoggedIn, error: false});
});

router.post('/emailchange', async (req,res)=>{
    const { emailNew } = req.body;
    let myQuery = `UPDATE ${dbModel.getDbLoginSchema()} SET ${dbModel.getDbLoginSchemaColEmail()}='${emailNew}' WHERE ${dbModel.getDbLoginSchemaColId()}='${req.session.userid}'`;
    let retQ = await dbModel.performQuery(myQuery);
    let result = retQ.result;
    let error = retQ.error;
    if(error){
        res.render('emailchange', {isLoggedIn: req.session.isLoggedIn, error:'An Internal Error occurred. (Database)'});
        return;
    }
    if (result.changedRows){
        var successString = 'Password successfully changed.';
        res.render('emailchange', {isLoggedIn: req.session.isLoggedIn, success:successString});
    } else {
        var errorString = 'An Internal Error occurred. (Website)'
        res.render('emailchange', {isLoggedIn: req.session.isLoggedIn, error:errorString});
    }
});


module.exports = router;