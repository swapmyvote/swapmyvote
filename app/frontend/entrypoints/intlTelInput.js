import intlTelInput from "intl-tel-input";

import "intl-tel-input/build/css/intlTelInput.css";

// utils.js is a Closure-compiled classic script: it publishes
// window.intlTelInputUtils by assigning to top-level `this`, which is only the
// window object when it is evaluated as a plain <script>. Importing it as an
// ES module would give it `this === undefined`, so hand intl-tel-input the
// asset URL instead and let it inject the <script> tag itself. `?url` makes
// Vite emit the file as-is and give us its hashed path.
import utilsScript from "intl-tel-input/build/js/utils.js?url";

// Set up all phone number inputs with intl-tel-input. We will add a hidden field
// that allows forms to submit the full number. We use HTML5 validation.
//
// jQuery comes from the sprockets bundle in
// app/views/layouts/application.html.haml, so it is a global here.
$(document).ready(() => {
  const phoneInputs = document.querySelectorAll("input[type=tel]");
  Array.from(phoneInputs).forEach((phoneInput) => {
    const intlTelPlugin = intlTelInput(phoneInput, {
      initialCountry: "gb",
      preferredCountries: ["gb"],
      formatOnDisplay: true,
      autoPlaceholder: "polite",
      hiddenInput: "full",
      utilsScript: utilsScript,
    });

    phoneInput.onchange = () => {
      const utils = window.intlTelInputUtils;

      if (utils && intlTelPlugin.isValidNumber()) {
        const numberType = intlTelPlugin.getNumberType();
        if (
          numberType === utils.numberType.MOBILE ||
          numberType === utils.numberType.FIXED_LINE_OR_MOBILE
        ) {
          // Looks valid!
          phoneInput.setCustomValidity("");
        } else {
          // Valid but not a mobile number
          phoneInput.setCustomValidity(
            "This doesn't look like a mobile phone number",
          );
        }
      } else {
        phoneInput.setCustomValidity("This doesn't look like a phone number");
      }
    };
  });
});
