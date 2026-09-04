import { FaHourglassHalf } from "react-icons/fa";
import { SocialShare } from "@/components/share/SocialShare";
import { ShareEmailConsentForm } from "@/components/swap/ShareEmailConsentForm";
import { SwapProfileCard } from "@/components/swap/SwapProfileCard";
import type { SwapDetail } from "@/types/api";

/**
 * Ports app/views/users/show/_confirm_outgoing_swap.html.haml.
 *
 * The partial's `if user.email.blank?` branch ("Keep checking back here, or
 * set an email address") is not ported: assert_has_email refuses to create an
 * outgoing swap without an email address, so that branch is unreachable.
 */
export function ConfirmOutgoingSwap({ swap }: { swap: SwapDetail }) {
  const partner = swap.partner;

  if (!partner) {
    return null;
  }

  return (
    <div className="d-flex flex-column gap-3">
      <h1 className="h4 mb-0">
        You've asked to swap your vote with {partner.name}!
      </h1>

      <SwapProfileCard candidate={partner} />

      <p className="mb-0">
        <FaHourglassHalf aria-hidden="true" /> We're just waiting for{" "}
        {partner.name} to confirm the swap! When they do we'll send you an
        email.
      </p>

      {swap.consentGiven ? (
        <p className="mb-0">
          You have opted to share your email address with {partner.name}. When
          they confirm the swap, they will be notified of your email address.
        </p>
      ) : (
        <>
          <p className="mb-0">
            We encourage you to share your email address with {partner.name}.
            When they confirm the swap, they will be notified of your email
            address.
          </p>
          <ShareEmailConsentForm
            label={`I understand that my email address will be shared with ${partner.name}`}
            submitLabel={`Share with ${partner.name}`}
          />
        </>
      )}

      <p className="mb-0">
        If we don't hear back from them in {swap.validityHours} hours, we'll
        cancel the swap and you can pick someone else.
      </p>

      <h2 className="h5 mb-0">In the meantime…</h2>

      <p className="mb-0">
        Why not spread the word to encourage more people to join?
      </p>

      <SocialShare />
    </div>
  );
}
