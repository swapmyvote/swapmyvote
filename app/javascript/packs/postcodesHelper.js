// Help with finding constituencies from postcodes

$(document).ready(() => {
  //display results on page
  const displayData = postcode => {
    var onsId = postcode.result.codes.parliamentary_constituency;
    var name = postcode.result.parliamentary_constituency;

    $("select#user_constituency_ons_id")
      .val(onsId)
      .change(); // this SHOULD change the dropdown
    $(".constituency-autocomplete-input").val(name);
  };

  const postcodeButton = () => {
    var input = $("#txt-postcode").val();
    var url = "https://api.postcodes.io/postcodes/" + input;
    post(url).done(displayData);
  };

  const ajaxError = (desc, _status, _err) => {
    if (desc.status == 404 || desc.status == 400) {
      $("#error-postcode").html(JSON.parse(desc.responseText).error);
    } else {
      $("#error-postcode").html(
        "Postcode Service Error Details: " + desc.responseText
      );
    }
  };

  const ajaxSuccess = () => {
    $("#error-postcode").html("");
  };

  //ajax call
  const post = url => {
    return $.ajax({
      url: url,
      success: ajaxSuccess,
      error: ajaxError
    });
  };

  // button event
  $(document).on("click", "#btn-postcode", postcodeButton);

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
