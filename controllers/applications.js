const express = require('express');
const router = express.Router();
const checksModel = require('../models/checks');
const dbModel = require('../models/db');
const errorStr = require('../config/errorstring.config.json');

// *** helper functions specific to this router ***
let renderAppList = async (req, res, finalError, finalSuccess) => {
  // console.dir(req);
  let {app_acronym} = req.query;

  //first query what groups this user belongs to.
  let grpQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${req.session.username}'`;
  let retgrp = await dbModel.performQuery(grpQuery);
  if(retgrp.error || !retgrp.result.length){
    //console.log('\n***\n' + error + '\n***\n');
    res.render('app_list', {
      isLoggedIn: req.session.isLoggedIn, 
      error:errorStr.internalErrorDB,
      errorSpecial: finalError
    });
    return;
  }
  let {usergroup} = retgrp.result[0];
  usergroup = usergroup.replaceAll(',','|');
  usergroup = `(?:^|,)(${usergroup})(?:,|$)`;
  
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
  let qCond7 = `${dbModel.getDbApplicationSchemaColAcronym()} LIKE '%${app_acronym}%' `;
  //construct query
  //if no search term display all
  let myQuery = qSELECTFROM + qWHERE + '(' + qCond1 + qOR + qCond2 + qOR + qCond3 + qOR + qCond4 + qOR + qCond5 + qOR + qCond6 + ')';
  //console.log(myQuery);
  if(app_acronym){
    myQuery += qAND + qCond7
  }
  let retQ = await dbModel.performQuery(myQuery);
  let error = retQ.error;
  let rows = retQ.result;
  if(error){
    //console.log('\n***\n' + error + '\n***\n');
    res.render('app_list', {
        isLoggedIn: req.session.isLoggedIn, 
        error:errorStr.internalErrorDB,
        errorSpecial: finalError
    });
    return;
  }  
  // console.log('\n***\n' + rows + '\n***\n');
  // console.log('\n***\n' + rows.length + '\n***\n');
  
  let usergroupRX = new RegExp(usergroup);
  for(let i = 0; i < rows.length; i++){
      // we have to translate between mysql and html date formats. in my particular case
      // mysql returns me dates in the ISO format (e.g. 2022-03-31T16:00:00.000Z)
      // as a Date object
      // but i have to pass html the date without the T-part.
      // there are a few ways to extract the date...
      // 2022 04 01 : toString then split. this might break if mysql changes formats.
      let temp = (rows[i].App_startDate.toISOString().split('T'))[0];
      rows[i].App_startDate = temp;
      temp = (rows[i].App_endDate.toISOString().split('T'))[0];
      rows[i].App_endDate = temp;
      //for determining whether we should display the 'create' buttons
      rows[i].canCreatePlan = usergroupRX.test(rows[i].App_permit_createPlan);
      rows[i].canCreateTask = usergroupRX.test(rows[i].App_permit_createTask);
      rows[i].canEditApp = usergroupRX.test(rows[i].App_permit_editApp);
  }
  // console.dir(rows);

  res.render('app_list', {
      isLoggedIn: req.session.isLoggedIn,
      isSearching: true,
      appList: rows,
      error: finalError,
      success: finalSuccess
  });
}

let renderCreateForm = async (req,res,finalError,finalSuccess) => {
  req.body.isAdmin = await checksModel.checkGroup(req.session.username, 'admin');
  res.render("app_create",{isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin, error:finalError, success:finalSuccess});
}

// middleware that is specific to this router
router.use(async (req, res, next) => {
  // console.log('Time: ', Date.now());

  if(!req.session.isLoggedIn){
      res.redirect('/login');
      return;
  }
  
  // console.log(req.body);
  next();
});

router.get('/', async(req,res)=>{
  renderAppList(req, res, null, null);
});

