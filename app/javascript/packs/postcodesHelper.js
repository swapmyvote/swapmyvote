// Help with finding constituencies from postcodes

$(document).ready(() => {
  const clearPostcodeError = () => {
    $("#error-postcode").html("");
  };

  const handlePostcodeServiceError = (desc, _status, _err) => {
    if (desc.status == 404 || desc.status == 400) {
      $("#error-postcode").html(JSON.parse(desc.responseText).error);
    } else {
      $("#error-postcode").html(
        "Postcode Service Error Details: " + desc.responseText
      );
    }
  };

  const handlePostcodeSubmit = () => {
    const input = $("#txt-postcode").val();
    const url = "https://api.postcodes.io/postcodes/" + input;
    if (input == "") {
      $("#error-postcode").html("Please enter a postcode!");
    } else {
      $.ajax({
        url: url,
        success: handlePostcodeLookup,
        error: handlePostcodeServiceError
      }); //.done(handlePostcodeLookup);
    }
  };

  const handlePostcodeLookup = postcode => {
    const onsId = postcode.result.codes.parliamentary_constituency_2024;
    const name = postcode.result.parliamentary_constituency_2024;

    const hasOption = $('select#user_constituency_ons_id option[value="' + onsId + '"]');
    if (hasOption.length == 0) {
      $("#error-postcode").html('Postcode is not in one of the accepted constituencies');
      // this only changes the hidden dropdown, not the auto-complete
      // one
      $("select#user_constituency_ons_id")
        .val('')
        .change();
      $(".constituency-autocomplete-input").val('');
    } else {
      // this only changes the hidden dropdown, not the auto-complete
      // one
      clearPostcodeError();
      $("select#user_constituency_ons_id")
        .val(onsId)
        .change(); // this SHOULD change the dropdown
      $(".constituency-autocomplete-input").val(name);
    }
  };

  // button event
  $(document).on("click", "#btn-postcode", handlePostcodeSubmit);

  // Make Enter key in postcode field simulate clicking the "Search"
  // button rather than submitting the form, since the user may not have
  // finished with other fields in the form.

  // Disable the default behaviour for Enter key
  const postcodeDisableEnter = e => {
    if (e.which == 13) {
      e.preventDefault();
      return false;
    }
  };
  $("#txt-postcode").keydown(postcodeDisableEnter);

  const postcodeEnter = e => {
    if (e.which === 13) {
      $("#btn-postcode").click();
      e.preventDefault();
      return false;
    }
  };
  $("#txt-postcode").keyup(postcodeEnter);
});
