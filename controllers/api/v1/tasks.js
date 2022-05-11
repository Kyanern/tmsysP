const express = require('express');
const router = express.Router();
const checksModel = require('../../../models/checks');
const dbModel = require('../../../models/db');
const errorStr = require('../../../config/errorstring.config.json');
const helperModel = require('../../../models/helperfuncs');
const APIAuthModel = require('../../../models/apiauth');
const workflowModel = require('../../../models/workflow');
const emailModel = require('../../../models/email');

/***
 * Authorization middleware, to be used in all /api/v1/* routes/methods
 */
 router.all('/', APIAuthModel.authPreprocess, APIAuthModel.authBasic);
 router.all('/*', APIAuthModel.authPreprocess, APIAuthModel.authBasic);

/***
 * SECTION: RETRIEVING TASKS (OPTIONALLY WITH 'STATE' FILTER)
 * 
 * Note that user still only sees tasks that user has application permissions for.
 * 
 */

/***
 * Process task list request function
 * 
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
  //console.log("hit: tasklistReqProcess.");
  let state = req.data.state;
  //req.data.username should come from authorization processor function.
  //it is considered internal error if there is no req.data.username
  //as it means that one (or more or all) of your authorization processor
  //functions in auth.js is not saving the username into req.data
  let username = req.data.username; 
  //console.dir(req.data);
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
      return;
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
 * GET /api/v1/tasks/list[?state=<state>]
 * 
 * API GET request to retrieve list of tasks.
 * Optionally, a query prop 'state' can be supplied
 * to retrieve only tasks in a certain state.
 */
router.get('/list', 
  async(req,res, next)=>{
    //console.log('hit: api/v1/tasks GET');
    let {state} = req.query;
    if(!req.data){
      req.data = new Object();
    }
    req.data.state = state ? state : null;
    next();
  },
  tasklistReqProcess
).all('/list',
  (req,res)=>{
    res.status(405).send({message:errorStr.APIHTTPMethodNotAllowed, data:["GET"]});
    return;
  }
);

/***
 * SECTION: CREATING A NEW TASK
 */

/***
 * API parameters explanation
 */
let resDataCreateTaskParams = [
  ['name', '(Required) Name / Title of the task.'],
  ['description','(Required) Description of the task.'],
  ['application','(Required) The application that this task is for.'],
  ['plan','(Optional) The plan that this task is for.']
]

/***
 * POST /api/v1/tasks/create
 * 
 * API POST request to create a new task.
 * This API should tell user how to use it,
 * in case of missing or malformed body.
 */
