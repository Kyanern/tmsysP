var $jq = jQuery.noConflict();
var sel_app;
var sel_plan;
var hdl_updatePlanList = function(selPlan){
  //- GET request to server for Plan list
  $jq.ajax({
    url: "create",
    data: {
      requestFrom: "createTaskSelApp",
      value: sel_app.val()
    },
    type: "GET",
    dataType: "json",
    cache: false
  })
  .done(function(json){
    if(json.error){
      var errorstring = "Could not retrieve plan list from server (" + json.error + ")";
      alert(errorstring);
      console.log(errorstring);
      return;
    }
    console.dir(json);
    //- empty out existing selections in plan list
    //- then construct new selections and append to "select" element
    sel_plan.empty();
    sel_plan.append("<option selected=\"selected\" value=\"\">(not applicable)</option>");
    for(var i = 0; i < json.length; i++){
      var htmlStr = "<option value=\"" + json[i].name + "\">" + json[i].name + "</option>";
      sel_plan.append(htmlStr);
    }
  })
  .fail(function(xhr, status, errorThrown){
    console.log( "AJAX Error: " + errorThrown );
    console.log( "Status: " + status );
    console.dir( xhr );
  })
};
$jq(document).ready(function(){
  //-console.log("document loaded");
  sel_app = $jq("#taskAppAcronym");
  sel_plan = $jq("#taskPlan");
  hdl_updatePlanList(sel_plan);
  sel_app.change(sel_plan, hdl_updatePlanList);
});