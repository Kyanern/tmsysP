const express = require('express');
const router = express.Router();
const checksModel = require('../models/checks');
const dbModel = require('../models/db');
const argon2Model = require('../models/argon2');
const errorStr = require('../config/errorstring.config.json');
const argon2 = require('../models/argon2');

router.use(async (req, res, next) => {
    console.log('Time: ', Date.now());

    if(!req.session.isLoggedIn){
        res.redirect('../login');
        return;
    }

    let isAdmin = await checksModel.checkGroup(req.session.username, 'admin');
    if(!isAdmin){
        res.redirect('../menu2');
        return;
    }
    req.body.isAdmin = isAdmin;

    next();
});

router.get('/usercreate',  (req,res)=>{
    res.render('admin_usercreate',{isLoggedIn: req.session.isLoggedIn, canAdmin: req.body.isAdmin});
});

router.post('/usercreate', async (req,res)=>{
    const {username, password, email, isAdmin} = req.body;
    let isPWOK = checksModel.checkPasswordRequirements(password);
    if(!isPWOK){
        res.render('admin_usercreate',{isLoggedIn: req.session.isLoggedIn, canAdmin: isAdmin, error: errorStr.passwordReqFail});
        return;
    }
    let rethsh = await argon2Model.argon2Hash(password);
    let hash = rethsh.hash;
    let error = rethsh.error;
    if(error){
        res.render('admin_usercreate',{isLoggedIn: req.session.isLoggedIn, canAdmin: isAdmin, error: errorStr.internalErrorArgon2});
        return;
    }
    let myQuery = `INSERT INTO ${dbModel.getDbLoginSchema()}(${dbModel.getDbColFormat_CreateNewUser()}) VALUES('${username}','${hash}','${email}')`;
    let retQ = await dbModel.performQuery(myQuery);
    error = retQ.error;
    if(error){
        res.render('admin_usercreate',{isLoggedIn: req.session.isLoggedIn, canAdmin: isAdmin, error: errorStr.internalErrorDB});
        return;
    }
    let successString = `User '${username}' created.`;
    res.render('admin_usercreate', {isLoggedIn: req.session.isLoggedIn, canAdmin: isAdmin, success:successString});

    //TODO: Handle 'user already exists' error
});

router.get('/useredit', async (req,res)=>{
    let {username} = req.query;
    //query substrings
    let baseQuery = `SELECT t1.${dbModel.getDbLoginSchemaColUsername()},${dbModel.getDbLoginSchemaColEmail()},${dbModel.getDbLoginSchemaColIsActive()},${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM `;
    let t1QuerySubStr1 = `(SELECT ${dbModel.getDbLoginSchemaColUsername()},${dbModel.getDbLoginSchemaColEmail()},${dbModel.getDbLoginSchemaColIsActive()} FROM ${dbModel.getDbLoginSchema()} `;
    let t1QuerySubStr2 = `) AS t1 `;
    let innerJoinSubStr = `INNER JOIN `;
    let t2QuerySubStr1 = `(SELECT ${dbModel.getDbUsergroupsSchemaColUsername()},${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} `;
    let t2QuerySubStr2 = `) AS t2 `;
    let baseQueryConditions = `ON t1.${dbModel.getDbLoginSchemaColUsername()} = t2.${dbModel.getDbUsergroupsSchemaColUsername()};`;
    let txQueryCondition = `WHERE ${dbModel.getDbLoginSchemaColUsername()} LIKE '%${username}%'`;

    //construct query
    //if no search term, display all
    let myQuery = baseQuery + t1QuerySubStr1;
    if(username){
        myQuery += txQueryCondition;
    }
    myQuery += t1QuerySubStr2 + innerJoinSubStr + t2QuerySubStr1;
    if(username){
        myQuery += txQueryCondition;
    }
    myQuery += t2QuerySubStr2 + baseQueryConditions;

    let retQ = await dbModel.performQuery(myQuery);
    let error = retQ.error;
    let rows = retQ.result;
    console.log('\n***\n' + rows[0].isactive + '\n***\n');
    console.log('\n***\n' + typeof rows[0].isactive + '\n***\n');
    console.log('\n***\n' + typeof req.body + '\n***\n');
    if(error){
        //console.log('\n***\n' + error + '\n***\n');
        res.render('admin_useredit', {
            isLoggedIn: req.session.isLoggedIn, 
            canAdmin: req.body.isAdmin, 
            isSearching: true, 
            error:errorStr.internalErrorDB});
        return;
    }
    //console.log('\n***\n' + rows + '\n***\n');
    res.render('admin_useredit', {
        isLoggedIn: req.session.isLoggedIn, 
        canAdmin: req.body.isAdmin, 
        isSearching: true, 
        usernameList: rows});
});

