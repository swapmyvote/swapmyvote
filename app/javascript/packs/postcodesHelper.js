// Help with finding constituencies from postcodes

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
  console.log("postcode search button clicked");
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
