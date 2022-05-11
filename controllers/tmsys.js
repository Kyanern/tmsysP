const express = require('express');
const router = express.Router();
const checksModel = require('../models/checks');
const dbModel = require('../models/db');
const errorStr = require('../config/errorstring.config.json');
const commonStr = require('../config/commonstring.config.json');
const helperModel = require('../models/helperfuncs');
const emailModel = require('../models/email');

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
                //console.log('rettask.result.length !== 1');
                //console.log('There might be a problem with the database.');
                res.send({error: errorStr.internalErrorDB});
                return;
            }
            let t = rettask.result[0];
            //process notes from stringified json object into normal json object
            //console.dir(t.Task_notes); //DEBUG LOG
            t.Task_notes = JSON.parse(t.Task_notes);
            //console.dir(t.Task_notes); //DEBUG LOG
            let task = {
                id: t.Task_id,
                name: t.Task_name,
                desc: t.Task_description,
                state: t.Task_state,
                app: t.Task_app_Acronym,
                plan: t.Task_plan,
                creator: t.Task_creator,
                owner: t.Task_owner,
                dateCreate: helperModel.getDateFromDateObject(t.Task_createDate),
                notes: t.Task_notes
            };
            res.send(task);
        }
    },
    //GET request for first entry (rendering frames)
    (req,res)=>{
        res.render('supertm');
    }
);

let renderFrameMain = async (req,res,finalError, finalSuccess) => {
    //console.log('tmsys.js: Entered renderFrameMain');
    //console.dir({req,res,finalError,finalSuccess});
    //first query what usergroups this user belong to.
    let grpQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${req.session.username}'`;
    let retgrp = await dbModel.performQuery(grpQuery);
    if(retgrp.error){
        //console.dir(retgrp.error);
        res.render('tmsys', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin, error:errorStr.internalErrorDB, errorSpecial: finalError, success: finalSuccess});
        return;
    }
    if(retgrp.result.length !== 1){
        //console.log("retgrp.result.length: potential database error at usergroup");
        res.render('tmsys', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin, error:errorStr.internalErrorDB, errorSpecial: finalError, success: finalSuccess});
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
    let qCond7 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitEditApp()}, '${usergroup}') `;
    let {requestapp} = req.query
    let qCond8 = `${dbModel.getDbApplicationSchemaColAcronym()} = '${requestapp}'`;
    //construct query
    let appQuery = qSELECTFROM + qWHERE;
    appQuery += '(' + qCond1 + qOR + qCond2 + qOR + qCond3 + qOR + qCond4 + qOR + qCond5 + qOR + qCond6 + qOR + qCond7 + ')';
    if(requestapp){
        appQuery += qAND + qCond8;
    }
    //console.log(appQuery);
    let retapp = await dbModel.performQuery(appQuery);
    if(retapp.error){
        //console.dir(retapp.error);
        res.render('tmsys', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin, error:errorStr.internalErrorDB, errorSpecial: finalError, success: finalSuccess});
        return;
    }
    if(retapp.result.length === 0){
        res.render('tmsys', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin, error:errorStr.listTasksNoApps, errorSpecial: finalError, success: finalSuccess});
        return;
    }
    let acronyms = helperModel.regexfy_appAcronyms(retapp.result);
    //then query what tasks this user can see.
    // 2022-04-12: Separate into 5 different queries.
    qSELECTFROM = `SELECT ${dbModel.getDbColFormat_ListTasks()} FROM ${dbModel.getDbTaskSchema()} `;
    let qCond9a = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumOpen()}' `;
    let qCond9b = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumToDo()}' `;
    let qCond9c = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumDoing()}' `;
    let qCond9d = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumDone()}' `;
    let qCond9e = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumClosed()}' `;
    let qCond10 = `REGEXP_LIKE(${dbModel.getDbTaskSchemaColAcronym()},'${acronyms}') `;
    // 2022-04-12: doing the queries one by one. slow performance but (probably) easier to debug
    let taskQuery = qSELECTFROM + qWHERE + qCond9a + qAND + qCond10;
    let retopen = await dbModel.performQuery(taskQuery);
    taskQuery = qSELECTFROM + qWHERE + qCond9b + qAND + qCond10;
    let rettodo = await dbModel.performQuery(taskQuery);
    taskQuery = qSELECTFROM + qWHERE + qCond9c + qAND + qCond10;
    let retdoing = await dbModel.performQuery(taskQuery);
    taskQuery = qSELECTFROM + qWHERE + qCond9d + qAND + qCond10;
    let retdone = await dbModel.performQuery(taskQuery);
    taskQuery = qSELECTFROM + qWHERE + qCond9e + qAND + qCond10;
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
    // the following session affects the frontend display:
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
        canAdmin: req.body.isAdmin,
        errorSpecial: finalError,
        success: finalSuccess
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

