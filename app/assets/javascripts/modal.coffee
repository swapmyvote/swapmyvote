$ () ->
  console.log "ready"
  for modal in $(".modal")
    console.log "Modal"
    backdrop = $("<div class='modal-backdrop'></div>")
    $(modal).prepend(backdrop)
    $(modal).find(".modal-close").on "click", (e) ->
      console.log "Click!"
      $(".modal").hide()
      e.preventDefault()
    backdrop.on "click", () ->
      $(".modal").hide()

  $(document).keyup (e) ->
    if e.keyCode == 27 # Escape
      $(".modal").hide()
      
window.showModal = (element) ->
  element.show()