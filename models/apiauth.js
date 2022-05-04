const express = require('express');
const dbModel = require('./db');
const errorStr = require('../config/errorstring.config.json');
const argon2Model = require('./argon2');

/***
 * Authorization middleware functions
 */

 module.exports = {
    /***
     * Middleware function to prepare req for authorization middleware chain
     */
    authPreprocess: async(req,res,next)=>{
        console.log("hit: authPreprocess.");
        if(!req.data){
            req.data = new Object();
        }
        req.data.authSuccess = false;
        next();
    },

    /***
     * Middleware function to handle authorization via Basic Auth
     */
    authBasic: async(req,res,next)=>{
        console.log("hit: authBasic.");
        /***
         * (1) FUTURE: 
         * if there are other authorization methods we allow in the future,
         * then instead of sending 401, we pass execution to the
         * next authorization function.
         * Subsequent authorization functions should implement a check
         * against req.data.authSuccess to see if they should proceed
         * with their own auth check.
         * (N.B. if authBasic is no longer the first auth check, it must
         * implement req.data.authSuccess check as well)
         */
        
        // check for basic auth header
        if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
        return res.status(401).send({ message: 'Missing Authorization Header', data:null });
        //next(); //see (1)
        }

        // verify auth credentials
        const base64Credentials =  req.headers.authorization.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');
        if(!username || !password){
            res.status(401).send({message:errorStr.userPassWrong, data:null});
            return;
        }
        var myQuery = `SELECT ${dbModel.getDbColFormat_Login()} FROM ${dbModel.getDbLoginSchema()} WHERE ${dbModel.getDbLoginSchemaColUsername()} = '${username}'`;
        let {result, error} = await dbModel.performQuery(myQuery);
        // console.log('\n***\n' + typeof result[0].isactive + '\n***\n');
        if(error){
            //console.log('[ERROR] LOGIN:\n' + result.error);
            res.status(500).send({message:errorStr.internalErrorDB, data:null});
            return;
        }
        if(result.length > 1){
            //console.log('[ERROR] LOGIN: Login attempt returned more than one row. Check database integrity.');
            res.status(500).send({message:errorStr.internalErrorDB, data:null});
            return;
        }
        if(result.length < 1){
            res.status(401).send({message:errorStr.userPassWrong, data:null});
            return;
        }
        if(!result[0].isactive){
            res.status(401).send({message:errorStr.userPassWrong, data:null});
            return;
        }
        let retver = new Object();
        retver = await argon2Model.argon2Verify(result[0].password,password);
        if(retver.error){
            res.status(500).send({message:errorStr.internalErrorArgon2, data:null});
            return;
        }
        if(!retver.verified){
            res.status(401).send({message:errorStr.userPassWrong, data:null});
            return;
        }

        req.data.authSuccess = true;
        req.data.username = username;
        next();
    }
 }



