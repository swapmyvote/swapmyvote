import { describe, expect, it } from "vitest";
import {
  buildBlueskyHref,
  buildWhatsAppHref,
  emailBody,
  shareText,
  siteUrl,
} from "@/lib/share";
import type { Election } from "@/types/api";

const election = {
  hashtags: "#GeneralElection",
  eventChoice: "General Election",
  dateDm: "4th July",
  constituencyOther: "another constituency",
} as Election;

describe("shareText", () => {
  it("names the election's hashtags and the campaign tag", () => {
    expect(shareText(election)).toContain("#GeneralElection");
    expect(shareText(election)).toContain("#SwapMyVote");
  });
});

describe("buildBlueskyHref", () => {
  it("composes an intent carrying the share text and the live site", () => {
    const href = buildBlueskyHref(election);

    expect(href).toContain("https://bsky.app/intent/compose?text=");
    expect(href).toContain(encodeURIComponent("#GeneralElection"));
    expect(href).toContain(encodeURIComponent(siteUrl));
  });
});

describe("buildWhatsAppHref", () => {
  it("composes a send link carrying the share text and the live site", () => {
    const href = buildWhatsAppHref(election);

    expect(href).toContain("https://api.whatsapp.com/send?text=");
    expect(href).toContain(encodeURIComponent("#GeneralElection"));
    expect(href).toContain(encodeURIComponent(siteUrl));
  });
});

describe("emailBody", () => {
  it("names the election, the date and the other constituency", () => {
    const body = emailBody(election);

    expect(body).toContain("General Election");
    expect(body).toContain("4th July");
    expect(body).toContain("another constituency");
    expect(body).toContain(siteUrl);
  });
});

describe("siteUrl", () => {
  it("is the live site, not the current origin", () => {
    expect(siteUrl).toBe("https://swapmyvote.uk");
  });
});
