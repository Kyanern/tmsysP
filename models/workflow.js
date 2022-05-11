const dbModel = require('./db');

let mapValidTaskPromotions = new Object();
mapValidTaskPromotions[dbModel.getDbTaskSchemaColStateEnumOpen()] = [
  dbModel.getDbTaskSchemaColStateEnumToDo()
];
mapValidTaskPromotions[dbModel.getDbTaskSchemaColStateEnumToDo()] = [
  dbModel.getDbTaskSchemaColStateEnumDoing()
];
mapValidTaskPromotions[dbModel.getDbTaskSchemaColStateEnumDoing()] = [
  dbModel.getDbTaskSchemaColStateEnumDone()
];
mapValidTaskPromotions[dbModel.getDbTaskSchemaColStateEnumDone()] = [
  dbModel.getDbTaskSchemaColStateEnumClosed()
];

module.exports = {
  // print: ()=>{
  //   console.dir(mapValidTaskPromotions);
  // }

  checkValidTaskPromotion: (fromState, toState)=>{
    let isToState = (element)=>{
      return element === toState;
    };
    //example: mapValidTaskPromotions['open'] will return ['todo'];
    if(mapValidTaskPromotions[fromState].findIndex(isToState) !== -1){
      return true;
    } else {
      return false;
    }
  },

  getValidTaskPromotions: (fromState)=>{
    return mapValidTaskPromotions[fromState];
  }
}