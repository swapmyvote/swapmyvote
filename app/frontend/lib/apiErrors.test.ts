import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { apiErrorFields, apiErrorMessages } from "@/lib/apiErrors";

describe("apiErrorMessages", () => {
  it("returns the API's own messages", () => {
    const error = new ApiError(422, {
      error: {
        code: "validation_failed",
        messages: ["Name is too short"],
        fields: {},
      },
    });

    expect(apiErrorMessages(error)).toEqual(["Name is too short"]);
  });

  it("falls back to a generic message for a non-API failure", () => {
    expect(apiErrorMessages(new Error("network down"))).toEqual([
      "Something went wrong - please try that again.",
    ]);
  });
});

describe("apiErrorFields", () => {
  it("returns the per-field messages", () => {
    const error = new ApiError(422, {
      error: {
        code: "validation_failed",
        messages: [],
        fields: { email: ["has already been taken"] },
      },
    });

    expect(apiErrorFields(error)).toEqual({
      email: ["has already been taken"],
    });
  });

  it("is empty for a non-API failure", () => {
    expect(apiErrorFields(new Error("network down"))).toEqual({});
  });
});
