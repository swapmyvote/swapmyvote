import { describe, expect, it } from "vitest";
import { interpretPoll } from "@/lib/pollInterpretation";
import type { ConstituencyPoll } from "@/types/api";

function poll(overrides: Partial<ConstituencyPoll>): ConstituencyPoll {
  return {
    partyId: 1,
    partyName: "Labour",
    partyShortName: "Lab",
    color: "#DC241f",
    votes: 4210,
    marginalScore: 500,
    signedMarginalScore: 500,
    ...overrides,
  };
}

describe("interpretPoll", () => {
  it("calls a sub-1000 marginal score a vote that could make a difference", () => {
    expect(
      interpretPoll(poll({ marginalScore: 500, signedMarginalScore: 500 })),
    ).toEqual({
      kind: "could-make-a-difference",
      percent: "5%",
      leading: true,
    });
  });

  it("marks a close trailing party as trailing the leader, still winnable", () => {
    expect(
      interpretPoll(poll({ marginalScore: 500, signedMarginalScore: -500 })),
    ).toEqual({
      kind: "could-make-a-difference",
      percent: "5%",
      leading: false,
    });
  });

  it("calls a big lead a safe win", () => {
    expect(
      interpretPoll(poll({ marginalScore: 2400, signedMarginalScore: 2400 })),
    ).toEqual({ kind: "safe-win", percent: "24%", leading: true });
  });

  it("calls a big deficit trailing", () => {
    expect(
      interpretPoll(poll({ marginalScore: 2400, signedMarginalScore: -2400 })),
    ).toEqual({ kind: "trailing", percent: "24%", leading: false });
  });

  it("treats marginalScore exactly 1000 as the safe-win boundary, not marginal", () => {
    expect(
      interpretPoll(poll({ marginalScore: 1000, signedMarginalScore: 1000 })),
    ).toEqual({ kind: "safe-win", percent: "10%", leading: true });
  });

  it("treats signedMarginalScore exactly 0 as not leading", () => {
    expect(
      interpretPoll(poll({ marginalScore: 500, signedMarginalScore: 0 })),
    ).toEqual({
      kind: "could-make-a-difference",
      percent: "5%",
      leading: false,
    });
  });

  it("formats scores under 9% to one significant figure, as the HAML did", () => {
    expect(
      interpretPoll(poll({ marginalScore: 42, signedMarginalScore: 42 }))
        ?.percent,
    ).toBe("0.4%");
  });

  it("formats scores of 9% and over as whole numbers", () => {
    expect(
      interpretPoll(poll({ marginalScore: 900, signedMarginalScore: 900 }))
        ?.percent,
    ).toBe("9%");
    expect(
      interpretPoll(poll({ marginalScore: 1234, signedMarginalScore: 1234 }))
        ?.percent,
    ).toBe("12%");
  });

  it("has nothing to say without a poll", () => {
    expect(interpretPoll(null)).toBeNull();
    expect(interpretPoll(undefined)).toBeNull();
  });

  it("has nothing to say before marginal scores have been calculated", () => {
    expect(interpretPoll(poll({ marginalScore: null }))).toBeNull();
  });
});
