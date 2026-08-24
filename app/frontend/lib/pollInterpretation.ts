import type { ConstituencyPoll } from "@/types/api";

export interface PollInterpretation {
  kind: "could-make-a-difference" | "safe-win" | "trailing";
  /** Already formatted, e.g. "9%" or "0.4%". */
  percent: string;
  /** Only meaningful for "could-make-a-difference": whether the party is the
   *  one in front. */
  leading: boolean;
}

// Below this gap the seat is a marginal, and one vote is worth swapping for.
// Same threshold as _polls_interpretation_self.html.haml.
const marginalThreshold = 1000;

/**
 * Ports the percentage formatting in
 * app/views/user/swaps/_polls_interpretation_self.html.haml: whole numbers at
 * 9% and above, one significant figure below it.
 *
 * Ruby's "%.1g" rounds half to even and JavaScript's toPrecision rounds half
 * away from zero, so an exact half (8.5%) differs by a rounding step. Polling
 * numbers are estimates to begin with, so that is not worth emulating.
 */
function formatPercent(marginalScore: number): string {
  const percent = marginalScore / 100;
  if (percent >= 9) {
    return `${Math.round(percent)}%`;
  }
  return `${Number(percent.toPrecision(1))}%`;
}

/**
 * How the user's willing party is doing in their constituency, as the review
 * screen explains it. Returns null when there is nothing to say — no poll for
 * that party, or marginal scores not yet calculated — and the caller shows the
 * legacy "no polling data found" line instead.
 */
export function interpretPoll(
  poll: ConstituencyPoll | null | undefined,
): PollInterpretation | null {
  if (!poll || poll.marginalScore === null) {
    return null;
  }

  const percent = formatPercent(poll.marginalScore);
  const leading = poll.signedMarginalScore > 0;

  if (poll.marginalScore < marginalThreshold) {
    return { kind: "could-make-a-difference", percent, leading };
  }
  if (leading) {
    return { kind: "safe-win", percent, leading };
  }
  return { kind: "trailing", percent, leading: false };
}
