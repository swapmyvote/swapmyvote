$ () ->
  for modal in $(".smv-modal")
    backdrop = $("<div class='modal-backdrop'></div>")
    $(modal).prepend(backdrop)
    $(modal).find(".modal-close").on "click", (e) ->
      $(".smv-modal").hide()
      e.preventDefault()
    backdrop.on "click", () ->
      $(".smv-modal").hide()

  $(document).keyup (e) ->
    if e.keyCode == 27 # Escape
      $(".smv-modal").hide()

window.showModal = (element) ->
  element.show()