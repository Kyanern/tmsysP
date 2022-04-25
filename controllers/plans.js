const express = require('express');
const router = express.Router();
const checksModel = require('../models/checks');
const dbModel = require('../models/db');
const errorStr = require('../config/errorstring.config.json');
const helperModel = require('../models/helperfuncs');

let renderPlanList = async (req, res, finalError, finalSuccess) => {
  //first query what groups this user belongs to.
  let grpQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${req.session.username}'`;
  let retgrp = await dbModel.performQuery(grpQuery);
  if(retgrp.error){
    //console.log('\n***\n' + error + '\n***\n');
    res.render('plan_list', {
      isLoggedIn: req.session.isLoggedIn,
      isSearching: true,
      error:errorStr.internalErrorDB,
      errorSpecial: finalError
    });
    return;
  }
  if(!retgrp.result.length){
    //console.log('\n***\n' + error + '\n***\n');
    res.render('plan_list', {
      isLoggedIn: req.session.isLoggedIn,
      isSearching: true,
      error:errorStr.userNoUsergroups,
      errorSpecial: finalError
    });
    return;
  }
  let usergroup = helperModel.regexfy_usergroup(retgrp.result[0].usergroup);
  //then query the applications that this user can view
  //query substrings
  //SUGGESTION: make a App_permit_View column and REGEXP_LIKE only that column.
  let qSELECTFROM = `SELECT ${dbModel.getDbApplicationSchemaColAcronym()} FROM ${dbModel.getDbApplicationSchema()} `;
  let qWHERE = `WHERE `;
  let qOR = `OR `;
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
    // console.dir(retapp.error);
    res.render('plan_list', {isLoggedIn: req.session.isLoggedIn, isSearching: true, error:errorStr.internalErrorDB, errorSpecial: finalError});
    return;
  }
  if(retapp.result.length === 0){
    res.render('plan_list', {isLoggedIn: req.session.isLoggedIn, isSearching: true, error: errorStr.listPlanNoPlans, errorSpecial: finalError});
    return;
  }
  let acronyms = helperModel.regexfy_appAcronyms(retapp.result);
  //now we have applications that this user can view, we get the plans attached to those applications.
  let planQuery = `SELECT ${dbModel.getDbColFormat_ListPlans()} FROM ${dbModel.getDbPlanSchema()} WHERE REGEXP_LIKE(${dbModel.getDbPlanSchemaColAcronym()}, '${acronyms}') `;
  let {plan_mvp_name} = req.query;
  if(plan_mvp_name){
    planQuery += `AND ${dbModel.getDbPlanSchemaColMVPName()} LIKE '%${plan_mvp_name}%' `;
  }
  let retplan = await dbModel.performQuery(planQuery);
  if(retplan.result.length === 0){
    res.render('plan_list', {isLoggedIn: req.session.isLoggedIn, isSearching: true, error: errorStr.listPlanNoPlans, errorSpecial: finalError});
    return;
  }
  for(let i = 0; i < retplan.result.length; i++){
    // we have to translate between mysql and html date formats. in my particular case
    // mysql returns me dates in the ISO format (e.g. 2022-03-31T16:00:00.000Z)
    // as a Date object
    // but i have to pass html the date without the T-part.
    // there are a few ways to extract the date...
    // 2022 04 01 : toString then split. this might break if mysql changes formats.
    let temp = (retplan.result[i].Plan_startDate.toISOString().split('T'))[0];
    retplan.result[i].Plan_startDate = temp;
    temp = (retplan.result[i].Plan_endDate.toISOString().split('T'))[0];
    retplan.result[i].Plan_endDate = temp;
}
  res.render('plan_list', {
    isLoggedIn: req.session.isLoggedIn,
    isSearching: true,
    planList: retplan.result,
    error: finalError,
    success: finalSuccess
  });
}