/***
 * takes in a task state and a task action and sees whether 
 * the action performed is valid for the task's state
 * 
 * returns a boolean. if true, the action is valid to perform
 * on the task based on the task's state. false otherwise.
 */
let checkStateAction = (state, action) => {
    /***
     * By right all these actions should not be hardcoded lol
     */
    if(state === dbModel.getDbTaskSchemaColStateEnumOpen()){
        if(action === "taskAction_Open_ToDo"){
            return true;
        }
    } else if (state === dbModel.getDbTaskSchemaColStateEnumToDo()){
        if(action === "taskAction_ToDo_Doing"){
            return true;
        }
    } else if (state === dbModel.getDbTaskSchemaColStateEnumDoing()){
        if(
            action === "taskAction_Doing_Done"||
            action === "taskAction_Doing_ToDo"
        ){
            return true;
        }
    } else if (state === dbModel.getDbTaskSchemaColStateEnumDone()){
        if(
            action === "taskAction_Done_Closed"||
            action === "taskAction_Done_Doing"
        ){
            return true;
        }
    }
    //default
    return false;
}

let determineFinalState = (action) => {
    /***
     * By right all these actions should not be hardcoded lolz
     */
    if(
        action === "taskAction_Open_ToDo"||
        action === "taskAction_Doing_ToDo"
    ){
        return dbModel.getDbTaskSchemaColStateEnumToDo();
    } 
    else if (
        action === "taskAction_ToDo_Doing"||
        action === "taskAction_Done_Doing"
    ){
        return dbModel.getDbTaskSchemaColStateEnumDoing();
    }
    else if (
        action === "taskAction_Doing_Done"
    ){
        return dbModel.getDbTaskSchemaColStateEnumDone();
    }
    else if (
        action === "taskAction_Done_Closed"
    ){
        return dbModel.getDbTaskSchemaColStateEnumClosed();
    }
    else{
        return -1;
    }
}

router.get('/frame_main',
    //GET request for first entry
    async (req,res)=>{
        //console.log('tmsys.js: Entered router.get /frame_main GET request for first entry');
        renderFrameMain(req,res);
    }
);

