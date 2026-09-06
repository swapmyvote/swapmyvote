import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecommendationsKey } from "@/components/swap/RecommendationsKey";
import type { SwapRecommendation } from "@/types/api";

function recommendation(
  overrides: Partial<SwapRecommendation> = {},
): SwapRecommendation {
  return {
    siteId: "tacticalvote-co-uk",
    siteName: "Tactical Vote",
    siteLink: "https://tacticalvote.co.uk/",
    siteMetaDesc: "Want to get the Tories out?",
    match: "good",
    text: "Labour",
    ...overrides,
  };
}

describe("RecommendationsKey", () => {
  it("explains the tick when something is ticked", () => {
    render(<RecommendationsKey recommendations={[recommendation()]} />);

    expect(
      screen.getByText(/marks a site that recommends the same party/),
    ).toBeInTheDocument();
  });

  // "bad" recommends a different party and "unknown" has no view on the seat;
  // neither is ticked, so with only those there is no symbol to explain.
  it("stays away when nothing is ticked", () => {
    const { container } = render(
      <RecommendationsKey
        recommendations={[
          recommendation({ match: "bad", text: "Green" }),
          recommendation({ siteId: "stt", match: "unknown", text: null }),
        ]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there are no recommendations at all", () => {
    const { container } = render(<RecommendationsKey recommendations={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  // The list page passes every candidate's recommendations at once, so one
  // ticked row anywhere in the list is enough to earn the key.
  it("appears once for a whole list when any of it is ticked", () => {
    render(
      <RecommendationsKey
        recommendations={[
          recommendation({ match: "bad", text: "Green" }),
          recommendation({ siteId: "stt", match: "unknown", text: null }),
          recommendation({ siteId: "getvoting" }),
        ]}
      />,
    );

    expect(
      screen.getAllByText(/marks a site that recommends the same party/),
    ).toHaveLength(1);
  });
});
