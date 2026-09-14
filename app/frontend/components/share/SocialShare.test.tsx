import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SocialShare } from "@/components/share/SocialShare";

const useElection = vi.hoisted(() => vi.fn());
vi.mock("@/lib/referenceData", () => ({ useElection }));
vi.mock("@/components/share/ShareButton", () => ({
  ShareButton: () => <div data-testid="share-button" />,
}));

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

  it("offers WhatsApp with the election's share text", () => {
    render(<SocialShare />);

    // react-bootstrap's <Button href=...> renders an <a> with role="button"
    // (see @restart/ui's useButtonProps), not role="link" — matching
    // tacticalvote's own ShareBox.test.tsx, which queries the same pattern
    // the same way.
    const href =
      screen.getByRole("button", { name: /WhatsApp/ }).getAttribute("href") ??
      "";
    expect(href).toContain("api.whatsapp.com/send");
    expect(href).toContain(encodeURIComponent("#GeneralElection"));
  });

  it("offers Bluesky with the election's share text", () => {
    render(<SocialShare />);

    const href =
      screen.getByRole("button", { name: /Bluesky/ }).getAttribute("href") ??
      "";
    expect(href).toContain("bsky.app/intent/compose");
    expect(href).toContain(encodeURIComponent("#GeneralElection"));
  });

  it("delegates the generic share to ShareButton", () => {
    render(<SocialShare />);

    expect(screen.getByTestId("share-button")).toBeInTheDocument();
  });

  it("no longer offers Facebook or X directly", () => {
    render(<SocialShare />);

    expect(screen.queryByRole("button", { name: /Facebook/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Twitter/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Twitter/ })).toBeNull();
  });

  it("renders nothing until the election has loaded", () => {
    useElection.mockReturnValue({ data: undefined });

    const { container } = render(<SocialShare />);

    expect(container).toBeEmptyDOMElement();
  });
});