router.post('/', 
  //handles POST request from a btn_editThisApplication button
  async (req,res,next)=>{
    let {btn_editThisApplication} = req.body;
    if(!btn_editThisApplication){
      next();
    } else{
      let {app_acronym,app_description,app_startDate,app_endDate} = req.body;
      let {app_permitOpen,app_permitToDo,app_permitDoing,app_permitDone, app_permitCreatePlan, app_permitCreateTask, app_permitEditApp} = req.body;
      let options = {
        isLoggedIn : req.session.isLoggedIn,
        isEditingApplication: true,
        App_Acronym: app_acronym,
        App_Description: app_description,
        App_startDate: app_startDate,
        App_endDate: app_endDate,
        App_permit_Open: app_permitOpen,
        App_permit_toDoList: app_permitToDo,
        App_permit_Doing: app_permitDoing,
        App_permit_Done: app_permitDone,
        App_permit_createPlan: app_permitCreatePlan,
        App_permit_createTask: app_permitCreateTask,
        App_permit_editApp: app_permitEditApp
      }
      res.render('app_list',options);
    }
  },
  //handles POST request from a btn_editApp button
  async (req,res,next)=>{
    let{btn_editApp} = req.body;
    if(!btn_editApp){
      next();
    } else{
      let {App_Acronym, App_Description, App_startDate, App_endDate} = req.body;
      let {App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_createPlan, App_permit_createTask, App_permit_editApp} = req.body;
      let {App_Description_new, App_startDate_new, App_endDate_new} = req.body;
      let {App_permit_Open_new, App_permit_toDoList_new, App_permit_Doing_new, App_permit_Done_new, App_permit_createPlan_new, App_permit_createTask_new, App_permit_editApp_new} = req.body;

      //these references will be used when the mySQL query is successful
      let disp_Description = App_Description;
      let disp_startDate = App_startDate;
      let disp_endDate = App_endDate;
      let disp_permit_Open = App_permit_Open;
      let disp_permit_toDoList = App_permit_toDoList;
      let disp_permit_Doing = App_permit_Doing;
      let disp_permit_Done = App_permit_Done;
      let disp_permit_createPlan = App_permit_createPlan;
      let disp_permit_createTask = App_permit_createTask;
      let disp_permit_editApp = App_permit_editApp;
      //prepare query construction,
      //verify information and append to query,
      //send query if all ok
      //note: we are ignoring most checks here.
      let myQuery = `UPDATE ${dbModel.getDbApplicationSchema()} SET `;
      let myStack = [];
      if(App_Description !== App_Description_new){
        myStack.push(`${dbModel.getDbApplicationSchemaColDescription()}='${App_Description_new}'`);
        disp_Description = App_Description_new;
        //console.log("pushed new description into stack");
      }
      if(App_startDate !== App_startDate_new){
        myStack.push(`${dbModel.getDbApplicationSchemaColDateStart()}='${App_startDate_new}'`);
        disp_startDate = App_startDate_new;
        //console.log("pushed new start date into stack");
      }
      if(App_endDate !== App_endDate_new){
        myStack.push(`${dbModel.getDbApplicationSchemaColDateEnd()}='${App_endDate_new}'`);
        disp_endDate = App_endDate_new;
        //console.log("pushed new end date into stack");
      }
      if(App_permit_Open !== App_permit_Open_new){
        myStack.push(`${dbModel.getDbApplicationSchemaColPermitOpen()}='${App_permit_Open_new}'`);
        disp_permit_Open = App_permit_Open_new;
        //console.log("pushed new permit_open into stack");
      }
      if(App_permit_toDoList !== App_permit_toDoList_new){
        myStack.push(`${dbModel.getDbApplicationSchemaColPermitToDo()}='${App_permit_toDoList_new}'`);
        disp_permit_toDoList = App_permit_toDoList_new;
        //console.log("pushed new permit_todo into stack");
      }
      if(App_permit_Doing !== App_permit_Doing_new){
        myStack.push(`${dbModel.getDbApplicationSchemaColPermitDoing()}='${App_permit_Doing_new}'`);
        disp_permit_Doing = App_permit_Doing_new;
        //console.log("pushed new permit_doing into stack");
      }
      if(App_permit_Done !== App_permit_Done_new){
        myStack.push(`${dbModel.getDbApplicationSchemaColPermitDone()}='${App_permit_Done_new}'`);
        disp_permit_Done = App_permit_Done_new;
        //console.log("pushed new permit_done into stack");
      }
      if(App_permit_createPlan !== App_permit_createPlan_new){
        myStack.push(`${dbModel.getDbApplicationSchemaColPermitCreatePlan()}='${App_permit_createPlan_new}'`);
        disp_permit_createPlan = App_permit_createPlan_new;
        //console.log("pushed new permit_createPlan into stack");
      }
      if(App_permit_createTask !== App_permit_createTask_new){
        myStack.push(`${dbModel.getDbApplicationSchemaColPermitCreateTask()}='${App_permit_createTask_new}'`);
        disp_permit_createTask = App_permit_createTask_new;
        //console.log("pushed new permit_createTask into stack");
      }
      if(App_permit_editApp !== App_permit_editApp_new){
        myStack.push(`${dbModel.getDbApplicationSchemaColPermitEditApp()}='${App_permit_editApp_new}'`);
        disp_permit_editApp = App_permit_editApp_new;
        //console.log("pushed new permit_editApp into stack");
      }

      if(!myStack.length){
        let options = {
          isLoggedIn : req.session.isLoggedIn,
          isEditingApplication: true,
          App_Acronym: App_Acronym,
          App_Description: App_Description,
          App_startDate: App_startDate,
          App_endDate: App_endDate,
          App_permit_Open: App_permit_Open,
          App_permit_toDoList: App_permit_toDoList,
          App_permit_Doing: App_permit_Doing,
          App_permit_Done: App_permit_Done,
          App_permit_createPlan: App_permit_createPlan,
          App_permit_createTask: App_permit_createTask,
          App_permit_editApp: App_permit_editApp,
          error: errorStr.nothingToModify
        }
        res.render('app_list',options);
        return;
      }

      while(myStack.length){  //might be dangerous...?
        myQuery += myStack.pop();
        if(myStack.length) myQuery += ',';
      }
      myQuery += ` WHERE ${dbModel.getDbApplicationSchemaColAcronym()}='${App_Acronym}';`;

      //perform query
      // console.log('***\n'+myQuery+'\n***');
      let retQ = await dbModel.performQuery(myQuery);
      // console.log('*** What is inside retQ? *** ');
      // console.dir(retQ);
      // console.log('*** That is all ***');
      if(retQ.error){
        let options = {
          isLoggedIn : req.session.isLoggedIn,
          isEditingApplication: true,
          App_Acronym: App_Acronym,
          App_Description: App_Description,
          App_startDate: App_startDate,
          App_endDate: App_endDate,
          App_permit_Open: App_permit_Open,
          App_permit_toDoList: App_permit_toDoList,
          App_permit_Doing: App_permit_Doing,
          App_permit_Done: App_permit_Done,
          App_permit_createPlan: App_permit_createPlan,
          App_permit_createTask: App_permit_createTask,
          App_permit_editApp: App_permit_editApp,
          error: errorStr.internalErrorDB
        }
        res.render('app_list',options);
        return;
      } //else
      let options = {
        isLoggedIn : req.session.isLoggedIn,
        isEditingApplication: true,
        App_Acronym: App_Acronym,
        App_Description: disp_Description,
        App_startDate: disp_startDate,
        App_endDate: disp_endDate,
        App_permit_Open: disp_permit_Open,
        App_permit_toDoList: disp_permit_toDoList,
        App_permit_Doing: disp_permit_Doing,
        App_permit_Done: disp_permit_Done,
        App_permit_createPlan: disp_permit_createPlan,
        App_permit_createTask: disp_permit_createTask,
        App_permit_editApp: disp_permit_editApp,
        success: `'${App_Acronym}' successfully updated.`
      }
      res.render('app_list',options);
    }
  },
  //handles POST request from btn_deleteApp
  async (req,res,next)=>{
    let {btn_deleteApp} = req.body;
    if(!btn_deleteApp){
      next();
    } else {
      // console.log('Attempting to delete application: ' + btn_deleteApp);
      //note that we aren't doing some safety checks.
      let myQuery = `DELETE FROM ${dbModel.getDbApplicationSchema()} WHERE ${dbModel.getDbApplicationSchemaColAcronym()} = '${btn_deleteApp}';`;
      let retQ = await dbModel.performQuery(myQuery);
      let {error, result} = retQ;
      if(error){
        // console.dir(error);
        if(error.errno === 1451){
          renderAppList(req, res, errorStr.deleteAppFailed, null);
        } else {
          renderAppList(req, res, errorStr.internalErrorDB, null);
        }
        return;
      }
      renderAppList(req, res, null, `Application '${btn_deleteApp}' deleted.`);
    }
  }
)

