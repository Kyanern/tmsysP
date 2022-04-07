const express = require('express');
const router = express.Router();
const checksModel = require('../models/checks');
const dbModel = require('../models/db');
const errorStr = require('../config/errorstring.config.json');
const helperModel = require('../models/helperfuncs');

let renderPlanList = async (req, res, finalError, finalSuccess) => {
  let {plan_mvp_name} = req.query;
  //first query what groups this user belongs to.
  let grpQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${req.session.username}'`;
  let retgrp = await dbModel.performQuery(grpQuery);
  if(retgrp.error || !retgrp.result.length){
    //console.log('\n***\n' + error + '\n***\n');
    res.render('plan_list', {
      isLoggedIn: req.session.isLoggedIn,
      error:errorStr.internalErrorDB,
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
  //construct query
  //if no search term display all
  let appQuery = qSELECTFROM + qWHERE + '(' + qCond1 + qOR + qCond2 + qOR + qCond3 + qOR + qCond4 + qOR + qCond5 + qOR + qCond6 + ')';
  //console.log(myQuery);
  let retapp = await dbModel.performQuery(appQuery);
  if(retapp.error){
    console.dir(retapp.error);
    res.render('plan_list', {isLoggedIn: req.session.isLoggedIn, error:errorStr.internalErrorDB, errorSpecial: finalError});
    return;
  }
  //TODO: complete plan_list
}

let renderCreateForm = async (req, res, finalError, finalSuccess) => {
    //grab list of usergroups this user belongs to.
    let grpQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${req.session.username}'`;
    let retgrp = await dbModel.performQuery(grpQuery);
    if(retgrp.error || (retgrp.result.length !== 1)){
      console.dir(retgrp.error);
      res.render('plan_create', {isLoggedIn: req.session.isLoggedIn, error:errorStr.internalErrorDB, disallowed: true, success: finalSuccess});
      return;
    }
  
    //grab list of apps this user can create plans for.
    let usergroup = helperModel.regexfy_usergroup(retgrp.result[0].usergroup);
    let appQuery = `SELECT ${dbModel.getDbApplicationSchemaColAcronym()} FROM ${dbModel.getDbApplicationSchema()} WHERE REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitCreatePlan()},'${usergroup}')`;
    let retapp = await dbModel.performQuery(appQuery);
    if(retapp.error){
      console.dir(retapp.error);
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
router.get('/', async (req,res,next)=>{

});

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
    console.dir(retQ.error);
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