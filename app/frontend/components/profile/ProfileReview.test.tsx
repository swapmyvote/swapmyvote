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

describe("ProfileReview", () => {
  it("charts the constituency", () => {
    renderReview();

    expect(screen.getByTestId("poll-chart")).toBeInTheDocument();
  });

  it("says a marginal vote could make a difference", () => {
    renderReview();

    expect(screen.getByText(/could make a difference/i)).toHaveTextContent(
      /Labour/,
    );
    expect(screen.getByText(/could make a difference/i)).toHaveTextContent(
      "5%",
    );
  });

  it("calls a big lead a safe win", () => {
    renderReview({
      polls: [poll({ marginalScore: 2400, signedMarginalScore: 2400 })],
    });

    expect(screen.getByText(/safe win/i)).toBeInTheDocument();
  });

  it("says so when there is no poll for the willing party", () => {
    renderReview({ polls: [poll({ partyId: 99, partyName: "Green" })] });

    expect(screen.getByText(/no polling data found/i)).toBeInTheDocument();
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
