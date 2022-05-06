module.exports = {
  /**
   * Takes a usergroup string (e.g. from a row in the usergroup table usergroup column)
   * and makes it suitable for use in our regex operations.
   * ***
   * Returns a string.
   * ***
   * If you'd like a regex object instead, pass the return value
   * of this function into a 'new RegExp()' call.
  **/
  regexfy_usergroup: (usergroup) => {
    usergroup = usergroup.replaceAll(',','|');
    usergroup = `(?:^|,)(${usergroup})(?:,|$)`;
    return usergroup;
  },

  /** 
   * Takes in an array of the following structure:
   * ***********************
   * [
   *  object{
   *    App_Acronym: <string value>
   *  },
   *  object{
   *    App_Acronym: <string value>
   *  },
   *  ...
   * ]
   * ************************
   * And returns a single string of App_Acronyms formatted
   * for use in our regex operations.
   * 
   * Note that the property App_Acronym can change name (key)
   * depending on changes to the database.
   * Ideally this property name should be captured from db.config.json
   * (through db.js model) instead of being hardcoded like this.
   * (This project has many instances of such stuff lolz)
  **/
  regexfy_appAcronyms: (arr) => {
    // console.dir(arr);
    let retstr = new String();
    for(let i = 0; i < arr.length; i++){
      retstr += arr[i].App_Acronym;
      if(arr.length - i > 1) {
        retstr += '|';
      }
    }
    // console.log(retstr);
    retstr = `(?:^|,)(${retstr})(?:,|$)`;
    // console.log(retstr);
    return retstr;
  },

  /**
   * Takes in a Date object and returns the date substring of
   * the ISO format datetime string
   */
  getDateFromDateObject: (obj) => {
    return (obj.toISOString().split('T'))[0];
  },

  /***
   * Takes in an Object and returns a copy of it, but with the key:value pairs inverted.
   * https://stackoverflow.com/a/23013726
   */
  getObjectCopyKeyValueInverted: (obj)=>{
    return Object.keys(obj).reduce((ret, key) => {
      ret[obj[key]] = key;
      return ret;
    }, {});
  },

  /***
   * Takes in a string and removes backticks (`) from the string.
   */
  stringRemoveBackticks: (string)=>{
    string = string.replaceAll('`','');
    return string;
  }
}