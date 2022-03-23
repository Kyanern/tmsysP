const argon2 = require('argon2');

module.exports = {
    argon2Verify: async (hash, password)=>{
        try{
            let result = await argon2.verify(hash, password);
            return ({verified: result});
        } catch (err) {
            console.log("argon2Verify - error caught:\n" + err);
            return({error: err});
        }
    },

    argon2Hash: async (password) => {
        try{
            let result = await argon2.hash(password);
            return ({hash: result});
        } catch(err) {
            console.log("argon2Hash - error caught:\n" + err);
            return ({error: err});
        }
    }
}