const dbConfigs = require('../config/db.config.json');
const mysql = require('mysql');
require('mysql/lib/protocol/SqlString');
const util = require('util');
const helperModel = require('./helperfuncs');

/** do not export these */
let getDbConnectionString = () => {
    //return `mysql://${dbConfigs.dbUser}:${dbConfigs.dbPass}@${dbConfigs.dbHost}:${dbConfigs.dbPort}/`;
    let connectionString = `mysql://${process.env.DBUSER}:${process.env.DBPASS}@${process.env.DBHOST}:${process.env.DBPORT}/`;
    //console.log("connectionString = "+ connectionString);
    return connectionString;
}

let mapTaskStatesToAppPerms = new Object();
mapTaskStatesToAppPerms[dbConfigs.dbTaskSchemaColStateEnumOpen] = dbConfigs.dbApplicationSchemaColPermitOpen;
mapTaskStatesToAppPerms[dbConfigs.dbTaskSchemaColStateEnumToDo] = dbConfigs.dbApplicationSchemaColPermitToDo;
mapTaskStatesToAppPerms[dbConfigs.dbTaskSchemaColStateEnumDoing] = dbConfigs.dbApplicationSchemaColPermitDoing;
mapTaskStatesToAppPerms[dbConfigs.dbTaskSchemaColStateEnumDone] = dbConfigs.dbApplicationSchemaColPermitDone;
//let mapAppPermsToTaskStates = helperModel.getObjectCopyKeyValueInverted(mapTaskStatesToAppPerms);
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

    getDbApplicationSchema: () => {
        return `${dbConfigs.dbApplicationSchema}`;
    },
    getDbApplicationSchemaColAcronym: () => {
        return `${dbConfigs.dbApplicationSchemaColAcronym}`;
    },
    getDbApplicationSchemaColDescription: () => {
        return `${dbConfigs.dbApplicationSchemaColDescription}`;
    },
    getDbApplicationSchemaColRnumber: () => {
        return `${dbConfigs.dbApplicationSchemaColRnumber}`;
    },
    getDbApplicationSchemaColDateStart: () => {
        return `${dbConfigs.dbApplicationSchemaColDateStart}`;
    },
    getDbApplicationSchemaColDateEnd: () => {
        return `${dbConfigs.dbApplicationSchemaColDateEnd}`;
    },
    getDbApplicationSchemaColPermitOpen: () => {
        return `${dbConfigs.dbApplicationSchemaColPermitOpen}`;
    },
    getDbApplicationSchemaColPermitToDo: () => {
        return `${dbConfigs.dbApplicationSchemaColPermitToDo}`;
    },
    getDbApplicationSchemaColPermitDoing: () => {
        return `${dbConfigs.dbApplicationSchemaColPermitDoing}`;
    },
    getDbApplicationSchemaColPermitDone: () => {
        return `${dbConfigs.dbApplicationSchemaColPermitDone}`;
    },
    getDbApplicationSchemaColPermitCreatePlan: () => {
        return `${dbConfigs.dbApplicationSchemaColPermitCreatePlan}`;
    },
    getDbApplicationSchemaColPermitCreateTask: () => {
        return `${dbConfigs.dbApplicationSchemaColPermitCreateTask}`;
    },
    getDbApplicationSchemaColPermitEditApp: () => {
        return `${dbConfigs.dbApplicationSchemaColPermitEditApp}`;
    },

    getDbPlanSchema: () => {
        return `${dbConfigs.dbPlanSchema}`;
    },
    getDbPlanSchemaColMVPName: () => {
        return `${dbConfigs.dbPlanSchemaColMVPName}`;
    },
    getDbPlanSchemaColDateStart: () => {
        return `${dbConfigs.dbPlanSchemaColDateStart}`;
    },
    getDbPlanSchemaColDateEnd: () => {
        return `${dbConfigs.dbPlanSchemaColDateEnd}`;
    },
    getDbPlanSchemaColAcronym: () => {
        return `${dbConfigs.dbPlanSchemaColAcronym}`;
    },

    getDbTaskSchema: () => {
        return `${dbConfigs.dbTaskSchema}`;
    },
    getDbTaskSchemaColName: () => {
        return `${dbConfigs.dbTaskSchemaColName}`;
    },
    getDbTaskSchemaColDescription: () => {
        return `${dbConfigs.dbTaskSchemaColDescription}`;
    },
    getDbTaskSchemaColNotes: () => {
        return `${dbConfigs.dbTaskSchemaColNotes}`;
    },
    getDbTaskSchemaColID: () => {
        return `${dbConfigs.dbTaskSchemaColID}`;
    },
    getDbTaskSchemaColPlan: () => {
        return `${dbConfigs.dbTaskSchemaColPlan}`;
    },
    getDbTaskSchemaColAcronym: () => {
        return `${dbConfigs.dbTaskSchemaColAcronym}`;
    },
    getDbTaskSchemaColState: () => {
        return `${dbConfigs.dbTaskSchemaColState}`;
    },
    getDbTaskSchemaColCreator: () => {
        return `${dbConfigs.dbTaskSchemaColCreator}`;
    },
    getDbTaskSchemaColOwner: () => {
        return `${dbConfigs.dbTaskSchemaColOwner}`;
    },
    getDbTaskSchemaColDateCreate: () => {
        return `${dbConfigs.dbTaskSchemaColDateCreate}`;
    },
    getDbTaskSchemaColStateEnumOpen: () => {
        return `${dbConfigs.dbTaskSchemaColStateEnumOpen}`;
    },
    getDbTaskSchemaColStateEnumToDo: () => {
        return `${dbConfigs.dbTaskSchemaColStateEnumToDo}`;
    },
    getDbTaskSchemaColStateEnumDoing: () => {
        return `${dbConfigs.dbTaskSchemaColStateEnumDoing}`;
    },
    getDbTaskSchemaColStateEnumDone: () => {
        return `${dbConfigs.dbTaskSchemaColStateEnumDone}`;
    },
    getDbTaskSchemaColStateEnumClosed: () => {
        return `${dbConfigs.dbTaskSchemaColStateEnumClosed}`;
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
    getDbColFormat_CreateApplication: () => {
        return `${dbConfigs.dbApplicationSchemaColAcronym}, ${dbConfigs.dbApplicationSchemaColRnumber}, ${dbConfigs.dbApplicationSchemaColDescription}, ${dbConfigs.dbApplicationSchemaColDateStart}, ${dbConfigs.dbApplicationSchemaColDateEnd}, ${dbConfigs.dbApplicationSchemaColPermitOpen}, ${dbConfigs.dbApplicationSchemaColPermitToDo}, ${dbConfigs.dbApplicationSchemaColPermitDoing}, ${dbConfigs.dbApplicationSchemaColPermitDone}, ${dbConfigs.dbApplicationSchemaColPermitCreatePlan}, ${dbConfigs.dbApplicationSchemaColPermitCreateTask}, ${dbConfigs.dbApplicationSchemaColPermitEditApp}`;
    },
    getDbColFormat_ListApplications: () => {
        return `${dbConfigs.dbApplicationSchemaColAcronym}, ${dbConfigs.dbApplicationSchemaColDescription}, ${dbConfigs.dbApplicationSchemaColDateStart}, ${dbConfigs.dbApplicationSchemaColDateEnd}, ${dbConfigs.dbApplicationSchemaColPermitOpen}, ${dbConfigs.dbApplicationSchemaColPermitToDo}, ${dbConfigs.dbApplicationSchemaColPermitDoing}, ${dbConfigs.dbApplicationSchemaColPermitDone}, ${dbConfigs.dbApplicationSchemaColPermitCreatePlan}, ${dbConfigs.dbApplicationSchemaColPermitCreateTask}, ${dbConfigs.dbApplicationSchemaColPermitEditApp}`;
    },
    getDbColFormat_ListPlans: () => {
        return `${dbConfigs.dbPlanSchemaColMVPName}, ${dbConfigs.dbPlanSchemaColDateStart}, ${dbConfigs.dbPlanSchemaColDateEnd}, ${dbConfigs.dbPlanSchemaColAcronym}`;
    },
    getDbColFormat_CreateTask: () => {
        //WARNING: Task_plan not included.
        return `${dbConfigs.dbTaskSchemaColName}, ${dbConfigs.dbTaskSchemaColDescription}, ${dbConfigs.dbTaskSchemaColID}, ${dbConfigs.dbTaskSchemaColAcronym}, ${dbConfigs.dbTaskSchemaColCreator}, ${dbConfigs.dbTaskSchemaColOwner}`;
    },
    getDbColFormat_ListTasks: () => {
        //this format retrieves just enough information to display in the task cards,
        //and for permissions processing.
        return `${dbConfigs.dbTaskSchemaColName}, ${dbConfigs.dbTaskSchemaColDescription}, ${dbConfigs.dbTaskSchemaColID}, ${dbConfigs.dbTaskSchemaColCreator}, ${dbConfigs.dbTaskSchemaColOwner}, ${dbConfigs.dbTaskSchemaColDateCreate}, ${dbConfigs.dbTaskSchemaColAcronym}`;
    },
    getDbColFormat_TaskDetails: () => {
        //this format retrieves all information of a Task.
        return `${dbConfigs.dbTaskSchemaColName}, ${dbConfigs.dbTaskSchemaColDescription}, ${dbConfigs.dbTaskSchemaColID}, ${dbConfigs.dbTaskSchemaColPlan},  ${dbConfigs.dbTaskSchemaColAcronym}, ${dbConfigs.dbTaskSchemaColState}, ${dbConfigs.dbTaskSchemaColCreator}, ${dbConfigs.dbTaskSchemaColOwner}, ${dbConfigs.dbTaskSchemaColDateCreate}, ${dbConfigs.dbTaskSchemaColNotes}`
    },
    // getDbColFormat_TaskActionCheck: () => {
    //     //this format retrieves a task's state and 
    // },

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
                // console.log('generating [task state, app permits] mapping...');
                // console.log('-*******-');
                // console.dir(mapTaskStatesToAppPerms);
                // console.log('-*******-');
                // console.dir(mapAppPermsToTaskStates);
                // console.log('-*******-');
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
    },

    giveEscaped: (string) => {
        return mysql.escape(string);
    },

    mapTaskStatesToAppPerms: (taskState)=>{
        return mapTaskStatesToAppPerms[taskState];
    },

    // mapAppPermsToTaskState:  (appPerm)=>{
    //     return mapAppPermsToTaskStates[appPerm];
    // }
}