router.post('/frame_main', 
    //handles create application form button
    async (req,res,next)=>{
        //console.log('tmsys.js: Entered router.post /frame_main handles create application form button');
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
            // let options = {
            //     isLoggedIn: req.session.isLoggedIn,
            //     canAdmin: req.body.isAdmin
            // }
            // if(error){
            //     // console.log('\n***\n'+error+'\n***\n');
            //     options.error = errorStr.internalErrorDB;
            //     res.render('tmsys', options);
            //     return;
            // }
            // options.success = `Application ${createAppAcronym} successfully created`;
            // res.render('tmsys', options);
            if(error){
                //console.dir(error);
                renderFrameMain(req,res,errorStr.internalErrorDB);
                return;
            }
            renderFrameMain(req,res,null,`Application ${createAppAcronym} successfully created`);
        }
    },
    //handles btn_taskAction button
    async(req,res,next)=>{
        let{btn_taskAction} = req.body;
        if(!btn_taskAction){
            next();
        } else {
            let {taskAction} = req.body;
            /***
             * At this point, we have the following info:
             * Username from req.session.username
             * task ID from btn_taskAction
             * action taken from taskAction
             */

            /***
             * By right, we need to do some precheck here to ensure that
             * user still has correct permissions to take the requested
             * action.
             * 
             * I am skipping this step.
             */

            let selQ = `SELECT ${dbModel.getDbTaskSchemaColState()} FROM ${dbModel.getDbTaskSchema()} WHERE ${dbModel.getDbTaskSchemaColID()} = '${btn_taskAction}'`;
            let retselQ = await dbModel.performQuery(selQ);
            if(retselQ.error){
                //console.dir(retselQ.error);
                renderFrameMain(req,res,errorStr.internalErrorDB);
                return;
            }
            if(retselQ.result.length !== 1){
                //console.log(btn_taskAction + ': There may be db corruption with this Task ID.');
                renderFrameMain(req,res,errorStr.internalErrorDB);
                return;
            }
            let state = retselQ.result[0].Task_state;
            let isValidAction = await checkStateAction(state,taskAction);
            if(!isValidAction){
                renderFrameMain(req,res,errorStr.taskActionNotAllowed);
                return;
            }
            let finalState = await determineFinalState(taskAction);
            if(finalState === -1){
                renderFrameMain(req,res,errorStr.taskActionNotAllowed);
                return;
            }

            /***
             * I'm lazy to do a "same owner" check here. But it can (should?)
             * be done here(, if needed?)
             */

            let updQ = `UPDATE ${dbModel.getDbTaskSchema()} SET ${dbModel.getDbTaskSchemaColState()}='${finalState}',${dbModel.getDbTaskSchemaColOwner()}='${req.session.username}' WHERE ${dbModel.getDbTaskSchemaColID()} = '${btn_taskAction}'`;
            let retupdQ = await dbModel.performQuery(updQ);
            if(retupdQ.error){
                //console.dir(retupdQ.error);
                renderFrameMain(req,res,errorStr.internalErrorDB);
                return;
            }

            /***
             * Now I update the notes with a system-generated note that says who moved the ticket to its final state.
             * I could probably prepare this part before updQ above but eh, doesn't really matter for now.
             * I'll reuse the variables.
             * 
             * I'm skipping some checks and stuff but by right these should be done.
             * Also, by right the user should be an actually-existing user.
             */
            selQ = `SELECT ${dbModel.getDbTaskSchemaColNotes()} FROM ${dbModel.getDbTaskSchema()} WHERE ${dbModel.getDbTaskSchemaColID()} = '${btn_taskAction}'`;
            retselQ = await dbModel.performQuery(selQ);
            let arr; 
            if(retselQ.result){
                arr = JSON.parse(retselQ.result[0].Task_notes);
            }
            let sysNote = {
                user:"TMSYSADMIN",
                taskState:finalState, 
                content:"User " + req.session.username + " changed this task's state from [" + state + "] to [" + finalState + "]",
                datetime:(new Date()).toISOString()
            }
            if(arr){
                arr.unshift(sysNote);
            } else{
                arr = [sysNote];
            }
            arr = JSON.stringify(arr);
            updQ = `UPDATE ${dbModel.getDbTaskSchema()} SET ${dbModel.getDbTaskSchemaColNotes()}`+'='+dbModel.giveEscaped(arr) + ` WHERE ${dbModel.getDbTaskSchemaColID()} = '${btn_taskAction}'`;
            retupdQ = await dbModel.performQuery(updQ); 

            /***
             * If the action is to move a task from [doing] state to [done] state,
             * send an email to the project leads
             * (for this project, this means any user that is in a usergroup that is
             * listed under App_permit_Done)
             */
            //send email to notify people with 'done' permission
            //first get what groups have that permission for the application.
            if(finalState === dbModel.getDbTaskSchemaColStateEnumDone()){
                selQ = `SELECT ${dbModel.getDbTaskSchemaColAcronym()} AS 'acronym' FROM ${dbModel.getDbTaskSchema()} WHERE ${dbModel.getDbTaskSchemaColID()} = '${btn_taskAction}'`;
                retselQ = await dbModel.performQuery(selQ);
                if(retselQ.error){
                    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.session.username + '>, for task <' + btn_taskAction + '>.');
                    console.log('Reason: selQ error');
                    return;
                }
                if(!retselQ.result || !retselQ.result.length){
                    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.session.username + '>, for task <' + btn_taskAction + '>.');
                    console.log('Reason: selQ no result');
                    return;
                }
                let taskAppAcronym = retselQ.result[0].acronym;
                let doneQuery = `SELECT ${dbModel.getDbApplicationSchemaColPermitDone()} AS 'donepermit' FROM ${dbModel.getDbApplicationSchema()} WHERE ${dbModel.getDbApplicationSchemaColAcronym()} = '${taskAppAcronym}'`;
                let retdone = await dbModel.performQuery(doneQuery);
                if(retdone.error){
                    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.session.username + '>, for task <' + btn_taskAction + '>.');
                    console.log('Reason: doneQuery error');
                    return;
                }
                if(!retdone.result || !retdone.result.length){
                    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.session.username + '>, for task <' + btn_taskAction + '>.');
                    console.log('Reason: doneQuery no result');
                    return;
                }
                let donegroup = helperModel.regexfy_usergroup(retdone.result[0].donepermit);
    
                //then get usernames of those inside these groups
                let toUsersQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsername()} AS 'user' FROM ${dbModel.getDbUsergroupsSchema()} WHERE REGEXP_LIKE(${dbModel.getDbUsergroupsSchemaColUsergroup()}, '${donegroup}')`;
                let rettoUsers = await dbModel.performQuery(toUsersQuery);
                if(rettoUsers.error){
                    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.session.username + '>, for task <' + btn_taskAction + '>.');
                    console.log('Reason: toUsersQuery error');
                    return;
                }
                if(!rettoUsers.result || !rettoUsers.result.length){
                    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.session.username + '>, for task <' + btn_taskAction + '>.');
                    console.log('Reason: toUsersQuery no result');
                    return;
                }
    
                //build email 'to' list
                //first string up the usernames
                //and we'll cheat a bit by using regexfy_usergroup to make it regex-ready
                let userstring = rettoUsers.result[0].user;
                for(let i = 1; i < rettoUsers.result.length; i++){
                    userstring += ',' + rettoUsers.result[i].user;
                }
                userstring = helperModel.regexfy_usergroup(userstring);
    
                //then we get the emails via another query
                let emailQuery = `SELECT ${dbModel.getDbLoginSchemaColEmail()} AS 'email' FROM ${dbModel.getDbLoginSchema()} WHERE REGEXP_LIKE(${dbModel.getDbLoginSchemaColUsername()}, '${userstring}')`;
                let retemail = await dbModel.performQuery(emailQuery);
                if(retemail.error){
                    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.session.username + '>, for task <' + btn_taskAction + '>.');
                    console.log('Reason: emailQuery error ("to")');
                    return;
                }
                if(!retemail.result || !retemail.result.length){
                    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.session.username + '>, for task <' + btn_taskAction + '>.');
                    console.log('Reason: emailQuery no result ("to")');
                    return;
                }
    
                //construct toList
                let toList = [];
                for(let i = 0; i < retemail.result.length; i++){
                    toList.push(retemail.result[i].email);
                }
                console.dir(toList);
    
                //now we get the 'from' email,
                //which is just the current user's email
                emailQuery = `SELECT ${dbModel.getDbLoginSchemaColEmail()} AS 'email' FROM ${dbModel.getDbLoginSchema()} WHERE ${dbModel.getDbLoginSchemaColUsername()} = '${req.session.username}'`;
                retemail = await dbModel.performQuery(emailQuery);
                if(retemail.error){
                    console.dir(retemail.error);
                    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.session.username + '>, for task <' + btn_taskAction + '>.');
                    console.log('Reason: emailQuery error ("from")');
                    return;
                }
                if(!retemail.result || !retemail.result.length){
                    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.session.username + '>, for task <' + btn_taskAction + '>.');
                    console.log('Reason: emailQuery no result ("from")');
                    return;
                }
                let sender = retemail.result[0].email;
    
                var message = {
                    from: sender,
                    to: toList,
                    subject: "Task " + btn_taskAction + " to be approved",
                    text: "Task " + btn_taskAction + " has been promoted to done state, waiting for task to be approved."
                }
    
                emailModel.transporter.sendMail(message, function(err, info) {
                        if (err) {
                            console.dir(err);
                        } else {
                            console.dir(info);
                            console.log("email sent");
                        }
                    });
            }

            renderFrameMain(req,res,null,'Task action successfully performed on Task ' + btn_taskAction);
        }
    }
)

router.get('/frame_left',
    //GET request for left frame
    async(req,res)=>{
        //first query what usergroups this user belong to.
        let grpQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${req.session.username}'`;
        let retgrp = await dbModel.performQuery(grpQuery);
        if(retgrp.error){
            //console.dir(retgrp.error);
            res.render('tmsys_frameleft', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin, error:errorStr.internalErrorDB});
            return;
        }
        if(retgrp.result.length !== 1){
            //console.log("retgrp.result.length: potential database error at usergroup");
            res.render('tmsys_frameleft', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin, error:errorStr.internalErrorDB});
            return;
        }
        let usergroup = helperModel.regexfy_usergroup(retgrp.result[0].usergroup);
        //then query what applications this user can view
        //query substrings
        //SUGGESTION: make a App_permit_View column and REGEXP_LIKE only that column. Create application code need to change also.
        let qSELECTFROM = `SELECT ${dbModel.getDbApplicationSchemaColAcronym()} AS name FROM ${dbModel.getDbApplicationSchema()} `;
        let qWHERE = `WHERE `;
        let qOR = `OR `;
        let qAND = `AND `;
        let qCond1 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitOpen()}, '${usergroup}') `;
        let qCond2 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitToDo()}, '${usergroup}') `;
        let qCond3 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitDoing()}, '${usergroup}') `;
        let qCond4 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitDone()}, '${usergroup}') `;
        let qCond5 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitCreatePlan()}, '${usergroup}') `;
        let qCond6 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitCreateTask()}, '${usergroup}') `;
        let qCond7 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitEditApp()}, '${usergroup}') `;
        //construct query
        let appQuery = qSELECTFROM + qWHERE + '(' + qCond1 + qOR + qCond2 + qOR + qCond3 + qOR + qCond4 + qOR + qCond5 + qOR + qCond6 + qOR + qCond7 + ')';
        //console.log(appQuery);
        let retapp = await dbModel.performQuery(appQuery);
        if(retapp.error){
            //console.dir(retapp.error);
            res.render('tmsys_frameleft', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin, error:errorStr.internalErrorDB});
            return;
        }
        if(retapp.result.length === 0){
            res.render('tmsys_frameleft', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin, error:errorStr.listTasksNoApps});
            return;
        }
        res.render('tmsys_frameleft', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin, appList:retapp.result});
    }
);

module.exports = router;