let renderCreateForm = async (req, res, finalError, finalSuccess) => {
    //grab list of usergroups this user belongs to.
    let grpQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${req.session.username}'`;
    let retgrp = await dbModel.performQuery(grpQuery);
    if(retgrp.error || (retgrp.result.length !== 1)){
      // console.dir(retgrp.error);
      res.render('plan_create', {isLoggedIn: req.session.isLoggedIn, error:errorStr.internalErrorDB, disallowed: true, success: finalSuccess});
      return;
    }
  
    //grab list of apps this user can create plans for.
    let usergroup = helperModel.regexfy_usergroup(retgrp.result[0].usergroup);
    let appQuery = `SELECT ${dbModel.getDbApplicationSchemaColAcronym()} FROM ${dbModel.getDbApplicationSchema()} WHERE REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitCreatePlan()},'${usergroup}')`;
    let retapp = await dbModel.performQuery(appQuery);
    if(retapp.error){
      // console.dir(retapp.error);
      res.render('plan_create', {isLoggedIn: req.session.isLoggedIn, error:errorStr.internalErrorDB, disallowed: true, success: finalSuccess});
      return;
    }
    if(retapp.result.length === 0){
      res.render('plan_create', {isLoggedIn: req.session.isLoggedIn, error: errorStr.createPlanNoPermits, disallowed: true, success: finalSuccess});
      return;
    }
    let options = {
      isLoggedIn: req.session.isLoggedIn,
      acronymList: retapp.result,
      error: finalError,
      success: finalSuccess
    }
    res.render('plan_create', options);
}

router.use(async (req, res, next) => {
  // console.log('Time: ', Date.now());

  if(!req.session.isLoggedIn){
      res.redirect('/login');
      return;
  }
  
  // console.log(req.body);
  next();
});

//GET request for Plans List
router.get('/', async (req,res)=>{
  renderPlanList(req,res);
});

