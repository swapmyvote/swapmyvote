import { parsePhoneNumberFromString } from "libphonenumber-js/max";

// The two messages app/frontend/entrypoints/intlTelInput.js sets with
// setCustomValidity, kept word for word: the legacy page and this one should
// complain identically until the legacy page retires at M9.
const notAPhoneNumber = "This doesn't look like a phone number";
const notAMobileNumber = "This doesn't look like a mobile phone number";

// intl-tel-input accepted a number whose type was MOBILE or
// FIXED_LINE_OR_MOBILE and rejected everything else. libphonenumber-js is the
// same library underneath — intl-tel-input's utils.js is a Closure-compiled
// build of it — so these are the same two constants, by name.
const mobileTypes = ["MOBILE", "FIXED_LINE_OR_MOBILE"];

/**
 * What is wrong with a phone number, or null when nothing is.
 *
 * `/max` metadata is what makes `getType()` available: the default (`min`)
 * build can tell valid from invalid but not one kind of number from another.
 *
 * `parsePhoneNumberFromString` returns undefined rather than throwing, so an
 * unparseable value needs no try/catch.
 */
export function phoneNumberProblem(value: string): string | null {
  if (value === "") {
    return notAPhoneNumber;
  }

  const parsed = parsePhoneNumberFromString(value);
  if (!parsed?.isValid()) {
    return notAPhoneNumber;
  }

  const type = parsed.getType();
  if (type === undefined || !mobileTypes.includes(type)) {
    return notAMobileNumber;
  }

  return null;
}
