const jwt = requires('jsonwebtoken');
const jwtConfigs = requires("../config/jwt.config.json");

module.exports = {
  generateJWTToken: (username)=>{
    let iat = new Date();
    let exp = new Date(iat.getTime()+ (jwtConfigs.exp_timeInSeconds));
    let payload = {
      "iss":"tmsys",
      "sub":username,
      "iat":iat,
      "exp":exp
    }
    jwt.sign(payload,jwtConfigs.secret);
  }
}