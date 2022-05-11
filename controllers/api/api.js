const express = require('express');
const router = express.Router();
const v1 = require('./v1/v1.js');
const v1listModel = require('../../models/apiv1list');
const errorStr = require('../../config/errorstring.config.json');

router.use('/v1', v1);

router.all('/',  (req,res)=>{
  res.status(405).send({message:errorStr.APIShowAPIs, data:v1listModel.APIList});
  return;
});

module.exports = router;