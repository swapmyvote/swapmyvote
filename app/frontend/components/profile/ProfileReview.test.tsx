import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProfileReview } from "@/components/profile/ProfileReview";
import type { ConstituencyPoll, Party } from "@/types/api";

vi.mock("@/components/polls/PollChart", () => ({
  PollChart: () => <div data-testid="poll-chart" />,
}));

const labour: Party = {
  id: 2,
  name: "Labour",
  color: "#DC241f",
  smvCode: "lab",
};

function poll(overrides: Partial<ConstituencyPoll> = {}): ConstituencyPoll {
  return {
    partyId: 2,
    partyName: "Labour",
    partyShortName: "Lab",
    color: "#DC241f",
    votes: 4210,
    marginalScore: 500,
    signedMarginalScore: 500,
    ...overrides,
  };
}

function renderReview(
  props: Partial<Parameters<typeof ProfileReview>[0]> = {},
) {
  render(
    <MemoryRouter>
      <ProfileReview
        constituencyName="Woking"
        polls={[poll()]}
        willingParty={labour}
        {...props}
      />
    </MemoryRouter>,
  );
}

// The interpretation/no-poll sentences are built from several JSX text nodes
// (interpolated names sit in their own nodes), so a plain getByText string or
// regex only ever matches a fragment and can't catch a swallowed separator
// between nodes. This normalises an element's full textContent so a test can
// assert the whole rendered sentence, word-for-word against the legacy Haml.
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function getSentence(text: string): HTMLElement {
  return screen.getByText((_content, element) => {
    if (element?.tagName !== "P") {
      return false;
    }
    return normalizeWhitespace(element.textContent ?? "") === text;
  });
}

describe("ProfileReview", () => {
  it("charts the constituency", () => {
    renderReview();

    expect(screen.getByTestId("poll-chart")).toBeInTheDocument();
  });

  it("says a marginal vote could make a difference", () => {
    renderReview();

    expect(
      getSentence(
        "⭐ Looks like your vote could make a difference for Labour who are leading by 5% in the polls for Woking, so it's more likely that people supporting Labour will want to swap with you.",
      ),
    ).toBeInTheDocument();
  });

  it("calls a big lead a safe win", () => {
    renderReview({
      polls: [poll({ marginalScore: 2400, signedMarginalScore: 2400 })],
    });

    expect(
      getSentence(
        "Looks like your vote may be supporting a safe win for Labour who are currently leading by 24% in the polls for Woking, so it's less likely that people supporting Labour will want to swap with you.",
      ),
    ).toBeInTheDocument();
  });

  it("says so when a big lead is against the willing party", () => {
    renderReview({
      polls: [poll({ marginalScore: 2400, signedMarginalScore: -2400 })],
    });

    expect(
      getSentence(
        "Labour are trailing by 24% in the polls for Woking, and may still lose despite this swap, so it's less likely that people supporting Labour will want to swap with you.",
      ),
    ).toBeInTheDocument();
  });

  it("says so when there is no poll for the willing party", () => {
    renderReview({ polls: [poll({ partyId: 99, partyName: "Green" })] });

    expect(
      getSentence(
        "No polling data found for Labour in Woking so we can't interpret that for you.",
      ),
    ).toBeInTheDocument();
  });

  it("offers a way onward and a way back", () => {
    renderReview();

    expect(screen.getByRole("link", { name: /proceed/i })).toHaveAttribute(
      "href",
      "/user",
    );
    expect(screen.getByRole("link", { name: /change/i })).toHaveAttribute(
      "href",
      "/app/profile",
    );
  });

  it("shows the legacy 'you shouldn't be here' line with nothing to review", () => {
    renderReview({ willingParty: null });

    expect(screen.getByText(/you shouldn't be here/i)).toBeInTheDocument();
  });

  it("names the missing constituency when only that is unknown", () => {
    renderReview({ constituencyName: null });

    expect(
      screen.getByText(
        /we don't know the constituency you're going to vote in/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        /we don't know the party you are offering to vote for/i,
      ),
    ).not.toBeInTheDocument();
  });
});
