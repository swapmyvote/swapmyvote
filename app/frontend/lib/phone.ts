import { parsePhoneNumberFromString } from "libphonenumber-js/max";

// Word for word what intlTelInput.js sets with setCustomValidity, so the
// legacy page and this one complain identically.
const notAPhoneNumber = "This doesn't look like a phone number";
const notAMobileNumber = "This doesn't look like a mobile phone number";

// The two types intl-tel-input accepted. libphonenumber-js is the same
// library underneath, so these are the same constants by name.
const mobileTypes = ["MOBILE", "FIXED_LINE_OR_MOBILE"];

/**
 * What is wrong with a phone number, or null when nothing is.
 *
 * Imported from `/max` because that is the only build carrying the metadata
 * `getType()` needs; the default `min` build can tell valid from invalid but
 * not one kind of number from another.
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
