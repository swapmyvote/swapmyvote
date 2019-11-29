$(document).on("click", "#btnPostcode", function() {
  console.log("button clicked");
  var input = $("#txtPostcode").val();
  var url = "https://api.postcodes.io/postcodes/" + input;

  post(url).done(function(postcode) {
    displayData(postcode);
  });
});

//enter event - search
$("#txtPostcode").keypress(function(e) {
  if (e.which === 13) {
    $("#btnPostcode").click();
  }
});

//display results on page
function displayData(postcode) {
  var html = "";
  var onsId = postcode["result"]["codes"]["parliamentary_constituency"];
  var name = postcode["result"]["parliamentary_constituency"];

  $("select#user_constituency_ons_id")
    .val(onsId)
    .change(); // this SHOULD change the dropdown
  $(".constituency-autocomplete-input").val(name);

  // $('#text').hide();
  // html += `Your constituency name is ${name} and the code is ${onsId}`;
  // $('#text').html(html).fadeIn(300);
}

//ajax call
function post(url) {
  return $.ajax({
    url: url,
    success: function() {
      //woop
    },
    error: function(desc, status, err) {
      if (desc.status == 404 || desc.status == 400) {
        $("#text").html(JSON.parse(desc.responseText).error);
      } else {
        $("#text").html("Postcode Service Error Details: " + desc.responseText);
      }
    }
  });
}
