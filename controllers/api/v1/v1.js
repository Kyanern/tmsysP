const express = require('express');
const router = express.Router();
const APITasksController = require('./tasks.js');

router.use('/tasks', APITasksController);

router.all('/',  (req,res)=>{
  res.status(405).send({message:errorStr.APIShowAPIs, data:v1listModel.APIList});
  return;
});

module.exports = router;