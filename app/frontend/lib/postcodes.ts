// Postcode -> constituency lookup against postcodes.io, the free public API
// the legacy jQuery helper (app/javascript/packs/postcodesHelper.js) already
// used. Deliberately NOT routed through our own backend, and deliberately not
// shared with tacticalvote's /api/lookup: see "Code sharing with tacticalvote"
// in docs/frontend-modernization-plan.md.

const postcodesEndpoint = "https://api.postcodes.io/postcodes";

/** The 2024 boundaries are the ones the whole domain keys on. */
interface PostcodesIoResult {
  parliamentary_constituency_2024: string | null;
  codes: {
    parliamentary_constituency_2024: string | null;
  };
}

interface PostcodesIoResponse {
  result: PostcodesIoResult;
}

interface PostcodesIoError {
  error?: string;
}

export interface PostcodeConstituency {
  onsId: string;
  name: string;
}

/**
 * A lookup that failed in a way the user needs to see. `message` is already
 * user-facing — for 400/404 it is postcodes.io's own wording ("Invalid
 * postcode", "Postcode not found"), which is what the legacy helper showed.
 */
export class PostcodeLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostcodeLookupError";
  }
}

/**
 * Look a postcode up. Mirrors the legacy helper's error handling exactly:
 * 400 and 404 surface the service's own `error` string, anything else is
 * reported as a service error with the raw body, so a postcodes.io outage is
 * distinguishable from a typo.
 */
export async function lookupPostcode(
  postcode: string,
): Promise<PostcodeConstituency> {
  const trimmed = postcode.trim();
  if (trimmed === "") {
    throw new PostcodeLookupError("Please enter a postcode");
  }

  const response = await fetch(
    `${postcodesEndpoint}/${encodeURIComponent(trimmed)}`,
  );

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 400 || response.status === 404) {
      let message = body;
      try {
        message = (JSON.parse(body) as PostcodesIoError).error ?? body;
      } catch {
        // Not JSON — fall back to the raw body, as the legacy helper did.
      }
      throw new PostcodeLookupError(message);
    }
    throw new PostcodeLookupError(`Postcode Service Error Details: ${body}`);
  }

  const { result } = (await response.json()) as PostcodesIoResponse;
  const onsId = result?.codes?.parliamentary_constituency_2024;
  const name = result?.parliamentary_constituency_2024;

  if (!onsId || !name) {
    throw new PostcodeLookupError(
      "Postcode is not in one of the accepted constituencies",
    );
  }

  return { onsId, name };
}
