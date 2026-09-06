import { FaCheck } from "react-icons/fa";
import { ReachOutToSwap } from "@/components/swap/ReachOutToSwap";
import { ShareEmailConsentForm } from "@/components/swap/ShareEmailConsentForm";
import { SwapProfileCard } from "@/components/swap/SwapProfileCard";
import type { CurrentUser, SwapDetail } from "@/types/api";

interface SwapConfirmedProps {
  swap: SwapDetail;
  user: CurrentUser;
}

/**
 * Ports app/views/users/show/_swap_confirmed.html.haml — the only screen where
 * a partner's real name appears, which is why the serializer only unredacts it
 * for a confirmed swap.
 */
export function SwapConfirmed({ swap, user }: SwapConfirmedProps) {
  const partner = swap.partner;

  if (!partner) {
    return null;
  }

  return (
    <div className="d-flex flex-column gap-3">
      <h1 className="h4 mb-0">You've swapped your vote with {partner.name}!</h1>

      <SwapProfileCard candidate={partner} />

      <p className="mb-0">
        {partner.name} will vote <strong>{partner.willingParty?.name}</strong>{" "}
        in <strong>{partner.constituencyName}</strong> for you, and you will
        vote <strong>{user.willingParty?.name}</strong> in{" "}
        <strong>{user.constituencyName}</strong> for {partner.name}.
      </p>

      <p className="small text-success mb-0">
        <FaCheck aria-hidden="true" /> {partner.name} has confirmed the swap.
        You're all set!
      </p>

      {swap.consentGiven ? (
        <p className="mb-0">
          You have shared your email address with {partner.name}.
        </p>
      ) : (
        <>
          <p className="mb-0">
            We encourage you to share your email address with {partner.name}.
          </p>
          <ShareEmailConsentForm
            label={`Share my email address with ${partner.name}`}
            submitLabel={`Share with ${partner.name}`}
          />
        </>
      )}

      <ReachOutToSwap partner={partner} />
    </div>
  );
}