router.get('/create', async(req,res)=>{
  renderCreateForm(req,res);
})

router.post('/create', 
    //handles create application form button
    async (req,res,next)=>{
        //console.log('tmsys.js: Entered router.post /frame_main handles create application form button');
        let {btn_createApp} = req.body;
        if(!btn_createApp){
            next();
        } else {
            let {createAppAcronym, createAppNumber, createAppDescription, createAppDateStart, createAppDateEnd} = req.body;
            let {createAppPermitOpen, createAppPermitToDo, createAppPermitDoing, createAppPermitDone, createAppPermitCreatePlan, createAppPermitCreateTask, createAppPermitEditApp} = req.body;

            let myQuery = `INSERT INTO ${dbModel.getDbApplicationSchema()}(${dbModel.getDbColFormat_CreateApplication()})`;
            myQuery += ` VALUES('${createAppAcronym}', '${createAppNumber}', '${createAppDescription}','${createAppDateStart}','${createAppDateEnd}','${createAppPermitOpen}','${createAppPermitToDo}','${createAppPermitDoing}','${createAppPermitDone}','${createAppPermitCreatePlan}','${createAppPermitCreateTask}','${createAppPermitEditApp}')`;
            let retQ = await dbModel.performQuery(myQuery);
            let error= retQ.error;
            if(error){
                //console.dir(error);
                renderCreateForm(req,res,errorStr.internalErrorDB);
                return;
            }
            renderCreateForm(req,res,null,`Application ${createAppAcronym} successfully created`);
        }
    }
)

module.exports = router;