router.post('/create',
 async(req,res)=>{
  //console.log('hit: api/v1/tasks/create POST');
  let {name, description, application, plan} = req.body;
  if(!name || !description || !application){
    res.status(422).send({message:errorStr.APIMissingParameters,data:resDataCreateTaskParams});
    return;
  }
  // check if application exists
  let appQuery = `SELECT ${dbModel.getDbColFormat_ListApplications()} FROM ${dbModel.getDbApplicationSchema()} WHERE ${dbModel.getDbApplicationSchemaColAcronym()} = '${application}'`;
  let retapp = await dbModel.performQuery(appQuery);
  if(retapp.error){
    res.status(500).send({message:errorStr.internalErrorDB,data:null});
    return;
  }
  if(retapp.result.length < 1){
    res.status(404).send({message:errorStr.APIUnknownApplication,data:null});
    return;
  }
  if(retapp.result.length > 1){
    //console.dir("retapp.result.length: potential database error at usergroup");
    res.status(500).send({message:errorStr.internalErrorDB,data:null});
    return;
  }

  // check if user has permission to create task for given application
  // query what usergroups this user belongs to.
  let grpQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${req.data.username}'`;
  let retgrp = await dbModel.performQuery(grpQuery);
  if(retgrp.error){
    res.status(500).send({message:errorStr.internalErrorDB,data:null});
    return;
  }
  if(retgrp.result.length > 1){
    //console.dir("retgrp.result.length: potential database error at usergroup");
    res.status(500).send({message:errorStr.internalErrorDB,data:null});
    return;
  }
  let usergroup = helperModel.regexfy_usergroup(retgrp.result[0].usergroup);
  usergroup = new RegExp(usergroup);
  if(!usergroup.test(retapp.result[0].App_permit_createTask)){
    res.status(403).send({message:errorStr.APICreateTaskNoPermit, data:application});
    return;
  }

  // if 'plan' is provided, check if plan exists
  if(plan){
    let planQuery = `SELECT count(*) AS 'count' FROM ${dbModel.getDbPlanSchema()} WHERE ${dbModel.getDbPlanSchemaColMVPName()} = '${plan}'`;
    let retplan = await dbModel.performQuery(planQuery);
    if(retplan.error){
      res.status(500).send({message:errorStr.internalErrorDB, data:null});
      return;
    }
    if(retplan.result[0].count < 1){
      res.status(404).send({message:errorStr.APIPlanInvalid, data:null});
      return;
    }
    if(retplan.result[0].count > 1){
      res.status(500).send({message:errorStr.internalErrorDB, data:null});
      return;
    }
  }

  // query the running number
  let rnumQuery = `SELECT ${dbModel.getDbApplicationSchemaColRnumber()} FROM ${dbModel.getDbApplicationSchema()} WHERE ${dbModel.getDbApplicationSchemaColAcronym()} = '${application}'`;
  let retrnum = await dbModel.performQuery(rnumQuery);
  if(retrnum.error){
    res.status(500).send({message:errorStr.internalErrorDB,data:null});
    return;
  }
  if(retrnum.result.length !== 1){
    res.status(500).send({message:errorStr.internalErrorDB,data:null});
    return;
  }
  let rnum = Number(retrnum.result[0].App_Rnumber);
  let Task_id = application + '_' + rnum;
  let Task_creator = req.data.username; //(2022-05-05) req.data.username should be created from APIAuthModel authorization checker functions
  let Task_owner = req.data.username;
  let Task_name = dbModel.giveEscaped(name);
  let Task_description = dbModel.giveEscaped(description);
  let Task_plan = null;
  if(plan){
    Task_plan = dbModel.giveEscaped(plan);
  }


  //query substrings
  let qINSERT = `INSERT INTO ${dbModel.getDbTaskSchema()} `;
  //We separate out column Task_plan because it is an optional entry.
  //if Task_plan value exists from user-submitted form then we add the column in.
  let qColFormat = (Task_plan ? `(${dbModel.getDbColFormat_CreateTask()},${dbModel.getDbTaskSchemaColPlan()}) ` : `(${dbModel.getDbColFormat_CreateTask()}) `);
  let qVALUES = `VALUES `;
  //if Task_plan value exists from user-submitted form then we add the value in.
  let qArguments = (Task_plan ? `(${Task_name},${Task_description},'${Task_id}','${application}','${Task_creator}','${Task_owner}', ${Task_plan})` : `(${Task_name},${Task_description},'${Task_id}','${application}','${Task_creator}','${Task_owner}')`);
  let insQuery = qINSERT + qColFormat + qVALUES + qArguments;
  //console.log('insQuery = '+insQuery);
  let retins = await dbModel.performQuery(insQuery);
  if(retins.error){
    //console.dir(retins.error);
    if(retins.error.errno === 1062){
      res.status(409).send({message:errorStr.createTaskIDTaken, data:null});
    } else {
      res.status(500).send({message:errorStr.internalErrorDB,data:null});
    }
    return;
  }

  ++rnum;
  rnumQuery = `UPDATE ${dbModel.getDbApplicationSchema()} SET ${dbModel.getDbApplicationSchemaColRnumber()} = ${rnum} WHERE ${dbModel.getDbApplicationSchemaColAcronym()} = '${application}'`;
  retrnum = await dbModel.performQuery(rnumQuery);
  if(retrnum.error){
    //console.dir(retrnum.error);
    res.status(500).send({message:errorStr.createTaskRNumCannotIncrement,data:null});
    return;
  }
  res.status(201).send({message:`Task ${Task_id} successfully created.`, data:null});
 }
).all('/create',
  (req,res)=>{
    res.status(405).send({message:errorStr.APIHTTPMethodNotAllowed, data:["POST"]});
    return;
  }
);

/***
 * SECTION: PROMOTING A TASK
 */

/***
 * API endpoints list
 */
let resDataPromoteTaskChoices = [
  ['api/v1/promote/doing_to_done', 'API to promote one specific task from [doing] state to [done] state.'],
]

/***
 * (ALL) /api/v1/tasks/promote
 * 
 * We recognize the request, but instead lead users to use the specific
 * API endpoints.
 */
router.all('/promote',
  (req,res)=>{
    //console.log('hit: api/v1/tasks/promote GET');
    res.status(405).send({message:errorStr.APIPromoteTaskShowAPIs, data:resDataPromoteTaskChoices});
    return;
  }
);

/***
 * (OLD CODE) list of parameters for promote task API
 */
// let resDataPromoteTaskParams = [
//   ['taskid', '(Required) Task ID of task to promote.'],
//   ['tostate','(Required) State to promote to.']
// ]

