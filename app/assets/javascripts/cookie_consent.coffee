# The cookie consent cookie is set immediately on click, but does not take effect
# until the next page refresh (possibly helped by turbolinks)
# Hide it until the user refreshes or changes page, when cookies consent should take care of it
$ () ->
  $(document).on "click", ".cc-dismiss", ->
    console.log("Clicked dismiss")
    $(".cc-message").hide()
    $(".cc-dismiss").hide()
