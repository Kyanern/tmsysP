var confirmDeleteAppModal = document.getElementById('deleteAppModal');
confirmDeleteAppModal.addEventListener('show.bs.modal', function (event){
  //-button that triggered modal
  var button = event.relatedTarget;
  //-extract info from data-bs-* attribute
  var info = button.getAttribute('data-bs-victim');
  //-update modal content
  var modalTitle = document.getElementById('deleteAppModalLabel');
  var modalBodyP = document.getElementById('deleteAppAcronymText');
  var btn_deleteApp = document.getElementById('btn_deleteApp');
  modalTitle.textContent = 'Delete Application ' + info;
  modalBodyP.textContent = info;
  btn_deleteApp.value = info;
});