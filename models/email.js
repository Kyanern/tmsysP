const emailConfigs = require('../config/email.config.json');
const nodemailer = require('nodemailer');

const EMAIL_HOST = emailConfigs.host;
const EMAIL_PORT = emailConfigs.port;
const EMAIL_USERNAME = emailConfigs.user;
const EMAIL_PASSWORD = emailConfigs.pass;

var transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  auth: {
    user: EMAIL_USERNAME,
    pass: EMAIL_PASSWORD
  }
});

module.exports = {transporter:transporter};