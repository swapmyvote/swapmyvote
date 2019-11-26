import intlTelInput from "intl-tel-input";

import "intl-tel-input/build/css/intlTelInput.css";
import "intl-tel-input/build/js/utils.js";

// Set up all phone number inputs with intl-tel-input. We will add a hidden field
// that allows forms to submit the full number. We use HTML5 validation.
$(document).ready(() => {
  document.querySelectorAll("input[type=tel]").forEach(e => {
    const intlTelPlugin = intlTelInput(e, {
      initialCountry: "gb",
      preferredCountries: ["gb"],
      formatOnDisplay: true,
      autoPlaceholder: "polite",
      hiddenInput: "full",
      utilsScript: "utils.js"
    });

    e.onchange = () => {
      if (intlTelPlugin.isValidNumber()) {
        const numberType = intlTelPlugin.getNumberType();
        if (
          numberType === intlTelInputUtils.numberType.MOBILE ||
          numberType === intlTelInputUtils.numberType.FIXED_LINE_OR_MOBILE
        ) {
          // Looks valid!
          e.setCustomValidity("");
        } else {
          // Valid but not a mobile number
          e.setCustomValidity("This doesn't look like a mobile phone number");
        }
      } else {
        e.setCustomValidity("This doesn't look like a phone number");
      }
    };
  });
});
