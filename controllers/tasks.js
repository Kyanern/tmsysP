const express = require('express');
const router = express.Router();
const checksModel = require('../models/checks');
const dbModel = require('../models/db');
const errorStr = require('../config/errorstring.config.json');
const helperModel = require('../models/helperfuncs');

let renderCreateForm = async (req,res,finalError,finalSuccess) => {
  //first query what usergroups this user belongs to.
  let grpQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${req.session.username}'`;
  let retgrp = await dbModel.performQuery(grpQuery);
  if(retgrp.error){
    //console.dir(retgrp.error);
    res.render('task_create', {
      isLoggedIn: req.session.isLoggedIn,
      error:errorStr.internalErrorDB,
      errorSpecial: finalError,
      success: finalSuccess
    });
    return;
  }
  if(!retgrp.result.length){
    //console.dir("retgrp.result.length: potential database error at usergroup");
    res.render('task_create', {
      isLoggedIn: req.session.isLoggedIn,
      error:errorStr.userNoUsergroups,
      errorSpecial: finalError,
      success: finalSuccess
    });
    return;
  }
  let usergroup = helperModel.regexfy_usergroup(retgrp.result[0].usergroup);

  //then query what applications can this user create tasks for.
  let qSELECTFROM = `SELECT ${dbModel.getDbApplicationSchemaColAcronym()} FROM ${dbModel.getDbApplicationSchema()} `;
  let qWHERE = `WHERE `;
  let qCond6 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitCreateTask()}, '${usergroup}') `;
  let appQuery = qSELECTFROM + qWHERE + qCond6;
  let retapp = await dbModel.performQuery(appQuery);
  if(retapp.error){
    //console.dir(error);
    res.render('task_create', {
      isLoggedIn: req.session.isLoggedIn,
      error:errorStr.internalErrorDB,
      errorSpecial: finalError,
      success: finalSuccess
    });
    return;
  }
  if(!retapp.result.length){
    //console.dir(error);
    res.render('task_create', {
      isLoggedIn: req.session.isLoggedIn,
      error:errorStr.createTaskNoPermits,
      errorSpecial: finalError,
      success: finalSuccess
    });
    return;
  }
  //now we have applications that this user can view, res.render page with acronym list to client
  res.render('task_create',{
    isLoggedIn:req.session.isLoggedIn,
    appList: retapp.result,
    error: finalError,
    success: finalSuccess
  });
};

let renderEditForm = async(taskid,req,res,finalError,finalSuccess) => {
  //from value of btn_editTask, query for information
  let taskQuery = `SELECT ${dbModel.getDbColFormat_TaskDetails()} FROM ${dbModel.getDbTaskSchema()} WHERE ${dbModel.getDbTaskSchemaColID()} = '${taskid}'`;
  let rettask = await dbModel.performQuery(taskQuery);
  if(rettask.error){
    let options = {
      isLoggedIn: req.session.isLoggedIn,
      error: errorStr.internalErrorDB,
      errorSpecial: finalError,
      success: finalSuccess
    }
    //console.dir(rettask.error);
    res.render('task_edit', options);
    return;
  }
  if(rettask.result.length !== 1){
    //console.log('rettask.result.length !== 1');
    //console.log('There might be a problem with the database.');
    let options = {
      isLoggedIn: req.session.isLoggedIn,
      error: errorStr.internalErrorDB,
      errorSpecial: finalError,
      success: finalSuccess
    }
    res.render('task_edit', options);
    return;
  }
  //Also have to find out what plans we can attach to.
  //A task must be attached to an application
  //so I won't check for no app error 
  //(but for safety reasons it should be done)
  let planQuery = `SELECT ${dbModel.getDbPlanSchemaColMVPName()} AS 'mvp' FROM ${dbModel.getDbPlanSchema()} WHERE ${dbModel.getDbPlanSchemaColAcronym()} = '${rettask.result[0].Task_app_Acronym}'`;
  let retplan = await dbModel.performQuery(planQuery);
  if(retplan.error){
    let options = {
      isLoggedIn: req.session.isLoggedIn,
      error: errorStr.internalErrorDB,
      errorSpecial: finalError,
      success: finalSuccess
    }
    //console.dir(retplan.error);
    res.render('task_edit', options);
    return;
  }
  let p = retplan.result;
  let t = rettask.result[0];
  t.Task_notes = JSON.parse(t.Task_notes);
  //preprocess the timestamps for display here.
  //because unlike in modal_detailsTask.pug,
  //i do not intend to have js in task_edit.pug
  //to process the data.
  if(t.Task_notes){
    for(let i = 0; i < t.Task_notes.length; i++){
      let note = t.Task_notes[i];
      note.datetime = (new Date(note.datetime)).toLocaleString();
    }
  }
  let task = {
    id: t.Task_id,
    name: t.Task_name,
    desc: t.Task_description,
    state: t.Task_state,
    app: t.Task_app_Acronym,
    plan: t.Task_plan,
    creator: t.Task_creator,
    owner: t.Task_owner,
    dateCreate: (new Date(t.Task_createDate)).toLocaleString(),
    notes: t.Task_notes,
    planList: p
  };
  let options = {
    isLoggedIn: req.session.isLoggedIn,
    errorSpecial: finalError,
    success: finalSuccess,
    task: task
  };
  res.render('task_edit', options);
};

router.use(async (req, res, next) => {
  // console.log('Time: ', Date.now());

  if(!req.session.isLoggedIn){
      res.redirect('/login');
      return;
  }
  
  // console.log(req.body);
  next();
});

//GET request for create task
router.get('/create',
  //AJAX GET request to populate plan list when an appplication is selected
  async (req,res,next)=>{
    let {requestFrom} = req.query;
    if(requestFrom !== "createTaskSelApp"){
      next();
    } else {
      let {value} = req.query;
      let planQuery = `SELECT ${dbModel.getDbPlanSchemaColMVPName()} AS "name" FROM ${dbModel.getDbPlanSchema()} WHERE ${dbModel.getDbPlanSchemaColAcronym()} = '${value}'`;
      let retplan = await dbModel.performQuery(planQuery);
      if(retplan.error){
        //console.dir(error);
        res.send({error: errorStr.internalErrorDB});
        return;
      }
      res.send(retplan.result);
    }
  },
  //normal GET request
  async (req,res)=>{
    renderCreateForm(req,res,null,null);
  }
);

//POST request for create task
router.post('/create',
  async (req,res)=>{
    /* full list of properties for a task (2022-04-11):
    ** Task_name
    ** Task_description
    ** Task_notes       (1)
    ** Task_id          (2)
    ** Task_plan        (3)
    ** Task_app_Acronym
    ** Task_state       (4)
    ** Task_creator     (5)
    ** Task_owner       (5)
    ** Task_createDate  (4)
    **
    ** (1) - Not supplied by user. Will INSERT as NULL first.
    ** (2) - To be handled by server. <app_acronym>_<app_rnumber>.
    ** (3) - Supposed to be supplied by user, but is a TODO for now and currently not implemented (2022-04-11)
    ** (4) - Using default value defined in database table
    ** (5) - To be handled by server. <req.session.username>
    */

    let {Task_app_Acronym, Task_plan, Task_name, Task_description} = req.body;
    //console.log('Task_plan = ' + Task_plan);
    //first query the running number
    let rnumQuery = `SELECT ${dbModel.getDbApplicationSchemaColRnumber()} FROM ${dbModel.getDbApplicationSchema()} WHERE ${dbModel.getDbApplicationSchemaColAcronym()} = '${Task_app_Acronym}'`;
    let retrnum = await dbModel.performQuery(rnumQuery);
    if(retrnum.error){
      //console.dir(retrnum.error);
      renderCreateForm(req,res,errorStr.internalErrorDB,null);
      return;
    }
    if(retrnum.result.length !== 1){
      //console.log("retrnum.result.length: potential database error at application table");
      renderCreateForm(req,res,errorStr.internalErrorDB,null);
      return;
    }
    let rnum = Number(retrnum.result[0].App_Rnumber);
    //console.log("type of rnum: " + typeof rnum);
    let Task_id = Task_app_Acronym + '_' + rnum;
    let Task_creator = req.session.username;
    let Task_owner = req.session.username;

    Task_name = dbModel.giveEscaped(Task_name);
    Task_description = dbModel.giveEscaped(Task_description);

    //query substrings
    let qINSERT = `INSERT INTO ${dbModel.getDbTaskSchema()} `;
    //We separate out column Task_plan because it is an optional entry.
    //if Task_plan value exists from user-submitted form then we add the column in.
    let qColFormat = (Task_plan ? `(${dbModel.getDbColFormat_CreateTask()},${dbModel.getDbTaskSchemaColPlan()}) ` : `(${dbModel.getDbColFormat_CreateTask()}) `);
    let qVALUES = `VALUES `;
    //if Task_plan value exists from user-submitted form then we add the value in.
    let qArguments = (Task_plan ? `(${Task_name},${Task_description},'${Task_id}','${Task_app_Acronym}','${Task_creator}','${Task_owner}', '${Task_plan}')` : `(${Task_name},${Task_description},'${Task_id}','${Task_app_Acronym}','${Task_creator}','${Task_owner}')`);
    let insQuery = qINSERT + qColFormat + qVALUES + qArguments;
    //console.log('insQuery = '+insQuery);
    let retins = await dbModel.performQuery(insQuery);
    if(retins.error){
      //console.dir(retins.error);
      if(retins.error.errno === 1062){
        renderCreateForm(req,res,(errorStr.createTaskIDTaken + Task_id),null);
      } else {
        renderCreateForm(req,res,errorStr.internalErrorDB,null);
      }
      return;
    }

    ++rnum;
    rnumQuery = `UPDATE ${dbModel.getDbApplicationSchema()} SET ${dbModel.getDbApplicationSchemaColRnumber()} = ${rnum} WHERE ${dbModel.getDbApplicationSchemaColAcronym()} = '${Task_app_Acronym}'`;
    retrnum = await dbModel.performQuery(rnumQuery);
    if(retrnum.error){
      //console.dir(retrnum.error);
      renderCreateForm(req,res,errorStr.createTaskRNumCannotIncrement,`Task ${Task_id} successfully created.`);
      return;
    }
    renderCreateForm(req,res,null,`Task ${Task_id} successfully created.`);
  }
);

router.get('/edit', 
  //normal GET request
  async(req,res,next)=>{
    let {btn_editTask} = req.query;
    if(!btn_editTask){
      next();
    } else {
      renderEditForm(btn_editTask,req,res);
    }
  }
);

router.post('/edit', 
  //normal POST request from a btn_saveEdits button
  async(req,res,next)=>{
    let{btn_saveEdits} = req.body;
    if(!btn_saveEdits){
      next();
    } else {
      //TODO: do the edit task processing.
      //read-only and 'before/old' values
      let {id, name, desc, state, plan} = req.body;
      //'after/new' values
      let {nameNew, descNew, planNew, noteNew} = req.body;
      let myQuery = `UPDATE ${dbModel.getDbTaskSchema()} SET `;
      let myStack = [];

      if(nameNew !== name){
        myStack.push(`${dbModel.getDbTaskSchemaColName()}='${nameNew}'`);
        //console.log('pushed new task name to stack');
      }
      if(descNew !== desc){
        myStack.push(`${dbModel.getDbTaskSchemaColDescription()}='${descNew}'`);
        //console.log('pushed new task description to stack');
      }
      if(planNew !== plan){
        myStack.push(`${dbModel.getDbTaskSchemaColPlan()}='${planNew}'`);
        //console.log('pushed new task plan to stack');
      }
      if(noteNew){
        //query exisiting notes then add on top.
        let notesQuery = `SELECT ${dbModel.getDbTaskSchemaColNotes()} FROM ${dbModel.getDbTaskSchema()} WHERE ${dbModel.getDbTaskSchemaColID()}='${id}'`;
        let retnotes = await dbModel.performQuery(notesQuery);
        if(retnotes.error){
          //console.dir(retnotes.error)
          renderEditForm(id, req,res,errorStr.internalErrorDB);
          return;
        }
        let arr;
        if(retnotes.result){
          arr = JSON.parse(retnotes.result[0].Task_notes);
          
        } else {
          arr = new Array();
        }
        arr.unshift({
          user:req.session.username,
          taskState:state,
          content:noteNew,
          datetime:(new Date()).toISOString()
        });
        arr = JSON.stringify(arr);
        myStack.push(`${dbModel.getDbTaskSchemaColNotes()}`+'='+dbModel.giveEscaped(arr));
        //console.log('pushed new task note(s) to stack')
      }
      if(!myStack.length){
        renderEditForm(id,req,res,errorStr.nothingToModify);
        return;
      }
      while(myStack.length){  //might be dangerous...?
        myQuery += myStack.pop();
        if(myStack.length) myQuery += ',';
      }
      myQuery += ` WHERE ${dbModel.getDbTaskSchemaColID()}='${id}';`;
      //perform query
      let retQ = await dbModel.performQuery(myQuery);
      if(retQ.error){
        console.dir(retQ.error);
        renderEditForm(id,req,res,errorStr.internalErrorDB);
        return;
      }
      renderEditForm(id,req,res,null,`Task ${id} successfully edited.`);
    }
  }
);

module.exports = router;