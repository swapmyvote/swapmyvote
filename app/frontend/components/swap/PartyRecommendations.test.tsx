import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PartyRecommendations } from "@/components/swap/PartyRecommendations";
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

describe("PartyRecommendations", () => {
  it("names the constituency it is recommending for", () => {
    render(
      <PartyRecommendations
        constituencyName="Wakefield"
        recommendations={[recommendation()]}
      />,
    );

    expect(
      screen.getByText(/Tactical voting recommendations for Wakefield/),
    ).toBeInTheDocument();
  });

  it("marks a matching recommendation and links to the site", () => {
    render(
      <PartyRecommendations
        constituencyName="Wakefield"
        recommendations={[recommendation()]}
      />,
    );

    expect(screen.getByText("✅")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tactical Vote" })).toHaveAttribute(
      "href",
      "https://tacticalvote.co.uk/",
    );
    expect(screen.getByText(/recommend Labour/)).toBeInTheDocument();
  });

  // The tick is aria-hidden and "recommend {text}" reads the same whether or
  // not it matches, so a screen reader has no other way to hear that this
  // recommendation matches the swap.
  it("tells assistive tech when a recommendation matches, not just sighted users", () => {
    render(
      <PartyRecommendations
        constituencyName="Wakefield"
        recommendations={[recommendation()]}
      />,
    );

    expect(screen.getByText(/matching this swap/)).toBeInTheDocument();
  });

  it("reports a non-matching recommendation without the tick", () => {
    render(
      <PartyRecommendations
        constituencyName="Wakefield"
        recommendations={[recommendation({ match: "bad", text: "Green" })]}
      />,
    );

    expect(screen.queryByText("✅")).not.toBeInTheDocument();
    expect(screen.getByText(/recommend Green/)).toBeInTheDocument();
    expect(screen.queryByText(/matching this swap/)).not.toBeInTheDocument();
  });

  it("says so when a site made no recommendation", () => {
    render(
      <PartyRecommendations
        constituencyName="Wakefield"
        recommendations={[recommendation({ match: "unknown", text: null })]}
      />,
    );

    expect(screen.getByText(/has no recommendation/)).toBeInTheDocument();
  });

  it("renders nothing when there are no sites at all", () => {
    const { container } = render(
      <PartyRecommendations
        constituencyName="Wakefield"
        recommendations={[]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
