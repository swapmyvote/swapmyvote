import { render, screen, within } from "@testing-library/react";
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

    // Scoped to the row: the legend below the list carries a tick too.
    const row = screen.getByRole("listitem");
    expect(within(row).getByText("✅")).toBeInTheDocument();
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

  // The tick was previously unexplained: a "bad" row (site recommends a
  // different party) and an "unknown" one (site has no view on this seat) are
  // both simply unticked, so nothing on screen said what a tick meant.
  it("explains the tick when at least one site matches", () => {
    render(
      <PartyRecommendations
        constituencyName="Wakefield"
        recommendations={[
          recommendation(),
          recommendation({ siteId: "stt", match: "bad", text: "Green" }),
        ]}
      />,
    );

    expect(
      screen.getByText(/marks a site that recommends the same party/),
    ).toBeInTheDocument();
  });

  it("leaves the legend out when nothing is ticked", () => {
    render(
      <PartyRecommendations
        constituencyName="Wakefield"
        recommendations={[
          recommendation({ match: "bad", text: "Green" }),
          recommendation({ siteId: "stt", match: "unknown", text: null }),
        ]}
      />,
    );

    expect(
      screen.queryByText(/marks a site that recommends the same party/),
    ).not.toBeInTheDocument();
  });

  // SwapProfileCard already draws a card around this; a second bordered panel
  // inside it (and a third around the poll interpretation) was the nesting
  // this block was flattened to remove.
  it("draws no card of its own", () => {
    const { container } = render(
      <PartyRecommendations
        constituencyName="Wakefield"
        recommendations={[recommendation()]}
      />,
    );

    expect(container.querySelector(".card")).toBeNull();
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
