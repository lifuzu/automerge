$(document).ready(function() {
  $("#header").click(function(){
    //alert($("#header").find(".right").find("p:last").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, ""));
    //$("#dialog-confirm").dialog("open"); //find("p").replaceWith("<p>Hello</p>").end().
  });
  $("#commits").find("*").disableSelection();
  $("#commits").find(".left").draggable({
    helper: "clone",
    axis  : "x",
    distance : 20,
    cursor: 'e-resize'
    //snap  : true
  });
  function handlerShowDetail(event) {
    // if the click target is button, then skip
    if (event.target.nodeName.toLowerCase() == 'input') {
      return;
    }
    $.ajax({
      url : '/showdetail/',
      type: 'POST',
      data: {
        repository : $("#repository").find("p").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, ""),
        commit_id  : $(this).find("p:first").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, "")
      },
      success : function(data) {
        $("#dialog-message").find("p").replaceWith('<p>' + data.information + '</p>').end().dialog({title: data.commit}).dialog("open");
      },
      error : function() {
        alert('error!');
      }
    });
  }
  $("#commits").children().click(handlerShowDetail);
  $("#commits").droppable({
    drop: function(event, ui){
      if (ui.draggable.hasClass('left')) {
        // post the information to server
        $.ajax({
          url : '/cherrypick/',
          type: 'POST',
          data: {
            server_from: $("#header").find(".left").find("p:first").text().split(':')[2].replace(/\/\//g, '').replace(/(^\s*)|(\s*$)/g, ""),
            server_to  : $("#header").find(".right").find("p:first").text().split(':')[2].replace(/\/\//g, '').replace(/(^\s*)|(\s*$)/g, ""),
            branch_from: $("#header").find(".left").find("p:last").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, ""),
            branch_to  : $("#header").find(".right").find("p:last").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, ""),
            repository : $("#repository").find("p").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, ""),
            commit_id  : ui.draggable.find("p:first").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, "")
          }, 
          success: function(data){
            // if conflict still exist there
            if (data == 'CONFLICT') {
              $("#dialog-confirm").data('block', ui.draggable).dialog("open");
            } else {
              fillRightBlock(ui.draggable, data);
            }
          },
          error: function(){
            alert('error!');
          }
        });
      }
      // so far, we don't consider merge action from right to left
    }
  });
  $("#revert").live('click', function(event) {
    $("#dialog-revert").data('block', $(this).parent()).dialog("open");
  });
  $("#dialog-revert").dialog({
    autoOpen : false,
    modal    : true,
    buttons  : {
      Yes : function() {
        $(this).dialog("close");
        var block = $(this).data('block');
        
        $.ajax({
          url : '/revert/',
          type: 'POST',
          data: {
            commit_id  : block.find("p:first").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, ""),
            repository : $("#repository").find("p").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, ""),
          },
          success: function(data) {
            if (data == 'CONFLICT') {
              // revert code conflict
              // TODO: handle conflict when revert!
              //$("#dialog-confirm").data('block', block).dialog("open");
            } else {
              // revert action is successful
              clearBlock(block);
              //$("#revert").parent().prev().draggable({disabled: false});
              //$("#revert").parent().replaceWith();
            }
          },
          error: function() {
            // rebase action failed
            alert('error!');
          }
        });
      },
      Cancel : function() {
        $(this).dialog("close");
      }
    }
  });
  $("#dialog-message").dialog({
    autoOpen : false,
    modal    : true,
    width    : 460,
		buttons  : {
			Ok : function() {
				$(this).dialog("close");
			}
		}
  });
  
  function fillRightBlock(block, data) {
    // insert block after draggable
    $('<div><p>Commit: ' + data.commit + '</p><p>Author: ' + data.author + '</p><p>Date:   ' + data.date + '</p><p>' + data.comments + '</p></div>') //<input type="button" id="revert" name="revert" value="Revert!" />
      .addClass('right').disableSelection().click(handlerShowDetail).insertAfter(block);
    // change control status 
    block.draggable({disabled: true});
  }
  
  function clearBlock(clickBlock) {
    clickBlock.prev().draggable({disabled: false});
    clickBlock.replaceWith();
  }
  
  $("#dialog-confirm").dialog({
    autoOpen : false,
    modal    : true,
    buttons  : {
      "Fixed the conflict": function() {
        $(this).dialog("close");

        var block = $(this).data('block');

        $.ajax({
          url : '/commit/',
          type: 'POST',
          data: {
            repository : $("#repository").find("p").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, ""),
            commit_id  : block.find("p:first").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, "")
          },
          success: function(data) {
            // conflict still exists
            if (data == 'CONFLICT') {
              $("#dialog-confirm").data('block', block).dialog("open");
            } else {
              // conflict has been fixed
              fillRightBlock(block, data);
            }
          },
          error: function(data) {
            // conflict hasn't been fixed
            alert('error!');
          }
        });

      },
      Cancel: function() {
        $(this).dialog("close");
        // cancel action after conflict generate when merge
        $.ajax({
          url : '/cancel/',
          type: 'POST',
          data: {
            repository : $("#repository").find("p").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, "")
          },
          success: function(data) {}
        });
      }
    }
  });
  
  $("#push_to_review").click(function() {
    //TODO: show a dialog to confirm
    $.ajax({
      url : '/pushtoreview/',
      type: 'POST',
      data: {
        repository : $("#repository").find("p").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, ""),
        server_to  : $("#header").find(".right").find("p:first").text().split(':')[2].replace(/\/\//g, '').replace(/(^\s*)|(\s*$)/g, ""),
        branch     : $("#header").find(".right").find("p:last").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, "")
      },
      success: function(data) {
        // push to review successfully
        alert(data);
      },
      error: function(data) {
        alert('error!');
      }
    });
  });
  
  $("#cancel_the_action").click(function() {
    //TODO: show a dialog to confirm
    $.ajax({
      url : '/cancelaction/',
      type: 'POST',
      data: {
        repository : $("#repository").find("p").text().split(':')[1].replace(/(^\s*)|(\s*$)/g, "")
      },
      success: function(data) {
        // cancel the action successfully
        alert(data);
      },
      error: function(data) {
        alert('error!');
      }
    });
  });
});