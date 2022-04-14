var confirmDeletePlanModal = document.getElementById('deletePlanModal');
confirmDeletePlanModal.addEventListener('show.bs.modal', function (event){
  //-button that triggered modal
  var button = event.relatedTarget;
  //-extract info from data-bs-* attribute
  var info = button.getAttribute('data-bs-victim');
  //-update modal content
  var modalTitle = document.getElementById('deletePlanModalLabel');
  var modalBodyP = document.getElementById('deletePlanMVPNameText');
  var btn_deletePlan = document.getElementById('btn_deletePlan');
  modalTitle.textContent = 'Delete Plan ' + info;
  modalBodyP.textContent = info;
  btn_deletePlan.value = info;
});