import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lookupPostcode, PostcodeLookupError } from "@/lib/postcodes";

function found(onsId: string | null, name: string | null) {
  return new Response(
    JSON.stringify({
      result: {
        parliamentary_constituency_2024: name,
        codes: { parliamentary_constituency_2024: onsId },
      },
    }),
    { status: 200 },
  );
}

async function rejection(
  promise: Promise<unknown>,
): Promise<PostcodeLookupError> {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(PostcodeLookupError);
  return error as PostcodeLookupError;
}

describe("lookupPostcode", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => found("E14001009", "Wakefield"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the 2024-boundary constituency and its ONS code", async () => {
    await expect(lookupPostcode("WF1 1AA")).resolves.toEqual({
      onsId: "E14001009",
      name: "Wakefield",
    });
  });

  it("calls postcodes.io directly, not our own backend", async () => {
    await lookupPostcode("WF1 1AA");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.postcodes.io/postcodes/WF1%201AA",
    );
  });

  it("trims the postcode before looking it up", async () => {
    await lookupPostcode("  WF11AA  ");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.postcodes.io/postcodes/WF11AA",
    );
  });

  it("escapes the postcode rather than pasting it into the URL", async () => {
    await lookupPostcode("WF1/1AA");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.postcodes.io/postcodes/WF1%2F1AA",
    );
  });

  it("rejects an empty postcode without calling the service", async () => {
    const error = await rejection(lookupPostcode("   "));

    expect(error.message).toBe("Please enter a postcode");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  describe("when the service rejects the postcode", () => {
    it("surfaces its own wording for a 404", async () => {
      vi.mocked(global.fetch).mockImplementation(
        async () =>
          new Response(JSON.stringify({ error: "Postcode not found" }), {
            status: 404,
          }),
      );

      const error = await rejection(lookupPostcode("ZZ1 1ZZ"));

      expect(error.message).toBe("Postcode not found");
    });

    it("surfaces its own wording for a 400", async () => {
      vi.mocked(global.fetch).mockImplementation(
        async () =>
          new Response(JSON.stringify({ error: "Invalid postcode" }), {
            status: 400,
          }),
      );

      const error = await rejection(lookupPostcode("nonsense"));

      expect(error.message).toBe("Invalid postcode");
    });
  });

  it("reports any other status as a service error, with the body", async () => {
    vi.mocked(global.fetch).mockImplementation(
      async () => new Response("upstream exploded", { status: 500 }),
    );

    const error = await rejection(lookupPostcode("WF1 1AA"));

    // Distinguishes a postcodes.io outage from the user mistyping.
    expect(error.message).toBe(
      "Postcode Service Error Details: upstream exploded",
    );
  });

  it("falls back to the raw body when an error response is not JSON", async () => {
    vi.mocked(global.fetch).mockImplementation(
      async () => new Response("<html>Bad Request</html>", { status: 400 }),
    );

    const error = await rejection(lookupPostcode("WF1 1AA"));

    expect(error.message).toBe("<html>Bad Request</html>");
  });

  it("treats a postcode with no 2024 constituency as out of scope", async () => {
    vi.mocked(global.fetch).mockImplementation(async () => found(null, null));

    const error = await rejection(lookupPostcode("BT1 1AA"));

    expect(error.message).toBe(
      "Postcode is not in one of the accepted constituencies",
    );
  });
});
