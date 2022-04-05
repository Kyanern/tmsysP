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
      canUpdateApp: req.body.isProjectLead,
      error:errorStr.internalErrorDB,
      errorSpecial: finalError
    });
    return;
  }
  let {usergroup} = retgrp.result[0];
  usergroup = usergroup.replaceAll(',','|');

  //query substrings
  let qSELECTFROM = `SELECT ${dbModel.getDbColFormat_ListApplications()} FROM ${dbModel.getDbApplicationSchema()} `;
  let qWHERE = `WHERE `;
  let qOR = `OR `;
  let qAND = `AND `;
  let qCond1 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitOpen()}, '(?:^|,)(${usergroup})(?:,|$)') `;
  let qCond2 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitToDo()}, '(?:^|,)(${usergroup})(?:,|$)') `;
  let qCond3 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitDoing()}, '(?:^|,)(${usergroup})(?:,|$)') `;
  let qCond4 = `REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitDone()}, '(?:^|,)(${usergroup})(?:,|$)') `;
  let qCond5 = `${dbModel.getDbApplicationSchemaColAcronym()} LIKE '%${app_acronym}%' `;
  //construct query
  //if no search term display all
  let myQuery = qSELECTFROM + qWHERE + '(' + qCond1 + qOR + qCond2 + qOR + qCond3 + qOR + qCond4 + ')';
  //console.log(myQuery);
  if(app_acronym){
    myQuery += qAND + qCond5
  }
  let retQ = await dbModel.performQuery(myQuery);
  let error = retQ.error;
  let rows = retQ.result;
  if(error){
    //console.log('\n***\n' + error + '\n***\n');
    res.render('app_list', {
        isLoggedIn: req.session.isLoggedIn, 
        canUpdateApp: req.body.isProjectLead,
        error:errorStr.internalErrorDB,
        errorSpecial: finalError
    });
    return;
  }  
  // console.log('\n***\n' + rows + '\n***\n');
  // console.log('\n***\n' + rows.length + '\n***\n');

  // we have to translate between mysql and html date formats. in my particular case
  // mysql returns me dates in the ISO format (e.g. 2022-03-31T16:00:00.000Z)
  // as a Date object
  // but i have to pass html the date without the T-part.
  // there are a few ways to extract the date...
  // 2022 04 01 : toString then split. this might break if mysql changes formats.

  for(let i = 0; i < rows.length; i++){
      let temp = (rows[i].App_startDate.toISOString().split('T'))[0];
      rows[i].App_startDate = temp;
      temp = (rows[i].App_endDate.toISOString().split('T'))[0];
      rows[i].App_endDate = temp;
  }

  res.render('app_list', {
      isLoggedIn: req.session.isLoggedIn,
      canUpdateApp: req.body.isProjectLead,
      isSearching: true,
      appList: rows,
      error: finalError,
      success: finalSuccess
  });
}
// *** ***

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
      let {app_permitOpen,app_permitToDo,app_permitDoing,app_permitDone} = req.body;
      let options = {
        isLoggedIn : req.session.isLoggedIn,
        canUpdateApp: req.body.isProjectLead,
        isEditingApplication: true,
        App_Acronym: app_acronym,
        App_Description: app_description,
        App_startDate: app_startDate,
        App_endDate: app_endDate,
        App_permit_Open: app_permitOpen,
        App_permit_toDoList: app_permitToDo,
        App_permit_Doing: app_permitDoing,
        App_permit_Done: app_permitDone
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
      let {App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done} = req.body;
      let {App_Description_new, App_startDate_new, App_endDate_new} = req.body;
      let {App_permit_Open_new, App_permit_toDoList_new, App_permit_Doing_new, App_permit_Done_new} = req.body;

      //these references will be used when the mySQL query is successful
      let disp_Description = App_Description;
      let disp_startDate = App_startDate;
      let disp_endDate = App_endDate;
      let disp_permit_Open = App_permit_Open;
      let disp_permit_toDoList = App_permit_toDoList;
      let disp_permit_Doing = App_permit_Doing;
      let disp_permit_Done = App_permit_Done;
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
        //console.log("pushed new start date into stack");
      }
      if(App_permit_Open !== App_permit_Open_new){
        myStack.push(`${dbModel.getDbApplicationSchemaColPermitOpen()}='${App_permit_Open_new}'`);
        disp_permit_Open = App_permit_Open_new;
        //console.log("pushed new start date into stack");
      }
      if(App_permit_toDoList !== App_permit_toDoList_new){
        myStack.push(`${dbModel.getDbApplicationSchemaColPermitToDo()}='${App_permit_toDoList_new}'`);
        disp_permit_toDoList = App_permit_toDoList_new;
        //console.log("pushed new start date into stack");
      }
      if(App_permit_Doing !== App_permit_Doing_new){
        myStack.push(`${dbModel.getDbApplicationSchemaColPermitDoing()}='${App_permit_Doing_new}'`);
        disp_permit_Doing = App_permit_Doing_new;
        //console.log("pushed new start date into stack");
      }
      if(App_permit_Done !== App_permit_Done_new){
        myStack.push(`${dbModel.getDbApplicationSchemaColPermitDone()}='${App_permit_Done_new}'`);
        disp_permit_Done = App_permit_Done_new;
        //console.log("pushed new start date into stack");
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
          canUpdateApp: req.body.isProjectLead,
          isEditingApplication: true,
          App_Acronym: App_Acronym,
          App_Description: App_Description,
          App_startDate: App_startDate,
          App_endDate: App_endDate,
          App_permit_Open: App_permit_Open,
          App_permit_toDoList: App_permit_toDoList,
          App_permit_Doing: App_permit_Doing,
          App_permit_Done: App_permit_Done,
          error: errorStr.internalErrorDB
        }
        res.render('app_list',options);
        return;
      } //else
      let options = {
        isLoggedIn : req.session.isLoggedIn,
        canUpdateApp: req.body.isProjectLead,
        isEditingApplication: true,
        App_Acronym: App_Acronym,
        App_Description: disp_Description,
        App_startDate: disp_startDate,
        App_endDate: disp_endDate,
        App_permit_Open: disp_permit_Open,
        App_permit_toDoList: disp_permit_toDoList,
        App_permit_Doing: disp_permit_Doing,
        App_permit_Done: disp_permit_Done,
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
      console.log('Attempting to delete application: ' + btn_deleteApp);
      //note that we aren't doing some safety checks.
      //e.g. no checks for no rows deleted, etc.
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

module.exports = router;