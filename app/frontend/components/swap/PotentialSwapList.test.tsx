import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PotentialSwapList } from "@/components/swap/PotentialSwapList";
import type { SwapCandidate } from "@/types/api";

const useElection = vi.hoisted(() => vi.fn());
vi.mock("@/lib/referenceData", () => ({ useElection }));
vi.mock("@/components/polls/PollChart", () => ({
  PollChart: () => <div data-testid="poll-chart" />,
}));

const matchingRecommendation = {
  siteId: "tacticalvote-co-uk",
  siteName: "Tactical Vote",
  siteLink: "https://tacticalvote.co.uk/",
  siteMetaDesc: "Want to get the Tories out?",
  match: "good" as const,
  text: "Green",
};

function candidate(userId: number, name: string): SwapCandidate {
  return {
    userId,
    name,
    imageUrl: "https://example.com/avatar.png",
    constituencyName: "Wakefield",
    constituencyOnsId: "E14001009",
    badges: { mobileVerified: false, provider: null, hasEmail: true },
    preferredParty: { id: 2, name: "Labour", color: "#DC241f", smvCode: "lab" },
    willingParty: { id: 1, name: "Green", color: "#6AB023", smvCode: "grn" },
    polls: [],
    recommendations: [matchingRecommendation],
  };
}

function renderList(expiryMinutes = 120) {
  return render(
    <MemoryRouter>
      <PotentialSwapList
        candidates={[candidate(3, "Grace H"), candidate(4, "Alan T")]}
        expiryMinutes={expiryMinutes}
      />
    </MemoryRouter>,
  );
}

describe("PotentialSwapList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useElection.mockReturnValue({ data: { hidePolls: false } });
  });

  it("asks the question and offers every candidate", () => {
    renderList();

    expect(
      screen.getByText("Who would you like to swap your vote with?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Grace H")).toBeInTheDocument();
    expect(screen.getByText("Alan T")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Offer to swap" })).toHaveLength(
      2,
    );
  });

  it("links each card at that candidate's offer screen", () => {
    renderList();

    const [first] = screen.getAllByRole("link", { name: "Offer to swap" });
    expect(first).toHaveAttribute("href", "/app/swap/new/3");
  });

  // The key used to sit inside every card, which put it against each of five
  // candidates and directly above each "Offer to swap".
  it("explains the tick once for the whole list, not once per candidate", () => {
    renderList();

    expect(
      screen.getAllByText(/marks a site that recommends the same party/),
    ).toHaveLength(1);
  });

  it("says when the matches will be recalculated", () => {
    renderList(90);

    expect(
      screen.getByText(/Matches will be recalculated 90 minutes after/),
    ).toBeInTheDocument();
  });

  it("explains the polls only when they are shown", () => {
    renderList();
    expect(screen.getByText(/Consider the polls/)).toBeInTheDocument();

    useElection.mockReturnValue({ data: { hidePolls: true } });
    renderList();
    expect(screen.queryAllByText(/Consider the polls/)).toHaveLength(1);
  });
});
