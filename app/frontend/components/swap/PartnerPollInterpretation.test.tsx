import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PartnerPollInterpretation } from "@/components/swap/PartnerPollInterpretation";
import type { ConstituencyPoll, Party } from "@/types/api";

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
    votes: 3500,
    marginalScore: 400,
    signedMarginalScore: 400,
    ...overrides,
  };
}

describe("PartnerPollInterpretation", () => {
  it("calls a marginal seat a difference the swap could make", () => {
    render(<PartnerPollInterpretation poll={poll()} party={labour} />);

    expect(
      screen.getByText(/this swap could make a difference for Labour/),
    ).toBeInTheDocument();
    expect(screen.getByText(/leading by 4%/)).toBeInTheDocument();
  });

  // Ports .profile-recommendations.smv-card: the legacy card wraps this
  // paragraph the same way it wraps the recommendations list next to it, in
  // every branch — not just the one under test above.
  it.each([
    ["could-make-a-difference", poll()],
    ["safe-win", poll({ marginalScore: 2200, signedMarginalScore: 2200 })],
    ["trailing", poll({ marginalScore: 2200, signedMarginalScore: -2200 })],
  ])("wraps the %s message in the same card as the recommendations", (_kind, thePoll) => {
    const { container } = render(
      <PartnerPollInterpretation poll={thePoll} party={labour} />,
    );

    const card = container.querySelector(":scope > .card");
    expect(card).not.toBeNull();
    expect(card?.querySelector(".card-body > p")).not.toBeNull();
  });

  it("says trailing the leading party when the party is behind in a marginal", () => {
    render(
      <PartnerPollInterpretation
        poll={poll({ signedMarginalScore: -400 })}
        party={labour}
      />,
    );

    expect(
      screen.getByText(/only trailing the leading party by 4%/),
    ).toBeInTheDocument();
  });

  it("calls a wide lead a safe win", () => {
    render(
      <PartnerPollInterpretation
        poll={poll({ marginalScore: 2200, signedMarginalScore: 2200 })}
        party={labour}
      />,
    );

    expect(
      screen.getByText(/may be supporting a safe win for Labour/),
    ).toBeInTheDocument();
    expect(screen.getByText(/leading by 22%/)).toBeInTheDocument();
  });

  it("warns when the party may still lose", () => {
    render(
      <PartnerPollInterpretation
        poll={poll({ marginalScore: 2200, signedMarginalScore: -2200 })}
        party={labour}
      />,
    );

    expect(
      screen.getByText(/Labour are trailing by 22% in the polls/),
    ).toBeInTheDocument();
  });

  // The HAML partial reads poll.marginal_score with no nil guard and would
  // raise; rendering nothing is the safe equivalent.
  it("renders nothing when marginal scores have not been calculated", () => {
    const { container } = render(
      <PartnerPollInterpretation
        poll={poll({ marginalScore: null })}
        party={labour}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
