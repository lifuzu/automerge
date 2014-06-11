$(document).ready(function() {
  $('input[name="same_server"]').click(function(e) {
    var server_from = $('select[name="server_from"]');
    var server_to = $('select[name="server_to"]');
    
    if ($(this).is(":checked")) {
      server_to.val(server_from.val());
      server_to.attr('disabled', 'disabled');
    } else {
      server_to.val('');
      server_to.removeAttr('disabled');
    }
  });
  $('input[name="same_branch"]').click(function(e) {
    var branch_from = $('input[name="branch_from"]');
    var branch_to = $('input[name="branch_to"]');

    if ($(this).is(":checked")) {
      branch_to.val(branch_from.val());
      branch_to.attr('disabled', 'disabled');
    } else {
      branch_to.val('');
      branch_to.removeAttr('disabled');
    }
  });
  /*$('select[name="server_from"]').change(function() {
    $.ajax({
      url : '/listrepos/',
      type: 'POST',
      data: {
        server: $(this).val()
      }, 
      success: function(data){
        $.each(data, function(k, v) {
          $('select[name="repository"]').append($("<option></option>").attr("value", v).text(v));
        });
      },
      error: function(){
        alert('error!');
      }
    });
  });*/
  $("#loader").bind("ajaxSend", function() {
    $(this).show();
  }).bind("ajaxError", function() {
    $(this).hide();
  }).bind("ajaxStop", function() {
    $(this).hide();
  })
});