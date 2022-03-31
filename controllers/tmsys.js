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
    req.body.isAdmin = await checksModel.checkGroup(req.session.username, 'admin');
    console.log(req.body);
    next();
});

router.get('/', 
    async (req,res,next)=>{
        //this callback handles the AJAX with reqUID: AppPlanTaskJSON
        let {reqUID} = req.query;
        let username = req.session.username;
        if(reqUID != "AppPlanTaskJSON"){
            next();
        } else {
            let q1 = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${username}'`;
            let q1re = await dbModel.performQuery(q1);
            if(q1re.error){
                console.log(error);
                console.log(`tmsys - while servicing AJAX request, query 1 failed`);
                res.send({error: errorStr.internalErrorDB});
                return;
            }
            if(!q1re.result.length){
                console.log(`tmsys - while servicing AJAX request, could not find ${username} in table ${dbModel.getDbUsergroupsSchema()}`);
                res.send({error: errorStr.internalErrorDB});
                return;
            }
            //execution reach here means user exists in usergroups table
            let grps = q1re.result[0].usergroup;
            try{
                grps = grps.replaceAll(',','|');
            } catch(e){
                console.log(e);
                console.log('tmsys - while servicing AJAX request, could not replace substrings in the usergroup string');
                console.log('tmsys - maybe grps is not a string?');
                res.send({error: errorStr.internalErrorWebsite});
                return;
            }

            let q2regex = `(?:^|,)(${grps})(?:,|$)`;
            let q2SELECT = `SELECT ${dbModel.getDbColFormat_AppPlanTaskJSON_Apps_SELECT()} `;
            let q2FROM = `FROM ${dbModel.getDbApplicationSchema()} `;
            let q2WHERE = `WHERE REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitOpen()},'${q2regex}') `;
            let q2AND1 = `AND REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitToDo()},'${q2regex}') `;
            let q2AND2 = `AND REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitDoing()},'${q2regex}') `;
            let q2AND3 = `AND REGEXP_LIKE(${dbModel.getDbApplicationSchemaColPermitDone()},'${q2regex}') ;`;
            //console.log(q2SELECT+q2FROM+q2WHERE+q2AND1+q2AND2+q2AND3);
            let q2re = await dbModel.performQuery(q2SELECT+q2FROM+q2WHERE+q2AND1+q2AND2+q2AND3);
            if(q2re.error){
                console.log(error);
                console.log(`tmsys - while servicing AJAX request, query 2 failed`);
                res.send({error: errorStr.internalErrorDB});
                return;
            }
            if(!q2re.result.length){
                //no applications permit this user's usergroups.
                //send back a blank object.
                res.send({});
                return;
            }
            //execution reach here means that there are applications permitting this user.
            //result[x] should be an object
            //TEMP: res.send the result
            res.send(q2re.result[0]);
        }
    },
    (req,res)=>{
        res.render('tmsys', {isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin});
    }
);

router.post('/', 
    async (req,res,next)=>{
        //handles create application form button
        let {btn_createApp} = req.body;
        if(!btn_createApp){
            next();
        } else {
            let {createAppAcronym, createAppDescription, createAppDateStart, createAppDateEnd} = req.body;
            let {createAppPermitOpen, createAppPermitToDo, createAppPermitDoing, createAppPermitDone} = req.body;

            let myQuery = `INSERT INTO ${dbModel.getDbApplicationSchema()}(${dbModel.getDbColFormat_CreateApplication()})`;
            myQuery += ` VALUES('${createAppAcronym}','${createAppDescription}','${createAppDateStart}','${createAppDateEnd}','${createAppPermitOpen}','${createAppPermitToDo}','${createAppPermitDoing}','${createAppPermitDone}')`;
            let retQ = await dbModel.performQuery(myQuery);
            let error= retQ.error;
            let options = {
                isLoggedIn: req.session.isLoggedIn,
                canAdmin: req.body.isAdmin
                //TODO: add in isRoles here
            }
            if(error){
                console.log('\n***\n'+error+'\n***\n');
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