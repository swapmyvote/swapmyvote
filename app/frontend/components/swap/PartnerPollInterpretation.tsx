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

  if (kind === "could-make-a-difference") {
    const position = leading ? "leading" : "only trailing the leading party";
    return (
      <p className="mb-0">
        ⭐ Looks like this swap could make a difference for {party.name} who are{" "}
        {position} by {percent} in the polls.
      </p>
    );
  }

  if (kind === "safe-win") {
    return (
      <p className="mb-0">
        Looks like this swap may be supporting a safe win for {party.name} who
        are currently leading by {percent} in the polls.
      </p>
    );
  }

  return (
    <p className="mb-0">
      {party.name} are trailing by {percent} in the polls and may still lose
      despite this swap.
    </p>
  );
}