//POST request for Plans List
router.post('/', 
  //handles POST request from a btn_editThisPlan button
  async (req,res,next)=>{
    let {btn_editThisPlan} = req.body;
    if(!btn_editThisPlan){
      next();
    } else{
      let {Plan_MVP_name, Plan_app_Acronym, Plan_startDate, Plan_endDate} = req.body;
      let options = {
        isLoggedIn : req.session.isLoggedIn,
        isEditingPlan: true,
        Plan_MVP_name: Plan_MVP_name,
        Plan_app_Acronym: Plan_app_Acronym,
        Plan_startDate: Plan_startDate,
        Plan_endDate: Plan_endDate
      }
      res.render('plan_list',options);
    }
  },
  //handles POST request from a btn_editPlan button
  async (req,res,next)=>{
    let{btn_editPlan} = req.body;
    if(!btn_editPlan){
      next();
    } else{
      let {Plan_MVP_name, Plan_app_Acronym, Plan_startDate, Plan_endDate} = req.body;
      let {Plan_startDate_new, Plan_endDate_new} = req.body;
      let disp_startDate = Plan_startDate;
      let disp_endDate = Plan_endDate;
      let myQuery = `UPDATE ${dbModel.getDbPlanSchema()} SET `;
      let myStack = [];
      if(Plan_startDate !== Plan_startDate_new){
        myStack.push(`${dbModel.getDbPlanSchemaColDateStart()}='${Plan_startDate_new}'`);
        disp_startDate = Plan_startDate_new;
        //console.log("pushed new start date into stack");
      }
      if(Plan_endDate !== Plan_endDate_new){
        myStack.push(`${dbModel.getDbPlanSchemaColDateEnd()}='${Plan_endDate_new}'`);
        disp_endDate = Plan_endDate_new;
        //console.log("pushed new end date into stack");
      }
      if(!myStack.length){
        let options = {
          isLoggedIn : req.session.isLoggedIn,
          isEditingPlan: true,
          Plan_MVP_name: Plan_MVP_name,
          Plan_app_Acronym: Plan_app_Acronym,
          Plan_startDate: Plan_startDate,
          Plan_endDate: Plan_endDate,
          error: errorStr.nothingToModify
        }
        res.render('plan_list',options);
        return;
      }
      while(myStack.length){  //might be dangerous...?
        myQuery += myStack.pop();
        if(myStack.length) myQuery += ',';
      }
      myQuery += ` WHERE ${dbModel.getDbPlanSchemaColMVPName()}='${Plan_MVP_name}';`;
      let retQ = await dbModel.performQuery(myQuery);
      if(retQ.error){
        let options = {
          isLoggedIn : req.session.isLoggedIn,
          isEditingPlan: true,
          Plan_MVP_name: Plan_MVP_name,
          Plan_app_Acronym: Plan_app_Acronym,
          Plan_startDate: Plan_startDate,
          Plan_endDate: Plan_endDate,
          error: errorStr.nothingToModify
        }
        res.render('plan_list',options);
        return;
      }
      let options = {
        isLoggedIn : req.session.isLoggedIn,
        isEditingPlan: true,
        Plan_MVP_name: Plan_MVP_name,
        Plan_app_Acronym: Plan_app_Acronym,
        Plan_startDate: disp_startDate,
        Plan_endDate: disp_endDate,
        success: `'${Plan_MVP_name}'@${Plan_app_Acronym} successfully updated.`
      }
      res.render('plan_list',options);
    }
  },
  //handles POST request from a btn_deletePlan button
  async (req,res,next)=>{
    let {btn_deletePlan} = req.body;
    if(!btn_deletePlan){
      next();
    } else {
      //note that we aren't doing some safety checks.
      let myQuery = `DELETE FROM ${dbModel.getDbPlanSchema()} WHERE ${dbModel.getDbPlanSchemaColMVPName()} = '${btn_deletePlan}';`;
      let retQ = await dbModel.performQuery(myQuery);
      let {error, result} = retQ;
      if(error){
        // console.dir(error);
        if(error.errno === 1451){
          renderPlanList(req, res, errorStr.deletePlanFailed, null);
        } else {
          renderPlanList(req, res, errorStr.internalErrorDB, null);
        }
        return;
      }
      renderPlanList(req, res, null, `Plan '${btn_deletePlan}' deleted.`);
    }
  }
);

//GET request for Create Plan
router.get('/create', async(req,res)=>{
  renderCreateForm(req,res);
});

//POST request for Create Plan
router.post('/create', async(req,res)=>{
  let {Plan_app_Acronym, Plan_MVP_name, Plan_startDate, Plan_endDate} = req.body;
  let myQuery = `INSERT INTO ${dbModel.getDbPlanSchema()}(${dbModel.getDbPlanSchemaColMVPName()},${dbModel.getDbPlanSchemaColDateStart()},${dbModel.getDbPlanSchemaColDateEnd()},${dbModel.getDbPlanSchemaColAcronym()}) VALUES('${Plan_MVP_name}','${Plan_startDate}','${Plan_endDate}','${Plan_app_Acronym}')`;
  let retQ = await dbModel.performQuery(myQuery);
  if(retQ.error){
    // console.dir(retQ.error);
    if(retQ.error.errno === 1062){
      //res.render('plan_create', {isLoggedIn: req.session.isLoggedIn, error: (errorStr.createPlanNameTaken + Plan_MVP_name)});
      renderCreateForm(req,res,(errorStr.createPlanNameTaken + Plan_MVP_name),null);
    } else {
      //res.render('plan_create', {isLoggedIn: req.session.isLoggedIn, error: errorStr.internalErrorDB});
      renderCreateForm(req,res,errorStr.internalErrorDB,null);
    }
    return;
  }
  //res.render('plan_create', {isLoggedIn: req.session.isLoggedIn, success: `Plan '${Plan_MVP_name}'@${Plan_app_Acronym} created. `});
  renderCreateForm(req,res,null,`Plan '${Plan_MVP_name}'@${Plan_app_Acronym} created. `);
})

module.exports = router;