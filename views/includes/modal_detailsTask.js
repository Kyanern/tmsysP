//-we are using jquery here
var $jq = jQuery.noConflict();
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
  //-we will use jquery to do a notesHR.after(notes)
  //-to insert the notes after the hr element.
  //-note that this is not a .append and therefore
  //-the notes' html are not / should not be child of the hr element
  var notesHR = $jq('#detailsTask_notesFirstHR');
  //-clear away the old notes from previous requests
  //-by right this should be done at the point
  //-when modal is dimissed. but coding it this way is
  //-good enough for prototype.
  $jq(".tmsys-tasknote").remove();
  //-"edit task" button
  var btn_editTask = $jq('#btn_editTask');

  //-AJAX get request for details
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
    //-console.dir(json);
    id.textContent = (json.id);
    name.textContent = (json.name);
    desc.textContent = (json.desc);
    state.textContent = (json.state);
    app.textContent = (json.app);
    plan.textContent = ((json.plan)?json.plan:'<Unattached>');
    creator.textContent = (json.creator);
    owner.textContent = (json.owner);
    dateCreate.textContent = (json.dateCreate);

    if(json.notes){
      var myNotes = [];
      var makeNoteEntry = function (note) {
        //-this html contains classes from Bootstrap 5!
        //-class .tmsys-tasknote is an identifier. it is not associated with any
        //-css, etc. it is used to identify html to be remove() by jquery.
        return (
          "<div class=\"row g-3 align-items-center tmsys-tasknote\">" +
            "<div class=\"col-4 tmsys-tasknote\">By:</div>" +
            "<div class=\"col-8 tmsys-tasknote\">" + note.user + "</div>" +
          "</div>" +
          "<div class=\"row g-3 align-items-center tmsys-tasknote\">" +
            "<div class=\"col-4 tmsys-tasknote\">At Task State:</div>" +
            "<div class=\"col-8 tmsys-tasknote\">" + note.taskState + "</div>" +
          "</div>" +
          "<div class=\"row g-3 align-items-center tmsys-tasknote\">" +
            "<div class=\"col-4 tmsys-tasknote\">Timestamp:</div>" +
            "<div class=\"col-8 tmsys-tasknote\">" + Date(note.datetime).toLocaleString() + "</div>" +
          "</div>" +
          "<div class=\"row g-3 align-items-center tmsys-tasknote\">" +
            "<div class=\"tmsys-tasknote\">"+note.content+"</div>"+
          "</div><hr class=\"tmsys-tasknote\">"
        );
      }
      for(let i = 0; i < json.notes.length; i++){
        myNotes.push(makeNoteEntry(json.notes[i]));
      }
      try{
        notesHR.after(myNotes.join(""));
      } catch(e){
        console.error("an error occurred while trying notesHR.after(myNotes.join)");
        console.dir(e);
      }
    }
    //-change value of edit task btn to reflect the task we are looking at
    btn_editTask.val(json.id);
  })
  .fail(function(xhr,status,errorThrown){
    console.log( "AJAX Error: " + errorThrown );
    console.log( "Status: " + status );
    console.dir( xhr );
  })
});