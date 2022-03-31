const dbModel = require('../models/db');

module.exports = {
    checkPasswordRequirements: (password) => {
        //test 1: alphabet
        //test 2: number
        //test 3: special char
        //test 4 and 5: length
        return /[A-Za-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) && password.length > 7 && password.length < 11;
    },

    checkGroup: async (username, usergroup) => {
        var myQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsername()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${username}' AND REGEXP_LIKE(${dbModel.getDbUsergroupsSchemaColUsergroup()}, '(?:^|,)(${usergroup})(?:,|$)');`
        let retQ = await dbModel.performQuery(myQuery);
        let error = retQ.error;
        if(error){
            console.log(error);
        }
        return retQ.result.length ? true : false;
        // var myQuery = `SELECT ${dbModel.getDbUsergroupsSchemaColUsergroup()} FROM ${dbModel.getDbUsergroupsSchema()} WHERE ${dbModel.getDbUsergroupsSchemaColUsername()} = '${username}'`;
        // var grp = new Object();
        // try{
        //     let {result, error} = await dbModel.performQuery(myQuery);
        //     grp = result[0].usergroup;

        // } catch(e){
        //     console.log(e);
        // } finally {
        //     return (usergroup === grp);
        // }
    }
}