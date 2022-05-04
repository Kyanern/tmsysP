const express = require('express');
const router = express.Router();
const APITasksController = require('./tasks.js');

router.use('/tasks', APITasksController);

module.exports = router;