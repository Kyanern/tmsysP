const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const dbModel = require('./models/db');
const debugController = require('./controllers/debug');
const loginController = require('./controllers/login');
const tmsysController = require('./controllers/tmsys');
const userController = require('./controllers/user');
const adminController = require('./controllers/admin');
const logoutController = require('./controllers/logout');
const applicationsController = require('./controllers/applications');

// Inititalize the app and add middleware
app.set('view engine', 'pug'); // Setup the pug
app.use(bodyParser.urlencoded({extended: true})); // Setup the body parser to handle form submits
app.use(session({secret: 'super-secret'})); // Session setup

dbModel.establishDbConnection();

app.use('/debug', debugController);
app.use('/login', loginController);
app.use('/tmsys', tmsysController);
app.use('/user', userController);
app.use('/admin', adminController);
app.use('/logout',logoutController);
app.use('/applications', applicationsController);

app.get('/', (req, res) => {
  if(req.session.isLoggedIn){
    res.redirect('/tmsys');
    return;
  }
  res.redirect('/login');
});

app.listen(port, () => {
    console.log(`tmsys listening at http://localhost:${port}`);
  }
);