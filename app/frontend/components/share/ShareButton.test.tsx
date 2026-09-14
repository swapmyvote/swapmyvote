import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "@/components/share/ShareButton";
import type { Election } from "@/types/api";

const election = {
  hashtags: "#GeneralElection",
  eventChoice: "General Election",
  dateDm: "4th July",
  constituencyOther: "another constituency",
} as Election;

/** navigator.share is absent in jsdom, so both branches are set up by hand. */
function withNativeShare(share: () => Promise<void>) {
  Object.defineProperty(window.navigator, "share", {
    value: share,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  // Restoring the absent-API branch needs the property gone, not undefined
  // (lint/performance/noDelete is not enabled in this project's Biome config,
  // so no suppression comment is needed here).
  delete (window.navigator as { share?: unknown }).share;
  vi.restoreAllMocks();
});

describe("ShareButton", () => {
  it("fires the OS share sheet when navigator.share exists", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    withNativeShare(share);
    render(<ShareButton election={election} />);

    await userEvent.click(
      screen.getByRole("button", { name: /share with friends/i }),
    );

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://swapmyvote.uk" }),
    );
  });

  it("does not render the fallback row when native share exists", () => {
    withNativeShare(vi.fn());
    render(<ShareButton election={election} />);

    expect(
      screen.queryByRole("button", { name: "Share on Reddit" }),
    ).not.toBeInTheDocument();
  });

  it("renders a platform row when navigator.share is unavailable", () => {
    render(<ShareButton election={election} />);

    for (const name of [
      "Share on WhatsApp",
      "Share on Bluesky",
      "Share on Facebook",
      "Share on LinkedIn",
      "Share on Reddit",
      "Share on Telegram",
      "Share on Email",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("never offers X", () => {
    render(<ShareButton election={election} />);

    expect(screen.queryByRole("button", { name: /on X$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /twitter/i })).toBeNull();
  });

  it("stays quiet when the user dismisses the share sheet", async () => {
    const abort = Object.assign(new Error("dismissed"), {
      name: "AbortError",
    });
    withNativeShare(vi.fn().mockRejectedValue(abort));
    render(<ShareButton election={election} />);

    await userEvent.click(
      screen.getByRole("button", { name: /share with friends/i }),
    );

    expect(screen.queryByRole("status")).toBeNull();
  });
});
