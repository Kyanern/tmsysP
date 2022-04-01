const express = require('express');
const router = express.Router();
const checksModel = require('../models/checks');
const dbModel = require('../models/db');
const errorStr = require('../config/errorstring.config.json');

// middleware that is specific to this router
router.use(async (req, res, next) => {
    console.log('Time: ', Date.now());

    if(!req.session.isLoggedIn){
        res.redirect('/login');
        return;
    }
    req.body.isAdmin = await checksModel.checkGroup(req.session.username, 'admin');
    console.log(req.body);
    next();
});

router.get('/', 
    (req,res)=>{
        res.render('tmsys', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin});
    }
);

router.post('/', 
    async (req,res,next)=>{
        //handles create application form button
        let {btn_createApp} = req.body;
        if(!btn_createApp){
            next();
        } else {
            let {createAppAcronym, createAppDescription, createAppDateStart, createAppDateEnd} = req.body;
            let {createAppPermitOpen, createAppPermitToDo, createAppPermitDoing, createAppPermitDone} = req.body;

            let myQuery = `INSERT INTO ${dbModel.getDbApplicationSchema()}(${dbModel.getDbColFormat_CreateApplication()})`;
            myQuery += ` VALUES('${createAppAcronym}','${createAppDescription}','${createAppDateStart}','${createAppDateEnd}','${createAppPermitOpen}','${createAppPermitToDo}','${createAppPermitDoing}','${createAppPermitDone}')`;
            let retQ = await dbModel.performQuery(myQuery);
            let error= retQ.error;
            let options = {
                isLoggedIn: req.session.isLoggedIn,
                canAdmin: req.body.isAdmin
                //TODO: add in isRoles here
            }
            if(error){
                console.log('\n***\n'+error+'\n***\n');
                options.error = errorStr.internalErrorDB;
                res.render('tmsys', options);
                return;
            }
            options.success = `Application ${createAppAcronym} successfully created`;
            res.render('tmsys', options);
        }
    }
)

module.exports = router;