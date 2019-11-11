// The cookie consent cookie is set immediately on click, but does not take effect
// until the next page refresh (possibly helped by turbolinks)
// As a workaround, hide it until the user refreshes or changes page,
$ () ->
  $(document).on "click", ".cc-dismiss", ->
    console.log("Clicked dismiss")
    $(".cc-message").hide()
    $(".cc-dismiss").hide()
