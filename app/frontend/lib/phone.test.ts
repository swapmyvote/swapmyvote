import { describe, expect, it } from "vitest";
import { phoneNumberProblem } from "@/lib/phone";

// The two messages intlTelInput.js set as HTML5 custom validity, reproduced
// exactly so the React screen complains in the same words as the live site.
const notAPhoneNumber = "This doesn't look like a phone number";
const notAMobileNumber = "This doesn't look like a mobile phone number";

describe("phoneNumberProblem", () => {
  it("accepts a UK mobile number", () => {
    expect(phoneNumberProblem("+447400123456")).toBeNull();
  });

  // The legacy check accepts FIXED_LINE_OR_MOBILE as well as MOBILE, which is
  // what most North American numbers report.
  it("accepts a number whose type is fixed-line-or-mobile", () => {
    expect(phoneNumberProblem("+12025550123")).toBeNull();
  });

  it("rejects a valid UK landline as not a mobile", () => {
    expect(phoneNumberProblem("+442079460000")).toBe(notAMobileNumber);
  });

  it("rejects a number that does not parse", () => {
    expect(phoneNumberProblem("nonsense")).toBe(notAPhoneNumber);
  });

  it("rejects a country code on its own", () => {
    expect(phoneNumberProblem("+44")).toBe(notAPhoneNumber);
  });

  // Parses, but is not a number libphonenumber considers assignable.
  it("rejects a number outside any real range", () => {
    expect(phoneNumberProblem("+447700900123")).toBe(notAPhoneNumber);
  });

  it("rejects an empty value", () => {
    expect(phoneNumberProblem("")).toBe(notAPhoneNumber);
  });
});
