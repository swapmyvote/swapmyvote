import { SwapProfileCard } from "@/components/swap/SwapProfileCard";
import { useElection } from "@/lib/referenceData";
import { swapNewPath } from "@/lib/spaPaths";
import type { SwapCandidate } from "@/types/api";

interface PotentialSwapListProps {
  candidates: SwapCandidate[];
  /** How long this match set lasts before the server generates a new one. */
  expiryMinutes: number;
}

/** Ports app/views/user/swaps/_list_potential_swaps.html.haml. */
export function PotentialSwapList({
  candidates,
  expiryMinutes,
}: PotentialSwapListProps) {
  const election = useElection();
  const hidePolls = election.data?.hidePolls ?? false;

  return (
    <div className="d-flex flex-column gap-3">
      <h1 className="h4 mb-0">Who would you like to swap your vote with?</h1>

      {!hidePolls && (
        <p className="small subdued mb-0">
          Consider the polls in their constituency to give your vote the best
          chance of making a difference!
        </p>
      )}

      {candidates.map((candidate) => (
        <SwapProfileCard
          key={candidate.userId}
          candidate={candidate}
          offerLink={swapNewPath(candidate.userId)}
        />
      ))}

      {!hidePolls && (
        <p className="mb-0">
          Poll results are based on averaged MRP predictions for the next
          General Election.
        </p>
      )}

      <p className="small subdued mb-0">
        Matches will be recalculated {expiryMinutes} minutes after they are
        first shown, to give you a wider range of potential swap partners to
        choose from.
      </p>
    </div>
  );
}
