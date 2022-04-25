const express = require('express');
const router = express.Router();
const dbModel = require('../models/db');
const argon2Model = require('../models/argon2');
const mysql = require('mysql');

// middleware that is specific to this router
router.use((req, res, next) => {
    // console.log('Time: ', Date.now());
    next();
});

router.get('/', 
    async (req,res,next)=>{
    //this callback handles the AJAX request from btn_selectQuery (#btn_AJAXPerformSelectQuery)
        let {btn} = req.query;
        if(!btn){
            next();
        }
        else{
            if(btn === "btn_AJAXPerformSelectQuery"){
                // res.send({aDummyJSONProp: "a dummy json value string"});
                
                // let toSend = {
                //     aDummyJSONProp: "a dummy json value string",
                //     success: "a JSON was received!"
                // };
                // res.send(toSend);

                // res.render('debug', {success: 'btn_AJAXPerformSelectQuery!'}); // WILL FAIL because client expects a JSON object
                // let query = 'SELECT DATE(`dates`) AS \'date\' FROM sandbox.dates;';
                let query = `SELECT ${dbModel.getDbTaskSchemaColState()} FROM ${dbModel.getDbTaskSchema()} WHERE ${dbModel.getDbTaskSchemaColID()} = 'premade_5'`;
                let retq;
                try {
                    retq = await dbModel.performQuery(query);
                    // let rows = retq.result;
                    // for(let i = 0; i < rows.length; i++){
                    //     // console.log(typeof rows[i].date);
                    //     // console.log(rows[i].date);
                    //     // console.log(rows[i].date.toDateString());
                    //     rows[i].date = (rows[i].date.toISOString().split('T'))[0];
                    // }
                } catch (error) {
                    console.dir(error);
                } finally {
                    res.send(retq);
                }
            } else if (btn === "btn_AJAXNoteData"){
                let table = 'nodelogin.task';
                let datacol = '`Task_notes`';
                let data = `[{"user":"admin","taskState":"open","content":"This is a second test note. It's purpose is to lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed dictum magna ut nulla viverra, vitae mollis massa ultrices. Suspendisse pulvinar lacinia massa, sed dictum purus eleifend ac. Maecenas at dolor risus. Proin et lorem dui. Sed vulputate felis vel tortor molestie, ut tempus est pretium. Sed ut odio vel lacus vehicula placerat. Nunc fermentum libero non velit tincidunt molestie. Duis et sapien a elit laoreet iaculis sed in dui. Cras vitae mauris sit amet augue porttitor efficitur. Mauris venenatis sem non velit rhoncus congue.","datetime":"2022-04-18T03:14:59.371Z"},{"user":"admin","taskState":"open","content":"This is a test note. It's purpose is to test out the note functionality of a task","datetime":"2022-04-18T03:07:29.172Z"}]`;
                let idcol = '`Task_id`';
                let id = "'axax_1'";
                let query = 'UPDATE ' + table + ' SET ' + datacol + ' = ' + mysql.escape(data) + ' WHERE ' + idcol + ' = ' + id;
                console.dir(query);
                let retq;
                try {
                    retq = await dbModel.performQuery(query);
                } catch (error) {
                    console.dir(error);
                } finally {
                    res.send(retq);
                }
            }
        }
    },
    (req,res)=>{
        res.render('debug', {success: 'Welcome to Debug page!'});
    }
);

router.post('/', async (req,res)=>{
    res.render('debug', {success: 'POSTed!'});
});

module.exports = router;