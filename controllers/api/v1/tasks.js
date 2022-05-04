const express = require('express');
const router = express.Router();
const checksModel = require('../../../models/checks');
const dbModel = require('../../../models/db');
const errorStr = require('../../../config/errorstring.config.json');
const helperModel = require('../../../models/helperfuncs');
const APIAuthModel = require('../../../models/apiauth');
/***
 * Process task list request function:
 * A function to process a task list request.
 * 
 * 2022-04-28:
 * We will use the values returned from 
 * getDbTaskSchemaColStateEnum* functions
 * from the dbModel
 * as the only valid arguments for
 * the parameter 'state'.
 */
let tasklistReqProcess = async(req,res,next)=>{
  console.log("hit: tasklistReqProcess.");
  let state = req.data.state;
  //req.data.username should come from authorization processor function.
  //it is considered internal error if there is no req.data.username
  //as it means that one (or more or all) of your authorization processor
  //functions in auth.js is not saving the username into req.data
  let username = req.data.username; 
  console.dir(req.data);
  //first query what usergroups this user belong to.
  let grpQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${username}'`;
  let retgrp = await dbModel.performQuery(grpQuery);
  if(retgrp.error){
    res.status(500).send({message:errorStr.internalErrorDB,data:null});
    return;
  }
  if(retgrp.result.length !== 1){
    //console.log("retgrp.result.length: potential database error at usergroup");
    res.status(500).send({message:errorStr.internalErrorDB,data:null});
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
  //construct query
  let appQuery = qSELECTFROM + qWHERE;
  appQuery += '(' + qCond1 + qOR + qCond2 + qOR + qCond3 + qOR + qCond4 + qOR + qCond5 + qOR + qCond6 + qOR + qCond7 + ')';
  let retapp = await dbModel.performQuery(appQuery);
  if(retapp.error){
    res.status(500).send({message:errorStr.internalErrorDB,data:null});
    return;
  }
  if(retapp.result.length === 0){
    res.status(500).send({message:errorStr.internalErrorDB,data:null});
    return;
  }
  let acronyms = helperModel.regexfy_appAcronyms(retapp.result);
  //then query what tasks this user can see.
  // 2022-05-04: 
  // Add conditions based on existence of 'state'.
  // If 'state' does not exist then just grab all.
  qSELECTFROM = `SELECT ${dbModel.getDbColFormat_TaskDetails()} FROM ${dbModel.getDbTaskSchema()} `;
  let qCond9a = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumOpen()}' `;
  let qCond9b = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumToDo()}' `;
  let qCond9c = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumDoing()}' `;
  let qCond9d = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumDone()}' `;
  let qCond9e = `${dbModel.getDbTaskSchemaColState()} = '${dbModel.getDbTaskSchemaColStateEnumClosed()}' `;
  let qCond10 = `REGEXP_LIKE(${dbModel.getDbTaskSchemaColAcronym()},'${acronyms}') `;
  let taskQuery = qSELECTFROM + qWHERE + qCond10;
  if(state){
    taskQuery += qAND;
    if(state === dbModel.getDbTaskSchemaColStateEnumClosed()){
      taskQuery += qCond9e;
    }
    else if(state === dbModel.getDbTaskSchemaColStateEnumDoing()){
      taskQuery += qCond9c;
    }
    else if(state === dbModel.getDbTaskSchemaColStateEnumDone()){
      taskQuery += qCond9d;
    }
    else if(state === dbModel.getDbTaskSchemaColStateEnumOpen()){
      taskQuery += qCond9a;
    }
    else if(state === dbModel.getDbTaskSchemaColStateEnumToDo()){
      taskQuery += qCond9b;
    }
    else{
      //malformed request.
      res.status(422).send({message:errorStr.APIUnknownTaskState, data:[
        dbModel.getDbTaskSchemaColStateEnumOpen(),
        dbModel.getDbTaskSchemaColStateEnumToDo(),
        dbModel.getDbTaskSchemaColStateEnumDoing(),
        dbModel.getDbTaskSchemaColStateEnumDone(),
        dbModel.getDbTaskSchemaColStateEnumClosed()
      ]});
    }
  }
  let rettasks = await dbModel.performQuery(taskQuery);

  // let taskQuery = qSELECTFROM + qWHERE + qCond9a + qAND + qCond10;
  // let retopen = await dbModel.performQuery(taskQuery);
  // taskQuery = qSELECTFROM + qWHERE + qCond9b + qAND + qCond10;
  // let rettodo = await dbModel.performQuery(taskQuery);
  // taskQuery = qSELECTFROM + qWHERE + qCond9c + qAND + qCond10;
  // let retdoing = await dbModel.performQuery(taskQuery);
  // taskQuery = qSELECTFROM + qWHERE + qCond9d + qAND + qCond10;
  // let retdone = await dbModel.performQuery(taskQuery);
  // taskQuery = qSELECTFROM + qWHERE + qCond9e + qAND + qCond10;
  // let retclosed = await dbModel.performQuery(taskQuery);
  // reformat the dates
  let dateReformatter = (rows)=>{
      for(let i = 0; i < rows.length; i++){
          let temp = helperModel.getDateFromDateObject(rows[i].Task_createDate);
          rows[i].Task_createDate = temp;
      }
  }
  dateReformatter(rettasks.result);
  res.status(200).send({message:null, data:rettasks.result});
  // dateReformatter(retopen.result);
  // dateReformatter(rettodo.result);
  // dateReformatter(retdoing.result);
  // dateReformatter(retdone.result);
  // dateReformatter(retclosed.result);
}

/***
 * Authorization middleware, to be used in all /api/v1/* routes/methods
 */
router.all('/', APIAuthModel.authPreprocess, APIAuthModel.authBasic);

/***
 * /api/v1/tasks[?state=<state>]
 * 
 * API GET request to retrieve list of tasks.
 * Optionally, a query prop 'state' can be supplied
 * to retrieve only tasks in a certain state.
 * 
 */
router.get('/', 
  async(req,res, next)=>{
    console.log('hit: api/v1/tasks GET');
    let {state} = req.query;
    if(!req.data){
      req.data = new Object();
    }
    req.data.state = state ? state : null;
    next();
  },
  tasklistReqProcess
);

/***
 * /api/v1/tasks
 * 
 * API POST request to retrieve list of tasks.
 * Optionally, a body prop 'state' can be supplied
 * to retrieve only tasks in a certain state.
 * 
 */

router.post('/',
  async(req,res,next)=>{
    console.log('hit: api/v1/tasks POST');
    console.dir(req.body);
    let {state} = req.body;
    if(!req.data){
      req.data = new Object();
    }
    req.data.state = state ? state : null;
    next();
  },
  tasklistReqProcess
);

module.exports = router;