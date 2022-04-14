const express = require('express');
const router = express.Router();
const checksModel = require('../models/checks');
const dbModel = require('../models/db');
const errorStr = require('../config/errorstring.config.json');
const commonStr = require('../config/commonstring.config.json');
const helperModel = require('../models/helperfuncs')

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
    //AJAX GET request for details of specific task
    async (req,res,next)=>{
        let {requestFrom} = req.query;
        if(requestFrom !== 'detailsTaskModal'){
            next();
        } else {
            let {value} = req.query;
            let taskQuery = `SELECT ${dbModel.getDbColFormat_TaskDetails()} FROM ${dbModel.getDbTaskSchema()} WHERE ${dbModel.getDbTaskSchemaColID()} = '${value}'`;
            let rettask = await dbModel.performQuery(taskQuery);
            if(rettask.error){
                //console.dir(rettask.error);
                res.send({error: errorStr.internalErrorDB});
                return;
            }
            if(rettask.result.length !== 1){
                //console.log('There might be a problem with the database.');
                res.send({error: errorStr.internalErrorDB});
                return;
            }
            let t = rettask.result[0];
            let task = {
                id: t.Task_id,
                name: t.Task_name,
                desc: t.Task_description,
                state: t.Task_state,
                app: t.Task_app_Acronym,
                plan: t.Task_plan,
                creator: t.Task_creator,
                owner: t.Task_owner,
                dateCreate: helperModel.getDateFromDateObject(t.Task_createDate)
            };
            res.send(task);
        }
    },
    //GET request for first entry
    async (req,res)=>{
        //first query what usergroups this user belong to.
        let grpQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${req.session.username}'`;
        let retgrp = await dbModel.performQuery(grpQuery);
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
        let qCond8 = `REGEXP_LIKE(${dbModel.getDbTaskSchemaColAcronym()},'${acronyms}') `;
        // 2022-04-12: doing the queries one by one. slow performance but (probably) easier to debug
        let taskQuery = qSELECTFROM + qWHERE + qCond7a + qAND + qCond8;
        let retopen = await dbModel.performQuery(taskQuery);
        taskQuery = qSELECTFROM + qWHERE + qCond7b + qAND + qCond8;
        let rettodo = await dbModel.performQuery(taskQuery);
        taskQuery = qSELECTFROM + qWHERE + qCond7c + qAND + qCond8;
        let retdoing = await dbModel.performQuery(taskQuery);
        taskQuery = qSELECTFROM + qWHERE + qCond7d + qAND + qCond8;
        let retdone = await dbModel.performQuery(taskQuery);
        taskQuery = qSELECTFROM + qWHERE + qCond7e + qAND + qCond8;
        let retclosed = await dbModel.performQuery(taskQuery);
        // reformat the dates
        let dateReformatter = (rows)=>{
            for(let i = 0; i < rows.length; i++){
                let temp = helperModel.getDateFromDateObject(rows[i].Task_createDate);
                rows[i].Task_createDate = temp;
            }
        }
        dateReformatter(retopen.result);
        dateReformatter(rettodo.result);
        dateReformatter(retdoing.result);
        dateReformatter(retdone.result);
        dateReformatter(retclosed.result);
        // we still have app permissions data.
        // let's build a dataset matching this specific user's permissions
        let userperms = new Object();
        let usergroupRX = new RegExp(usergroup);
        // try{
            for(let i = 0; i < retapp.result.length; i++){
                userperms[retapp.result[i].App_Acronym] = new Object();
                userperms[retapp.result[i].App_Acronym].permitOpen = usergroupRX.test(retapp.result[i].App_permit_Open);
                userperms[retapp.result[i].App_Acronym].permitToDo = usergroupRX.test(retapp.result[i].App_permit_toDoList);
                userperms[retapp.result[i].App_Acronym].permitDoing = usergroupRX.test(retapp.result[i].App_permit_Doing);
                userperms[retapp.result[i].App_Acronym].permitDone = usergroupRX.test(retapp.result[i].App_permit_Done);
            }
        //     console.dir(userperms);
        // } catch(e) {
        //     console.log("An error occurred while building userperm dataset");
        //     console.dir(e);
        // }
        
        // now let's run through each task and append the permissions data to them
        // so that our frontend can easily determine which actions are available.
        // try{
            for(let i = 0; i < retopen.result.length; i++){
                retopen.result[i].permitOpen = userperms[retopen.result[i].Task_app_Acronym].permitOpen;
            }
        // } catch (e){
        //     console.log("An error occurred while processing Open tasks' permission");
        //     console.dir(e);
        // }
        // try{
            for(let i = 0; i < rettodo.result.length; i++){
                rettodo.result[i].permitToDo = userperms[rettodo.result[i].Task_app_Acronym].permitToDo;
            }
        // } catch (e){
        //     console.log("An error occurred while processing ToDo tasks' permission");
        //     console.dir(e);
        // }
        // try{
            for(let i = 0; i < retdoing.result.length; i++){
                retdoing.result[i].permitDoing = userperms[retdoing.result[i].Task_app_Acronym].permitDoing;
            }
        // } catch (e){
        //     console.log("An error occurred while processing Doing tasks' permission");
        //     console.dir(e);
        // }
        // try{
            for(let i = 0; i < retdone.result.length; i++){
                retdone.result[i].permitDone = userperms[retdone.result[i].Task_app_Acronym].permitDone;
            }
        // } catch (e){
        //     console.log("An error occurred while processing Done tasks' permission");
        //     console.dir(e);
        // }
        // console.dir(retopen.result);
        // console.dir(rettodo.result);
        // console.dir(retdoing.result);
        // console.dir(retdone.result);


        //init render options
        let options = {
            isLoggedIn: req.session.isLoggedIn, 
            canAdmin: req.body.isAdmin
        }
        //add render options based on errors/results of queries
        //rendering Open tasks
        if(retopen.error){
            //console.dir(retopen.error);
            options.errorOpen = errorStr.internalErrorDB;
        }
        else if(retopen.result.length === 0){
            options.infoOpen = commonStr.tasksNoneToDisplay;
        }
        else{
            options.tasksOpen = retopen.result;
        }
        //rendering ToDo tasks
        if(rettodo.error){
            //console.dir(rettodo.error);
            options.errorToDo = errorStr.internalErrorDB;
        }
        else if(rettodo.result.length === 0){
            options.infoToDo = commonStr.tasksNoneToDisplay;
        }
        else{
            options.tasksToDo = rettodo.result;
        }
        //rendering Doing tasks
        if(retdoing.error){
            //console.dir(retdoing.error);
            options.errorDoing = errorStr.internalErrorDB;
        }
        else if(retdoing.result.length === 0){
            options.infoDoing = commonStr.tasksNoneToDisplay;
        }
        else{
            options.tasksDoing = retdoing.result;
        }
        //rendering Done tasks
        if(retdone.error){
            //console.dir(retdone.error);
            options.errorDone = errorStr.internalErrorDB;
        }
        else if(retdone.result.length === 0){
            options.infoDone = commonStr.tasksNoneToDisplay;
        }
        else{
            options.tasksDone = retdone.result;
        }
        //rendering Closed tasks
        if(retclosed.error){
            //console.dir(retclosed.error);
            options.errorClosed = errorStr.internalErrorDB;
        }
        else if(retclosed.result.length === 0){
            options.infoClosed = commonStr.tasksNoneToDisplay;
        }
        else{
            options.tasksClosed = retclosed.result;
        }

        res.render('tmsys', options);
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