const dbConfigs = require('../config/db.config.json');
const mysql = require('mysql');
require('mysql/lib/protocol/SqlString');
const util = require('util');

/** do not export these */
let getDbConnectionString = () => {
    return `mysql://${dbConfigs.dbUser}:${dbConfigs.dbPass}@${dbConfigs.dbHost}:${dbConfigs.dbPort}/`;
}
/** end of do not export these */

let props = {connection:null, query:null}

module.exports = {
    props: props,

    getDbLoginSchema: () => {
        return `${dbConfigs.dbLoginSchema}`;
    },
    getDbLoginSchemaColUsername: () => {
        return `${dbConfigs.dbLoginSchemaColUsername}`;
    },
    getDbLoginSchemaColPassword: () => {
        return `${dbConfigs.dbLoginSchemaColPassword}`;
    },
    getDbLoginSchemaColEmail: () => {
        return `${dbConfigs.dbLoginSchemaColEmail}`;
    },
    // I don't want to expose what people might not need.
    // getDbLoginSchemaColId: () => {
    //     return `${dbConfigs.dbLoginSchemaColId}`;
    // },
    getDbLoginSchemaColIsActive: () => {
        return `${dbConfigs.dbLoginSchemaColIsActive}`;
    },

    getDbUsergroupsSchema: () => {
        return `${dbConfigs.dbUsergroupsSchema}`;
    },
    getDbUsergroupsSchemaColUsername: () => {
        return `${dbConfigs.dbUsergroupsSchemaColUsername}`;
    },
    getDbUsergroupsSchemaColUsergroup: () => {
        return `${dbConfigs.dbUsergroupsSchemaColUsergroup}`;
    },

    getDbColFormat_CreateNewUser: () => { 
        return `${dbConfigs.dbLoginSchemaColUsername},${dbConfigs.dbLoginSchemaColPassword},${dbConfigs.dbLoginSchemaColEmail}`;
    },
    getDbColFormat_EditUser_Search: () => {
        return `${dbConfigs.dbLoginSchema}.${dbConfigs.dbLoginSchemaColUsername}, ${dbConfigs.dbLoginSchema}.${dbConfigs.dbLoginSchemaColEmail}, ${dbConfigs.dbUsergroupsSchema}.${dbConfigs.dbUsergroupsSchemaColUsergroup}, ${dbConfigs.dbLoginSchema}.${dbConfigs.dbLoginSchemaColIsActive}`;
    },
    getDbColFormat_Login: () => {
        return `${dbConfigs.dbLoginSchemaColUsername},${dbConfigs.dbLoginSchemaColPassword},${dbConfigs.dbLoginSchemaColIsActive}`;
    },

    establishDbConnection: () => {
        props.connection = mysql.createConnection(getDbConnectionString());
        props.connection.connect(function(err){
            if(err){
                console.error('error connecting: '+err.stack);
                return;
            }
            console.log('connected as id ' + props.connection.threadId);
            try{
                props.query = util.promisify(props.connection.query).bind(props.connection);
                console.log('promisify query done');
            } catch(e){
                console.error('error promisifying query: ' + e);
                return ({error: e});
            }
        });
    },

    performQuery: async (queryString) => {
        try{
            let rows = await props.query(queryString);
            return ({result: rows});
        } catch (e){
            console.log('\n***\n'+e+'\n***\n');
            return ({error: e});
        }
    }
}