import Alert from "react-bootstrap/Alert";
import { Link } from "react-router-dom";
import { PollChart } from "@/components/polls/PollChart";
import { interpretPoll } from "@/lib/pollInterpretation";
import { spaPaths } from "@/lib/spaPaths";
import type { ConstituencyPoll, Party } from "@/types/api";

interface ProfileReviewProps {
  constituencyName: string | null;
  polls: ConstituencyPoll[];
  willingParty: Party | null;
}

// The dashboard is still HAML (M7), so proceeding leaves the SPA.
const hamlDashboard = "/user";

/**
 * Ports app/views/users/review.haml: after a change to the offered vote, show
 * what the polls say about it before the user commits.
 */
export function ProfileReview({
  constituencyName,
  polls,
  willingParty,
}: ProfileReviewProps) {
  if (!willingParty || !constituencyName) {
    return (
      <Alert variant="warning" className="small">
        <p>
          Whoops, you shouldn't be here.{" "}
          {!willingParty &&
            "We don't know the party you are offering to vote for. "}
          {!constituencyName &&
            "We don't know the constituency you're going to vote in. "}
          Please go and edit your profile details, and that should bring you
          back here when you're done.
        </p>
        <Link to={spaPaths.profile} className="btn btn-primary">
          Edit Profile
        </Link>
      </Alert>
    );
  }

  const partyPoll = polls.find((poll) => poll.partyId === willingParty.id);
  const interpretation = interpretPoll(partyPoll);

  return (
    <div className="d-flex flex-column gap-3">
      <p className="small mb-0">Predicted results for {constituencyName}</p>

      <PollChart polls={polls} constituencyName={constituencyName} />

      {interpretation === null ? (
        <p className="mb-0">
          No polling data found for {willingParty.name} in {constituencyName}
          so we can't interpret that for you.
        </p>
      ) : (
        <p className="mb-0">
          {interpretation.kind === "could-make-a-difference" &&
            `⭐ Looks like your vote could make a difference for ${willingParty.name} who are ${
              interpretation.leading
                ? "leading"
                : "only trailing the leading party"
            } by ${interpretation.percent} in the polls for ${constituencyName}, so it's more likely that people supporting ${willingParty.name} will want to swap with you.`}
          {interpretation.kind === "safe-win" &&
            `Looks like your vote may be supporting a safe win for ${willingParty.name} who are currently leading by ${interpretation.percent} in the polls for ${constituencyName}, so it's less likely that people supporting ${willingParty.name} will want to swap with you.`}
          {interpretation.kind === "trailing" &&
            `${willingParty.name} are trailing by ${interpretation.percent} in the polls for ${constituencyName}, and may still lose despite this swap, so it's less likely that people supporting ${willingParty.name} will want to swap with you.`}
        </p>
      )}

      <p className="mb-0">
        <strong>
          Do you want to proceed with this party, or change your offered vote?
        </strong>
      </p>

      <div className="d-flex gap-2">
        {/* Plain anchor, not react-bootstrap's <Button href>: that component
            overrides the implicit anchor role to "button", which would break
            this link's accessible role. */}
        <a href={hamlDashboard} className="btn btn-primary">
          Proceed
        </a>
        <Link to={spaPaths.profile} className="btn btn-secondary">
          Change
        </Link>
      </div>
    </div>
  );
}
