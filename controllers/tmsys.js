const express = require('express');
const router = express.Router();
const checksModel = require('../models/checks');
const dbModel = require('../models/db');
const errorStr = require('../config/errorstring.config.json');

// middleware that is specific to this router
router.use(async (req, res, next) => {
    // console.log('Time: ', Date.now());

    if(!req.session.isLoggedIn){
        res.redirect('/login');
        return;
    }
    req.body.isAdmin = await checksModel.checkGroup(req.session.username, 'admin');
    // console.log(req.body);
    next();
});

router.get('/', 
    async (req,res)=>{
        //first query what usergroups this user belong to.
        let retgrp = await dbModel.performQuery_selUsergroupsOfUser(req.session.username);
        if(retgrp.error){
            //console.dir(retgrp.error);
            res.render('tmsys', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin, error:errorStr.internalErrorDB});
            return;
        }
        if(retgrp.result.length !== 1){
            //console.log("retgrp.result.length: potential database error at usergroup");
            res.render('tmsys', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin, error:errorStr.internalErrorDB});
            return;
        }
        let usergroup = helperModel.regexfy_usergroup(retgrp.result[0].usergroup);
        //then query what applications this user can view
        //query substrings
        //SUGGESTION: make a App_permit_View column and REGEXP_LIKE only that column. Create application code need to change also.
        let qSELECTFROM = `SELECT ${dbModel.getDbColFormat_ListApplications()} FROM ${dbModel.getDbApplicationSchema()} `;
        let qWHERE = `WHERE `;
        let qOR = `OR `;
        let qAND = `AND `;
        let qCond1 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitOpen()}, '${usergroup}') `;
        let qCond2 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitToDo()}, '${usergroup}') `;
        let qCond3 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitDoing()}, '${usergroup}') `;
        let qCond4 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitDone()}, '${usergroup}') `;
        let qCond5 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitCreatePlan()}, '${usergroup}') `;
        let qCond6 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitCreateTask()}, '${usergroup}') `;
        //construct query
        let appQuery = qSELECTFROM + qWHERE + '(' + qCond1 + qOR + qCond2 + qOR + qCond3 + qOR + qCond4 + qOR + qCond5 + qOR + qCond6 + ')';
        //console.log(appQuery);
        let retapp = await dbModel.performQuery(appQuery);
        if(retapp.error){
            //console.dir(retapp.error);
            res.render('tmsys', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin, error:errorStr.internalErrorDB});
            return;
        }
        if(retapp.result.length === 0){
            res.render('tmsys', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin, error:errorStr.listTasksNoApps});
            return;
        }
        let acronyms = helperModel.regexfy_appAcronyms(retapp.result);
        //then query what tasks this user can see.
        // 2022-04-12: Separate into 5 different queries.
        qSELECTFROM = `SELECT ${dbModel.getDbColFormat_ListTasks()} FROM ${dbModel.getDbTaskSchema()} `;
        let qCond7a = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumOpen()}' `;
        let qCond7b = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumToDo()}' `;
        let qCond7c = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumDoing()}' `;
        let qCond7d = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumDone()}' `;
        let qCond7e = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumClosed()}' `;
        let qCond8 = `REGEXP_LIKE(${dbModel.getDbTaskSchemaColAcronym},'${acronyms}') `;
        //TODO: complete render task cards.

        //res.render('tmsys', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin});
    }
);

router.post('/', 
    //handles create application form button
    async (req,res,next)=>{
        let {btn_createApp} = req.body;
        if(!btn_createApp){
            next();
        } else {
            let {createAppAcronym, createAppNumber, createAppDescription, createAppDateStart, createAppDateEnd} = req.body;
            let {createAppPermitOpen, createAppPermitToDo, createAppPermitDoing, createAppPermitDone, createAppPermitCreatePlan, createAppPermitCreateTask} = req.body;

            let myQuery = `INSERT INTO ${dbModel.getDbApplicationSchema()}(${dbModel.getDbColFormat_CreateApplication()})`;
            myQuery += ` VALUES('${createAppAcronym}', '${createAppNumber}', '${createAppDescription}','${createAppDateStart}','${createAppDateEnd}','${createAppPermitOpen}','${createAppPermitToDo}','${createAppPermitDoing}','${createAppPermitDone}','${createAppPermitCreatePlan}','${createAppPermitCreateTask}')`;
            let retQ = await dbModel.performQuery(myQuery);
            let error= retQ.error;
            let options = {
                isLoggedIn: req.session.isLoggedIn,
                canAdmin: req.body.isAdmin
            }
            if(error){
                // console.log('\n***\n'+error+'\n***\n');
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