const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const dbModel = require('./models/db');
const debugController = require('./controllers/debug');
const loginController = require('./controllers/login');
const menu2Controller = require('./controllers/menu2');
const userController = require('./controllers/user');

// Inititalize the app and add middleware
app.set('view engine', 'pug'); // Setup the pug
app.use(bodyParser.urlencoded({extended: true})); // Setup the body parser to handle form submits
app.use(session({secret: 'super-secret'})); // Session setup

dbModel.establishDbConnection();

app.use('/debug', debugController);
app.use('/login', loginController);
app.use('/menu2', menu2Controller);
app.use('/user', userController);

app.get('/', (req, res) => {
  if(req.session.isLoggedIn){
    res.redirect('/menu2');
    return;
  }
  res.redirect('/login');
  // res.redirect('/debug');
});

app.listen(port, () => {
    console.log(`tmsys listening at http://localhost:${port}`);
  }
);