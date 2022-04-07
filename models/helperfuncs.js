module.exports = {
  //takes a usergroup string (e.g. from the usergroup table)
  //and makes it suitable for use in our regex operations
  //returns a string.
  //if you'd like a regex object instead, pass the return value
  //of this function into a 'new RegExp()' call
  regexfy_usergroup: (usergroup) => {
    usergroup = usergroup.replaceAll(',','|');
    usergroup = `(?:^|,)(${usergroup})(?:,|$)`;
    return usergroup;
  }
}