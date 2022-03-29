const express = require('express');
const router = express.Router();

// middleware that is specific to this router
router.use((req, res, next) => {
    console.log('Time: ', Date.now());
    next();
});

router.all('/', async (req, res) => {
    req.session.isLoggedIn = false;
    req.session.username = null;
    res.redirect('/login');
    return;
});

module.exports = router;