/***
 * (OLD CODE) POST /api/v1/tasks/promote
 * 
 * API POST request to promote a task.
 * This API should tell user how to use it,
 * in case of missing or malformed body.
 */
// router.post('/promote',
//   async(req,res)=>{
//     let {taskid, tostate} = req.body;
//     if(!taskid || !tostate){
//       res.status(422).send({message:errorStr.APIMissingParameters,data:resDataPromoteTaskParams});
//       return;
//     }
//     // check if task exists
//     let taskQuery = `SELECT ${dbModel.getDbColFormat_TaskDetails()} FROM ${dbModel.getDbTaskSchema()} WHERE ${dbModel.getDbTaskSchemaColID()} = '${taskid}'`;
//     let rettask = await dbModel.performQuery(taskQuery);
//     if(rettask.error){
//       res.status(500).send({message:errorStr.internalErrorDB,data:null});
//       return;
//     }
//     if(rettask.result.length < 1){
//       res.status(404).send({message:errorStr.APITaskNotExist,data:null});
//       return;
//     }
//     if(rettask.result.length > 1){
//       res.status(500).send({message:errorStr.internalErrorDB,data:null});
//       return;
//     }
//     let taskCurrentState = rettask.result[0].Task_state;

//     //check if promotion to specified state is valid
//     if(!workflowModel.checkValidTaskPromotion(taskCurrentState, tostate)){
//       res.status(409).send({message:errorStr.APITaskCannotPromoteToState,data:[
//         taskCurrentState,
//         workflowModel.getValidTaskPromotions(taskCurrentState)
//       ]});
//       return;
//     }

//     // check if user has permission(s)
//     // query what usergroups this user belongs to.
//     let grpQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${req.data.username}'`;
//     let retgrp = await dbModel.performQuery(grpQuery);
//     if(retgrp.error){
//       res.status(500).send({message:errorStr.internalErrorDB,data:null});
//       return;
//     }
//     if(retgrp.result.length > 1){
//       //console.dir("retgrp.result.length: potential database error at usergroup");
//       res.status(500).send({message:errorStr.internalErrorDB,data:null});
//       return;
//     }
//     let usergroup = helperModel.regexfy_usergroup(retgrp.result[0].usergroup);
//     usergroup = new RegExp(usergroup);
//     // use task's current state to help determine.
//     let taskAppAcronym = rettask.result[0].Task_app_Acronym;
//     let checkThisPerm = dbModel.mapTaskStatesToAppPerms(taskCurrentState);
//     let permQuery = `SELECT ${checkThisPerm} FROM ${dbModel.getDbApplicationSchema()} WHERE ${dbModel.getDbApplicationSchemaColAcronym()} = '${taskAppAcronym}'`;
//     let retperm = await dbModel.performQuery(permQuery);
//     if(retperm.error){
//       res.status(500).send({message:errorStr.internalErrorDB,data:null});
//       return;
//     }
//     if(retperm.result.length !== 1){
//       res.status(500).send({message:errorStr.internalErrorDB,data:null});
//       return;
//     }

//     checkThisPerm = helperModel.stringRemoveBackticks(checkThisPerm);
//     if(!usergroup.test(retperm.result[0][checkThisPerm])){
//       res.status(403).send({message:errorStr.APIPromoteTaskNoPermit, data:[taskCurrentState,tostate]});
//       return;
//     }

//     //task exists, promotion path is valid, user has permissions.
//     //promote the task.
//     let updQ = `UPDATE ${dbModel.getDbTaskSchema()} SET ${dbModel.getDbTaskSchemaColState()}='${tostate}',${dbModel.getDbTaskSchemaColOwner()}='${req.data.username}' WHERE ${dbModel.getDbTaskSchemaColID()} = '${taskid}'`;
//     let retupdQ = await dbModel.performQuery(updQ);
//     if(retupdQ.error){
//       res.status(500).send({message:errorStr.internalErrorDB,data:null});
//       return;
//     }

//     //insert system-generated note
//     selQ = `SELECT ${dbModel.getDbTaskSchemaColNotes()} FROM ${dbModel.getDbTaskSchema()} WHERE ${dbModel.getDbTaskSchemaColID()} = '${taskid}'`;
//     retselQ = await dbModel.performQuery(selQ);
//     let arr; 
//     if(retselQ.result){
//         arr = JSON.parse(retselQ.result[0].Task_notes);
//     }
//     let sysNote = {
//         user:"TMSYSADMIN",
//         taskState:tostate, 
//         content:"User " + req.data.username + " changed this task's state from [" + taskCurrentState + "] to [" + tostate + "]",
//         datetime:(new Date()).toISOString()
//     }
//     if(arr){
//         arr.unshift(sysNote);
//     } else{
//         arr = [sysNote];
//     }
//     arr = JSON.stringify(arr);
//     updQ = `UPDATE ${dbModel.getDbTaskSchema()} SET ${dbModel.getDbTaskSchemaColNotes()}`+'='+dbModel.giveEscaped(arr) + ` WHERE ${dbModel.getDbTaskSchemaColID()} = '${taskid}'`;
//     retupdQ = await dbModel.performQuery(updQ); 
    
