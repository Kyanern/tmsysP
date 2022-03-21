const express = require('express');
const router = express.Router();
const dbModel = require('../models/db');
const argon2Model = require('../models/argon2');

// middleware that is specific to this router
router.use((req, res, next) => {
    console.log('Time: ', Date.now());
    next();
});

router.get('/', (req,res)=>{
    res.render('debug', {success: 'Welcome to Debug page!'});
});

router.post('/', async (req,res)=>{
    let {btn_test_db, btn_wrong_query, btn_argon2, password} = req.body;
    if(btn_test_db){
        var myQuery = `SELECT ${dbModel.getDbColFormat_EditUser_Search()} FROM ${dbModel.getDbLoginSchema()} INNER JOIN ${dbModel.getDbUsergroupsSchema()} ON ${dbModel.getDbLoginSchema()}.${dbModel.getDbLoginSchemaColUsername()} LIKE '%' AND ${dbModel.getDbLoginSchema()}.${dbModel.getDbLoginSchemaColUsername()} = ${dbModel.getDbUsergroupsSchema()}.${dbModel.getDbUsergroupsSchemaColUsername()};`;
        let result = await dbModel.performQuery(myQuery);
        await console.log(result.result);
        res.render('debug', {success: 'Sent a test query to database!'});
        return;
    }

    if(btn_wrong_query){
        var myQuery = `SELECT * FROM accounts;`;
        let result = await dbModel.performQuery(myQuery);
        await console.log(result.error);
        res.render('debug', {error: 'Sent a wrong query to database!'});
        return;
    }

    if(btn_argon2){
        let {hash, error} = await argon2Model.argon2Hash(password);
        await console.log(hash);
        res.render('debug', {error: hash, success: 'Tested argon2 hash!'});
        return;
    }

    res.render('debug');
});

module.exports = router;