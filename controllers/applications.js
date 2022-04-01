const express = require('express');
const router = express.Router();
const checksModel = require('../models/checks');
const dbModel = require('../models/db');
const errorStr = require('../config/errorstring.config.json');

// middleware that is specific to this router
router.use(async (req, res, next) => {
  console.log('Time: ', Date.now());

  if(!req.session.isLoggedIn){
      res.redirect('/login');
      return;
  }
  req.body.isProjectLead = await checksModel.checkGroup(req.session.username, 'projectlead');
  console.log(req.body);
  next();
});

router.get('/', async(req,res)=>{
  let {app_acronym} = req.query;
  //query substrings
  let qSELECTFROM = `SELECT ${dbModel.getDbColFormat_ListApplications()} FROM ${dbModel.getDbApplicationSchema()} `;
  let qWHERE = `WHERE ${dbModel.getDbApplicationSchemaColAcronym()} LIKE '%${app_acronym}%'`;
  //construct query
  //if no search term display all
  let myQuery = qSELECTFROM;
  if(app_acronym){
    myQuery += qWHERE;
  }
  let retQ = await dbModel.performQuery(myQuery);
  let error = retQ.error;
  let rows = retQ.result;
  if(error){
    //console.log('\n***\n' + error + '\n***\n');
    res.render('app_list', {
        isLoggedIn: req.session.isLoggedIn, 
        canUpdateApp: req.body.isProjectLead,
        error:errorStr.internalErrorDB
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
      appList: rows
  });
});

router.post('/', 
  async (req,res,next)=>{
    //handles POST request from a btn_editThisApplication button
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
  }
)

module.exports = router;