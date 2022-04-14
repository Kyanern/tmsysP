var detailsTaskModal = document.getElementById('detailsTaskModal');
detailsTaskModal.addEventListener('show.bs.modal', function(event){
  //-button that triggered modal
  var button = event.relatedTarget;
  //-extract info from data-bs-* attribute
  var info = button.getAttribute('data-bs-task');
  //- modal elements
  var title = document.getElementById('detailsTaskModalLabel');
  title.textContent = (info + ' Details');
  //-individual detail elements
  var id = document.getElementById('detailsTask_id');
  var name = document.getElementById('detailsTask_name');
  var desc = document.getElementById('detailsTask_desc');
  var state = document.getElementById('detailsTask_state');
  var app = document.getElementById('detailsTask_app');
  var plan = document.getElementById('detailsTask_plan');
  var creator = document.getElementById('detailsTask_creator');
  var owner = document.getElementById('detailsTask_owner');
  var dateCreate = document.getElementById('detailsTask_dateCreate');
  //-AJAX get request for details
  var $jq = jQuery.noConflict();
  $jq.ajax({
    url: "/tmsys",
    data: {
      requestFrom: "detailsTaskModal",
      value: info
    },
    type: "GET",
    dataType: "json",
    cache: false
  })
  .done(function(json){
    if(json.error){
      var errorstring = "Could not retrieve task details from server (" + json.error + ")";
      alert(errorstring);
      //-console.log(errorstring);
      id.textContent = ("<TaskID>");
      name.textContent = ("<TaskName>");
      desc.textContent = ("<TaskDescription>");
      state.textContent = ("<TaskState>");
      app.textContent = ("<TaskApp>");
      plan.textContent = ("<TaskPlan>");
      creator.textContent = ("<TaskCreator>");
      owner.textContent = ("<TaskOwner>");
      dateCreate.textContent = ("<TaskDateCreate>");
      return;
    }
    console.dir(json);
    id.textContent = (json.id);
    name.textContent = (json.name);
    desc.textContent = (json.desc);
    state.textContent = (json.state);
    app.textContent = (json.app);
    plan.textContent = ((json.plan)?json.plan:'<Unattached>');
    creator.textContent = (json.creator);
    owner.textContent = (json.owner);
    dateCreate.textContent = (json.dateCreate);
  })
  .fail(function(xhr,status,errorThrown){
    console.log( "AJAX Error: " + errorThrown );
    console.log( "Status: " + status );
    console.dir( xhr );
  })
});