//     res.status(200).send({message:"Task <"+taskid+"> successfully promoted.",data:[sysNote.content]});
//   }
// );

/***
 * SECTION: SPECIFIC PROMOTIONS OF TASK
 */

/***
 * parameter list for 'promote (specific state)' API
 */
let resDataPromoteTaskSpecificStatesParam = [
  ['taskid', '(Required) Task ID of task to promote.']
]

/***
 * POST /api/v1/tasks/promote/doing_to_done
 * 
 * API POST request to promote a task specifically from 'doing' to 'done'
 * This API should tell user how to use it,
 * in case of missing or malformed body.
 */
router.post('/promote/doing_to_done',
 async(req,res)=>{
   let {taskid} = req.body;
   if(!taskid){
     res.status(422).send({message:errorStr.APIMissingParameters,data:resDataPromoteTaskSpecificStatesParam});
     return;
   }
   // check if task exists
   let taskQuery = `SELECT ${dbModel.getDbColFormat_TaskDetails()} FROM ${dbModel.getDbTaskSchema()} WHERE ${dbModel.getDbTaskSchemaColID()} = '${taskid}'`;
   let rettask = await dbModel.performQuery(taskQuery);
   if(rettask.error){
     res.status(500).send({message:errorStr.internalErrorDB,data:null});
     return;
   }
   if(rettask.result.length < 1){
     res.status(404).send({message:errorStr.APITaskNotExist,data:null});
     return;
   }
   if(rettask.result.length > 1){
     res.status(500).send({message:errorStr.internalErrorDB,data:null});
     return;
   }
   let taskCurrentState = rettask.result[0].Task_state;

   //check if promotion to specified state is valid
   if(!workflowModel.checkValidTaskPromotion(taskCurrentState, dbModel.getDbTaskSchemaColStateEnumDone())){
     res.status(409).send({message:errorStr.APITaskCannotPromoteToState,data:[
       taskCurrentState,
       workflowModel.getValidTaskPromotions(taskCurrentState)
     ]});
     return;
   }

   // check if user has permission(s)
   // query what usergroups this user belongs to.
   let grpQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${req.data.username}'`;
   let retgrp = await dbModel.performQuery(grpQuery);
   if(retgrp.error){
     res.status(500).send({message:errorStr.internalErrorDB,data:null});
     return;
   }
   if(retgrp.result.length > 1){
     //console.dir("retgrp.result.length: potential database error at usergroup");
     res.status(500).send({message:errorStr.internalErrorDB,data:null});
     return;
   }
   let usergroup = helperModel.regexfy_usergroup(retgrp.result[0].usergroup);
   usergroup = new RegExp(usergroup);

   // use task's current state to help determine permission
   let taskAppAcronym = rettask.result[0].Task_app_Acronym;
   let checkThisPerm = dbModel.mapTaskStatesToAppPerms(taskCurrentState);
   let permQuery = `SELECT ${checkThisPerm} FROM ${dbModel.getDbApplicationSchema()} WHERE ${dbModel.getDbApplicationSchemaColAcronym()} = '${taskAppAcronym}'`;
   let retperm = await dbModel.performQuery(permQuery);
   if(retperm.error){
     res.status(500).send({message:errorStr.internalErrorDB,data:null});
     return;
   }
   if(retperm.result.length !== 1){
     res.status(500).send({message:errorStr.internalErrorDB,data:null});
     return;
   }

   checkThisPerm = helperModel.stringRemoveBackticks(checkThisPerm);
   if(!usergroup.test(retperm.result[0][checkThisPerm])){
     res.status(403).send({message:errorStr.APIPromoteTaskNoPermit, data:null});
     return;
   }

   //task exists, promotion path is valid, user has permissions.
   //promote the task.
   let updQ = `UPDATE ${dbModel.getDbTaskSchema()} SET ${dbModel.getDbTaskSchemaColState()}='${dbModel.getDbTaskSchemaColStateEnumDone()}',${dbModel.getDbTaskSchemaColOwner()}='${req.data.username}' WHERE ${dbModel.getDbTaskSchemaColID()} = '${taskid}'`;
   let retupdQ = await dbModel.performQuery(updQ);
   if(retupdQ.error){
     res.status(500).send({message:errorStr.internalErrorDB,data:null});
     return;
   }

   //insert system-generated note
   selQ = `SELECT ${dbModel.getDbTaskSchemaColNotes()} FROM ${dbModel.getDbTaskSchema()} WHERE ${dbModel.getDbTaskSchemaColID()} = '${taskid}'`;
   retselQ = await dbModel.performQuery(selQ);
   let arr; 
   if(retselQ.result){
       arr = JSON.parse(retselQ.result[0].Task_notes);
   }
   let sysNote = {
       user:"TMSYSADMIN",
       taskState:dbModel.getDbTaskSchemaColStateEnumDone(), 
       content:"User " + req.data.username + " changed this task's state from [" + taskCurrentState + "] to [" + dbModel.getDbTaskSchemaColStateEnumDone() + "]",
       datetime:(new Date()).toISOString()
   }
   if(arr){
       arr.unshift(sysNote);
   } else{
       arr = [sysNote];
   }
   arr = JSON.stringify(arr);
   updQ = `UPDATE ${dbModel.getDbTaskSchema()} SET ${dbModel.getDbTaskSchemaColNotes()}`+'='+dbModel.giveEscaped(arr) + ` WHERE ${dbModel.getDbTaskSchemaColID()} = '${taskid}'`;
   retupdQ = await dbModel.performQuery(updQ); 
   
   res.status(200).send({message:"Task <"+taskid+"> successfully promoted.",data:[sysNote.content]});

   //send email to notify people with 'done' permission
   //first get what groups have that permission for the application.

   let doneQuery = `SELECT ${dbModel.getDbApplicationSchemaColPermitDone()} AS 'donepermit' FROM ${dbModel.getDbApplicationSchema()} WHERE ${dbModel.getDbApplicationSchemaColAcronym()} = '${taskAppAcronym}'`;
   let retdone = await dbModel.performQuery(doneQuery);
   if(retdone.error){
     console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.data.username + '>, for task <' + taskid + '>.');
     console.log('Reason: doneQuery error');
     return;
   }
   if(!retdone.result || !retdone.result.length){
      console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.data.username + '>, for task <' + taskid + '>.');
      console.log('Reason: doneQuery no result');
      return;
   }
   let donegroup = helperModel.regexfy_usergroup(retdone.result[0].donepermit);

   //then get usernames of those inside these groups
   let toUsersQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsername()} AS 'user' FROM ${dbModel.getDbUsergroupsSchema()} WHERE REGEXP_LIKE(${dbModel.getDbUsergroupsSchemaColUsergroup()}, '${donegroup}')`;
   let rettoUsers = await dbModel.performQuery(toUsersQuery);
   if(rettoUsers.error){
    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.data.username + '>, for task <' + taskid + '>.');
    console.log('Reason: toUsersQuery error');
    return;
   }
   if(!rettoUsers.result || !rettoUsers.result.length){
    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.data.username + '>, for task <' + taskid + '>.');
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
    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.data.username + '>, for task <' + taskid + '>.');
    console.log('Reason: emailQuery error ("to")');
    return;
   }
   if(!retemail.result || !retemail.result.length){
    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.data.username + '>, for task <' + taskid + '>.');
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
   emailQuery = `SELECT ${dbModel.getDbLoginSchemaColEmail()} AS 'email' FROM ${dbModel.getDbLoginSchema()} WHERE ${dbModel.getDbLoginSchemaColUsername()} = '${req.data.username}'`;
   retemail = await dbModel.performQuery(emailQuery);
   if(retemail.error){
    console.dir(retemail.error);
    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.data.username + '>, for task <' + taskid + '>.');
    console.log('Reason: emailQuery error ("from")');
    return;
   }
   if(!retemail.result || !retemail.result.length){
    console.log('API Promote Doing to Done: Email not sent by API call from: user <' + req.data.username + '>, for task <' + taskid + '>.');
    console.log('Reason: emailQuery no result ("from")');
    return;
   }
   let sender = retemail.result[0].email;

   var message = {
    from: sender,
    to: toList,
    subject: "Task " + taskid + " to be approved",
    text: "Task " + taskid + " has been promoted to done state, waiting for task to be approved."
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
).all('/promote/doing_to_done',
  (req,res)=>{
    res.status(405).send({message:errorStr.APIHTTPMethodNotAllowed, data:["POST"]});
    return;
  }
);

module.exports = router;