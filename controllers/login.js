const express = require('express');
const router = express.Router();
const dbModel = require('../models/db');
const argon2Model = require('../models/argon2');
const errorStr = require('../config/errorstring.config.json');

// middleware that is specific to this router
router.use((req, res, next) => {
    // console.log('Time: ', Date.now());
    next();
});

router.get('/', (req,res)=>{
    res.render('login');
});

router.post('/', async(req,res)=>{
    const {username, password} = req.body;
    if(!username || !password){
        res.render('login', {error:errorStr.userPassWrong});
        return;
    }
    var myQuery = `SELECT ${dbModel.getDbColFormat_Login()} FROM ${dbModel.getDbLoginSchema()} WHERE ${dbModel.getDbLoginSchemaColUsername()} = '${username}'`;
    let {result, error} = await dbModel.performQuery(myQuery);
    // console.log('\n***\n' + typeof result[0].isactive + '\n***\n');
    if(error){
        //console.log('[ERROR] LOGIN:\n' + result.error);
        res.render('login', {error:errorStr.internalErrorDB});
        return;
    }
    if(result.length > 1){
        //console.log('[ERROR] LOGIN: Login attempt returned more than one row. Check database integrity.');
        res.render('login', {error:errorStr.internalErrorDB});
        return;
    }
    if(result.length < 1){
        res.render('login', {error:errorStr.userPassWrong});
        return;
    }
    if(!result[0].isactive){
        res.render('login', {error:errorStr.accountDisabled});
        return;
    }
    let retver = new Object();
    retver = await argon2Model.argon2Verify(result[0].password,password);
    if(retver.error){
        res.render('login', {error:errorStr.internalErrorArgon2});
        return;
    }
    if(!retver.verified){
        res.render('login', {error:errorStr.userPassWrong});
        return;
    }

    //login success
    req.session.isLoggedIn = true;
    req.session.username = result[0].username;
    res.redirect('/tmsys');
});

module.exports = router;