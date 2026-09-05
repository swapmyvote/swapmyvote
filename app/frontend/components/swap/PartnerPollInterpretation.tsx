import type { ReactNode } from "react";
import { interpretPoll } from "@/lib/pollInterpretation";
import type { ConstituencyPoll, Party } from "@/types/api";

interface PartnerPollInterpretationProps {
  poll: ConstituencyPoll | null | undefined;
  party: Party;
}

/**
 * Ports app/views/user/swaps/_polls_interpretation.html.haml: what the polls
 * in a *partner's* constituency say about swapping with them.
 *
 * The calculation is shared with the review screen's self-facing version — see
 * lib/pollInterpretation.ts — and only the copy differs.
 */
export function PartnerPollInterpretation({
  poll,
  party,
}: PartnerPollInterpretationProps) {
  const interpretation = interpretPoll(poll);

  if (interpretation === null) {
    return null;
  }

  const { kind, percent, leading } = interpretation;

  let body: ReactNode;

  if (kind === "could-make-a-difference") {
    const position = leading ? "leading" : "only trailing the leading party";
    body = (
      <p className="mb-0">
        ⭐ Looks like this swap could make a difference for {party.name} who are{" "}
        {position} by {percent} in the polls.
      </p>
    );
  } else if (kind === "safe-win") {
    body = (
      <p className="mb-0">
        Looks like this swap may be supporting a safe win for {party.name} who
        are currently leading by {percent} in the polls.
      </p>
    );
  } else {
    body = (
      <p className="mb-0">
        {party.name} are trailing by {percent} in the polls and may still lose
        despite this swap.
      </p>
    );
  }

  // No card of its own. The legacy partial wrapped this in
  // .profile-recommendations.smv-card, but inside SwapProfileCard's card that
  // is a box in a box — and the recommendations below it dropped their card
  // for the same reason. The "Does this help your vote count?" heading above
  // already groups the two.
  return body;
}
