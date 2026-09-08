import { Link } from "react-router-dom";
import { spaPaths } from "@/lib/spaPaths";

interface GoVoteProps {
  /** Whether this user has a confirmed swap, which adds the reminder to tell
   *  their partner once they have voted. */
  swapConfirmed: boolean;
}

// Ports app/views/shared/_go_vote.html.haml.
export function GoVote({ swapConfirmed }: GoVoteProps) {
  return (
    <>
      <p>
        Here's how to{" "}
        <a href="https://wheredoivote.co.uk/" target="_blank" rel="noreferrer">
          find your local polling station
        </a>
        . Get out there and vote!
      </p>
      {swapConfirmed && (
        <p>
          And please don't forget to come back here when you've voted and{" "}
          <Link to={spaPaths.vote}>
            let your swap partner know you've voted!
          </Link>
        </p>
      )}
    </>
  );
}
