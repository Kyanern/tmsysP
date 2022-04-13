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
  }
}