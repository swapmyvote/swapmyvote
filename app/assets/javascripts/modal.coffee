$(document).on "page:change", () -> # Turbolinks event rather than .ready()
  for modal in $(".modal")
    backdrop = $("<div class='modal-backdrop'></div>")
    $(modal).prepend(backdrop)
    $(modal).find(".modal-close").on "click", (e) ->
      $(".modal").hide()
      e.preventDefault()
    backdrop.on "click", () ->
      $(".modal").hide()
      
window.showModal = (element) ->
  element.show()
  
$(document).keyup (e) ->
  if e.keyCode == 27 # Escape
    $(".modal").hide()