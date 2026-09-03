import { FaEnvelope, FaFacebook, FaPhone, FaTwitter } from "react-icons/fa";
import { Link } from "react-router-dom";
import { PollChart } from "@/components/polls/PollChart";
import { PartnerPollInterpretation } from "@/components/swap/PartnerPollInterpretation";
import { PartyRecommendations } from "@/components/swap/PartyRecommendations";
import { useElection } from "@/lib/referenceData";
import type { SwapCandidate, SwapPartnerDetail } from "@/types/api";
import styles from "./SwapProfileCard.module.scss";

interface SwapProfileCardProps {
  /** A candidate from the list, or the partner of a live swap — the two carry
   *  the same card fields. */
  candidate: SwapCandidate | SwapPartnerDetail;
  /** When given, the card ends with an "Offer to swap" button pointing here. */
  offerLink?: string;
}

/**
 * Ports app/views/user/swaps/_swap_profile.html.haml and its `_inner` partial:
 * who this person is, what they will vote, and what the polls where they vote
 * say about swapping with them.
 *
 * Every name reaching this card is already redacted unless the swap is
 * confirmed — the serializer decides that, not the view.
 */
export function SwapProfileCard({
  candidate,
  offerLink,
}: SwapProfileCardProps) {
  const election = useElection();
  const hidePolls = election.data?.hidePolls ?? false;
  const { constituencyName, willingParty } = candidate;
  const willingPoll = willingParty
    ? candidate.polls.find((poll) => poll.partyId === willingParty.id)
    : undefined;

  return (
    <div className="card">
      <div className="card-body d-flex flex-column gap-3">
        <div className="d-flex gap-3">
          <img
            className={`${styles.avatar} rounded-circle`}
            src={candidate.imageUrl}
            alt=""
          />
          <div>
            <div className="fw-bold">{candidate.name}</div>

            <div className="d-flex gap-2 text-muted">
              {candidate.badges.mobileVerified && (
                <FaPhone title="Phone number verified" />
              )}
              {candidate.badges.provider === "twitter" && (
                <FaTwitter title="Twitter account verified" />
              )}
              {candidate.badges.provider === "facebook" && (
                <FaFacebook title="Facebook account verified" />
              )}
              {candidate.badges.hasEmail && (
                <FaEnvelope title="Email address potentially available" />
              )}
            </div>

            <div className="small text-muted">
              in {constituencyName ?? "Unknown?"}
            </div>

            <div>
              will vote <strong>{willingParty?.name}</strong> if you vote{" "}
              <strong>{candidate.preferredParty?.name}</strong>
            </div>
          </div>
        </div>

        {!hidePolls &&
          constituencyName !== null &&
          candidate.polls.length > 0 && (
            <div className="d-flex flex-column gap-2">
              <p className="small mb-0">
                Predicted results for {constituencyName}
              </p>
              <PollChart
                polls={candidate.polls}
                constituencyName={constituencyName}
              />
            </div>
          )}

        {!hidePolls &&
          constituencyName !== null &&
          willingParty !== null &&
          (willingPoll !== undefined ||
            candidate.recommendations.length > 0) && (
            <div className="d-flex flex-column gap-3">
              <h6 className="mb-0">Does this help your vote count?</h6>
              <PartnerPollInterpretation
                poll={willingPoll}
                party={willingParty}
              />
              <PartyRecommendations
                constituencyName={constituencyName}
                recommendations={candidate.recommendations}
              />
            </div>
          )}

        {offerLink !== undefined && (
          <div>
            <Link to={offerLink} className="btn btn-primary">
              Offer to swap
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
