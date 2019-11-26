import intlTelInput from "intl-tel-input";

import "intl-tel-input/build/css/intlTelInput.css";
import "intl-tel-input/build/js/utils.js";

// Set up all phone number inputs with intl-tel-input
$(document).ready(() => {
  document.querySelectorAll("input[type=tel]").forEach(e =>
    intlTelInput(e, {
      initialCountry: "gb",
      preferredCountries: ["gb"],
      formatOnDisplay: true,
      autoPlaceholder: "polite",
      utilsScript: "utils.js"
    })
  );
});
