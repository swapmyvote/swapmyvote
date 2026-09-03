import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SwapProfileCard } from "@/components/swap/SwapProfileCard";
import type { SwapCandidate } from "@/types/api";

const useElection = vi.hoisted(() => vi.fn());
vi.mock("@/lib/referenceData", () => ({ useElection }));

// PollChart draws to a <canvas>, which jsdom does not implement. Its own test
// covers it; here we only care that the card decides whether to render it.
vi.mock("@/components/polls/PollChart", () => ({
  PollChart: () => <div data-testid="poll-chart" />,
}));

function candidate(overrides: Partial<SwapCandidate> = {}): SwapCandidate {
  return {
    userId: 3,
    name: "Grace H",
    imageUrl: "https://example.com/grace.png",
    constituencyName: "Wakefield",
    constituencyOnsId: "E14001009",
    badges: { mobileVerified: true, provider: "twitter", hasEmail: true },
    preferredParty: { id: 2, name: "Labour", color: "#DC241f", smvCode: "lab" },
    willingParty: { id: 1, name: "Green", color: "#6AB023", smvCode: "grn" },
    polls: [
      {
        partyId: 1,
        partyName: "Green",
        partyShortName: "Grn",
        color: "#6AB023",
        votes: 3100,
        marginalScore: 400,
        signedMarginalScore: -400,
      },
    ],
    recommendations: [],
    ...overrides,
  };
}

function renderCard(props: Parameters<typeof SwapProfileCard>[0]) {
  return render(
    <MemoryRouter>
      <SwapProfileCard {...props} />
    </MemoryRouter>,
  );
}

describe("SwapProfileCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useElection.mockReturnValue({ data: { hidePolls: false } });
  });

  it("says who will vote for what", () => {
    renderCard({ candidate: candidate() });

    expect(screen.getByText("Grace H")).toBeInTheDocument();
    expect(screen.getByText(/in Wakefield/)).toBeInTheDocument();
    expect(screen.getByText(/will vote/)).toHaveTextContent(
      "will vote Green if you vote Labour",
    );
  });

  it("draws the badges the candidate has earned, and no others", () => {
    renderCard({ candidate: candidate() });

    expect(screen.getByTitle("Phone number verified")).toBeInTheDocument();
    expect(screen.getByTitle("Twitter account verified")).toBeInTheDocument();
    expect(
      screen.getByTitle("Email address potentially available"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTitle("Facebook account verified"),
    ).not.toBeInTheDocument();
  });

  it("charts the constituency polls and interprets them", () => {
    renderCard({ candidate: candidate() });

    expect(screen.getByTestId("poll-chart")).toBeInTheDocument();
    expect(
      screen.getByText(/this swap could make a difference for Green/),
    ).toBeInTheDocument();
  });

  it("hides every poll when the election hides polls", () => {
    useElection.mockReturnValue({ data: { hidePolls: true } });

    renderCard({ candidate: candidate() });

    expect(screen.queryByTestId("poll-chart")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/could make a difference/),
    ).not.toBeInTheDocument();
  });

  it("offers to swap only when given a link", () => {
    renderCard({ candidate: candidate() });
    expect(
      screen.queryByRole("link", { name: "Offer to swap" }),
    ).not.toBeInTheDocument();

    renderCard({ candidate: candidate(), offerLink: "/app/swap/new/3" });
    expect(screen.getByRole("link", { name: "Offer to swap" })).toHaveAttribute(
      "href",
      "/app/swap/new/3",
    );
  });

  it("copes with a candidate whose constituency is unknown", () => {
    renderCard({
      candidate: candidate({
        constituencyName: null,
        constituencyOnsId: null,
        polls: [],
      }),
    });

    expect(screen.getByText(/in Unknown\?/)).toBeInTheDocument();
    expect(screen.queryByTestId("poll-chart")).not.toBeInTheDocument();
  });
});
