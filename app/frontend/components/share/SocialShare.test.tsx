import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SocialShare } from "@/components/share/SocialShare";

const useElection = vi.hoisted(() => vi.fn());
vi.mock("@/lib/referenceData", () => ({ useElection }));

describe("SocialShare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useElection.mockReturnValue({
      data: {
        hashtags: "#GeneralElection",
        eventChoice: "General Election",
        dateDm: "4th July",
        constituencyOther: "another constituency",
      },
    });
  });

  it("opens the Facebook sharer with the site URL and tagline", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<SocialShare />);

    await userEvent.click(
      screen.getByRole("button", { name: "Share on Facebook" }),
    );

    const [url] = vi.mocked(open).mock.calls[0];
    expect(url).toContain("facebook.com/sharer/sharer.php");
    expect(url).toContain(encodeURIComponent("https://swapmyvote.uk"));
    expect(url).toContain(encodeURIComponent("#SwapMyVote"));
  });

  it("opens the Twitter sharer with the tagline", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<SocialShare />);

    await userEvent.click(
      screen.getByRole("button", { name: "Share on Twitter" }),
    );

    const [url] = vi.mocked(open).mock.calls[0];
    expect(url).toContain("twitter.com/share");
    expect(url).toContain("related=SwapMyVote");
    expect(url).toContain(encodeURIComponent("@SwapMyVote"));
  });

  it("offers an email with the election details filled in", () => {
    render(<SocialShare />);

    const link = screen.getByRole("link", { name: "Share on Email" });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain("mailto:?subject=SwapMyVote");
    expect(href).toContain(encodeURIComponent("General Election"));
    expect(href).toContain(encodeURIComponent("4th July"));
    expect(href).toContain(encodeURIComponent("another constituency"));
  });

  it("renders nothing until the election has loaded", () => {
    useElection.mockReturnValue({ data: undefined });

    const { container } = render(<SocialShare />);

    expect(container).toBeEmptyDOMElement();
  });
});
