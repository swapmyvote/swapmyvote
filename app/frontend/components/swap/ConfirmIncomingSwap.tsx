import { type FormEvent, useState } from "react";
import Form from "react-bootstrap/Form";
import { Link } from "react-router-dom";
import { FormErrors } from "@/components/forms/FormErrors";
import { RejectSwapModal } from "@/components/swap/RejectSwapModal";
import { SwapProfileCard } from "@/components/swap/SwapProfileCard";
import { useSession } from "@/contexts/useSession";
import { apiErrorMessages } from "@/lib/apiErrors";
import { useElection } from "@/lib/referenceData";
import { spaPaths } from "@/lib/spaPaths";
import { confirmSwap, consentMessage, useSwapMutation } from "@/lib/swap";
import type { SwapDetail } from "@/types/api";

/**
 * Ports app/views/users/show/_confirm_incoming_swap.html.haml — the only
 * screen that can confirm a swap, and the only one that can reject one.
 *
 * The legacy view embeds the whole phone form for an unverified user; M6 gave
 * us /app/mobile, so this links there instead.
 */
export function ConfirmIncomingSwap({ swap }: { swap: SwapDetail }) {
  const { session } = useSession();
  const election = useElection();
  const hidePolls = election.data?.hidePolls ?? false;
  const mutation = useSwapMutation(confirmSwap);
  const [consented, setConsented] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [rejecting, setRejecting] = useState(false);

  const partner = swap.partner;
  const mobileVerified = session?.currentUser?.mobileVerified ?? false;

  if (!partner) {
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!consented) {
      setErrors([consentMessage]);
      return;
    }

    setErrors([]);
    try {
      await mutation.mutateAsync(undefined);
    } catch (error) {
      setErrors(apiErrorMessages(error));
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      <h1 className="h4 mb-0">
        {partner.name} would like to swap their vote with you!
      </h1>

      <SwapProfileCard candidate={partner} />

      {/* Ports _double_check_constituency, which the HAML view renders under
          the card. */}
      {!hidePolls && (
        <p className="small mb-0">
          Poll results are based on averaged MRP predictions for the next
          General Election.
        </p>
      )}

      {mobileVerified ? (
        <>
          <p className="mb-0">
            Please confirm that you would like to swap with {partner.name}
          </p>

          <Form onSubmit={handleSubmit} className="d-flex flex-column gap-2">
            <FormErrors messages={errors} />

            <Form.Check
              type="checkbox"
              id="consent-share-email"
              checked={consented}
              onChange={(event) => setConsented(event.target.checked)}
              label={`I understand that my email address will be shared with ${partner.name}`}
            />

            <div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={mutation.isPending}
              >
                Swap with {partner.name}
              </button>
            </div>
          </Form>
        </>
      ) : (
        <>
          <p className="mb-0">
            You must verify your mobile number before you swap
          </p>
          <p className="mb-0">
            <Link to={spaPaths.mobile}>Verify your mobile number</Link>
          </p>
        </>
      )}

      <p className="mb-0">
        <button
          type="button"
          className="btn btn-link small subdued p-0"
          onClick={() => setRejecting(true)}
        >
          I'd prefer to swap with someone else
        </button>
      </p>

      <RejectSwapModal
        partnerName={partner.name ?? ""}
        show={rejecting}
        onHide={() => setRejecting(false)}
      />
    </div>
  );
}
