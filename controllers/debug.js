const express = require('express');
const router = express.Router();
const dbModel = require('../models/db');
const argon2Model = require('../models/argon2');

// middleware that is specific to this router
router.use((req, res, next) => {
    console.log('Time: ', Date.now());
    next();
});

router.get('/', 
    (req,res,next)=>{
    //this callback handles the AJAX request from btn_selectQuery (#btn_AJAXPerformSelectQuery)
        let {btn} = req.query;
        if(!btn){
            next();
        }
        else{
            if(btn === "btn_AJAXPerformSelectQuery"){
                // res.send({aDummyJSONProp: "a dummy json value string"});
                
                let toSend = {
                    aDummyJSONProp: "a dummy json value string",
                    success: "a JSON was received!"
                };
                res.send(toSend);

                // res.render('debug', {success: 'btn_AJAXPerformSelectQuery!'}); // WILL FAIL because client expects a JSON object
            }
        }
    },
    (req,res)=>{
        res.render('debug', {success: 'Welcome to Debug page!'});
    }
);

router.post('/', async (req,res)=>{

});

module.exports = router;