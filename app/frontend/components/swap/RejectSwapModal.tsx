import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import { FormErrors } from "@/components/forms/FormErrors";
import { apiErrorMessages } from "@/lib/apiErrors";
import { cancelSwap, useSwapMutation } from "@/lib/swap";

interface RejectSwapModalProps {
  partnerName: string;
  show: boolean;
  onHide: () => void;
}

/**
 * Ports the `#js-reject-modal` in
 * app/views/users/show/_confirm_incoming_swap.html.haml, which the legacy page
 * opens with jQuery.
 *
 * Rejecting destroys the swap, and Swap's before_destroy hook emails both
 * sides — so the warning is not decoration.
 */
export function RejectSwapModal({
  partnerName,
  show,
  onHide,
}: RejectSwapModalProps) {
  const mutation = useSwapMutation(cancelSwap);
  const [errors, setErrors] = useState<string[]>([]);

  async function reject() {
    setErrors([]);
    try {
      await mutation.mutateAsync(undefined);
      onHide();
    } catch (error) {
      setErrors(apiErrorMessages(error));
    }
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      aria-label={`Reject ${partnerName}`}
    >
      <Modal.Body>
        <p>Are you sure you want to reject {partnerName}?</p>
        <p className="subdued small mb-0">
          Some voting preferences are in high demand, and we can't be sure that
          we'll find anyone else to swap with if you turn down {partnerName}.
        </p>
        <FormErrors messages={errors} />
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn btn-secondary" onClick={onHide}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={reject}
          disabled={mutation.isPending}
        >
          Reject
        </button>
      </Modal.Footer>
    </Modal>
  );
}