router.post('/useredit', 
    //entered from a POST request from a "edit this user" button
    (req,res, next)=>{
        let {btn_editThisUser} = req.body;
        if(!btn_editThisUser){
            next();
        } else{
            let {username, email} = req.body;
            let isactive = parseInt(req.body.isactive);  //because the form sends back isactive as a string...
            // console.log('*** POST edit this user ***');
            // console.log(isactive);
            // console.log(typeof isactive);
            res.render('admin_useredit',{
                isLoggedIn: req.session.isLoggedIn, 
                canAdmin: req.body.isAdmin, 
                isEditingDetails: true, 
                username: username, 
                email: email, 
                isactive: isactive
            });
        }
    },
    //entered from a POST request from "update user" button
    async(req, res, next)=>{
        let {btn_updateUser} = req.body;
        if(!btn_updateUser){
            next();
        } else {
            let {username, email} = req.body;
            let {emailNew,passwordNew} = req.body;
            let isactive = parseInt(req.body.isactive);  //because the form sends back isactive as a string...
            let isactiveNew = parseInt(req.body.isactiveNew);
            // console.log('*** POST update user ***');
            // console.log('isactive: '+ isactive);
            // console.log('isactiveNew: '+ isactiveNew);
            //check password requirements and immediately error if fail
            if(passwordNew.length && !checksModel.checkPasswordRequirements(passwordNew)){
                res.render('admin_useredit',{
                    isLoggedIn: req.session.isLoggedIn,
                    canAdmin: req.body.isAdmin,
                    isEditingDetails: true, 
                    username: username, 
                    email: email, 
                    emailNew: emailNew,
                    isactive: isactive,
                    isactiveNew: isactiveNew,
                    error:errorStr.passwordReqFail
                });
                return;
            }

            //prepare query construction,
            //verify information and append to query,
            //send query if all ok
            //note: we are ignoring most checks here.
            //note: this code does not handle error from argon2 as well

            //update the login schema first (2022/03/22: login schema = 'accounts' table
            let myQuery = `UPDATE ${dbModel.getDbLoginSchema()} SET `;
            
            let myStack = [];
            if(emailNew.length){
                myStack.push(`${dbModel.getDbLoginSchemaColEmail()}='${emailNew}'`);
                //console.log("pushed new email into stack");
            }
            if(isactive != isactiveNew){
                myStack.push(`${dbModel.getDbLoginSchemaColIsActive()}='${isactiveNew}'`);
                //console.log("pushed new isactive into stack");
            }
            if(passwordNew.length){
                //hash password and append
                let rethsh = await argon2Model.argon2Hash(passwordNew);
                myStack.push(`${dbModel.getDbLoginSchemaColPassword()}='${rethsh.hash}'`);
            }

            //if no admin input at all, handle as error
            if(!myStack.length){
                res.render('admin_useredit',{
                    isLoggedIn: req.session.isLoggedIn, 
                    canAdmin: req.body.isAdmin, 
                    isEditingDetails: true, 
                    username: username, 
                    email: email, 
                    isactive: isactive,
                    isactiveNew: isactive,
                    error:errorStr.nothingToModify});
                return;
            }

            while(myStack.length){  //might be dangerous...?
                myQuery += myStack.pop();
                if(myStack.length) myQuery += ',';
            }
            myQuery += `WHERE ${dbModel.getDbLoginSchemaColUsername()}='${username}'`;

            //perform query
            let retQ = await dbModel.performQuery(myQuery);
            if(retQ.error){
                res.render('admin_useredit',{
                    isLoggedIn: req.session.isLoggedIn,
                    canAdmin: req.body.isAdmin,
                    isEditingDetails: true, 
                    username: username, 
                    email: email, 
                    emailNew: emailNew,
                    isactive: isactive,
                    isactiveNew: isactiveNew,
                    error:errorStr.internalErrorDB
                });
                return;
            }
            res.render('admin_useredit',{
                isLoggedIn: req.session.isLoggedIn, 
                canAdmin: req.body.isAdmin, 
                isEditingDetails: true, 
                username: username, 
                email: emailNew, 
                isactive: isactiveNew,
                isactiveNew: isactiveNew,
                success: `User details of ${username} successfully changed`
            });
        }
    },
    //entered from a POST request from a "change this usergroup" button
    //it is different from the "change usergroup" button. do not confuse the two.
    //this callback handles the situation where admin enters the
    //change usergroup form from the search form.
    async(req, res, next)=>{
        let {btn_changeThisUsergroup} = req.body;
        if(!btn_changeThisUsergroup){
            next();
        } else {
            let {username, usergroup} = req.body;
            res.render('admin_useredit',{
                isLoggedIn: req.session.isLoggedIn, 
                canAdmin: req.body.isAdmin, 
                isChangingUsergroup: true, 
                username: username, 
                usergroup: usergroup, 
            });
        }
    },
    //entered from a POST request from "change usergroup" button
    async(req, res, next)=>{
        let {btn_changeUsergroup} = req.body;
        if(!btn_changeUsergroup){
            next();
        } else {
            let {username, usergroup} = req.body;
            let {usergroupNew} = req.body;

            let myQuery = `UPDATE ${dbModel.getDbUsergroupsSchema()} SET `;

            //if no admin input at all, handle as error
            if(!usergroupNew.length){
                res.render('admin_useredit',{
                    isLoggedIn: req.session.isLoggedIn, 
                    canAdmin: req.body.isAdmin, 
                    isChangingUsergroup: true, 
                    username: username, 
                    usergroup: usergroup, 
                    error: errorStr.nothingToModify
                });
                return;
            }

            //update the usergroups schema (2022/03/22: usergroups schema = 'usergroups' table)
            myQuery += `${dbModel.getDbUsergroupsSchemaColUsergroup()}='${usergroupNew}'`;
            myQuery += `WHERE ${dbModel.getDbUsergroupsSchemaColUsername()}='${username}'`;
            //console.log("pushed new usergroup into stack");
            
            //perform query
            let retQ = await dbModel.performQuery(myQuery);
            if(retQ.error){
                res.render('admin_useredit',{
                    isLoggedIn: req.session.isLoggedIn,
                    canAdmin: req.body.isAdmin,
                    isChangingUsergroup: true, 
                    username: username, 
                    usergroup: usergroup,
                    usergroupNew: usergroupNew,
                    error:errorStr.internalErrorDB
                });
                return;
            }
            res.render('admin_useredit',{
                isLoggedIn: req.session.isLoggedIn, 
                canAdmin: req.body.isAdmin, 
                isChangingUsergroup: true, 
                username: username, 
                usergroup: usergroupNew,
                success: `Usergroup of ${username} successfully changed from [${usergroup}] to [${usergroupNew}]`
            });
        }
    }
);

module.exports = router;