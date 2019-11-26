import intlTelInput from "intl-tel-input";

import "intl-tel-input/build/css/intlTelInput.css";
import "intl-tel-input/build/js/utils.js";

// Set up all phone number inputs with intl-tel-input. We will add a hidden field
// that allows forms to submit the full number. We use HTML5 validation.
$(document).ready(() => {
  const phoneInputs = document.querySelectorAll("input[type=tel]");
  Array.from(phoneInputs).forEach(phoneInput => {
    const intlTelPlugin = intlTelInput(phoneInput, {
      initialCountry: "gb",
      preferredCountries: ["gb"],
      formatOnDisplay: true,
      autoPlaceholder: "polite",
      hiddenInput: "full",
      utilsScript: "utils.js"
    });

    phoneInput.onchange = () => {
      if (intlTelPlugin.isValidNumber()) {
        const numberType = intlTelPlugin.getNumberType();
        if (
          numberType === intlTelInputUtils.numberType.MOBILE ||
          numberType === intlTelInputUtils.numberType.FIXED_LINE_OR_MOBILE
        ) {
          // Looks valid!
          phoneInput.setCustomValidity("");
        } else {
          // Valid but not a mobile number
          phoneInput.setCustomValidity(
            "This doesn't look like a mobile phone number"
          );
        }
      } else {
        phoneInput.setCustomValidity("This doesn't look like a phone number");
      }
    };
  });
});
