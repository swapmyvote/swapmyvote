import { useState } from "react";
import { ConfirmDialog } from "@/components/forms/ConfirmDialog";
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
 * sides — so the warning in the body is not decoration.
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
    <ConfirmDialog
      ariaLabel={`Reject ${partnerName}`}
      show={show}
      onHide={onHide}
      onConfirm={reject}
      confirmLabel="Reject"
      confirmDisabled={mutation.isPending}
    >
      <p>Are you sure you want to reject {partnerName}?</p>
      <p className="subdued small mb-0">
        Some voting preferences are in high demand, and we can't be sure that
        we'll find anyone else to swap with if you turn down {partnerName}.
      </p>
      <FormErrors messages={errors} />
    </ConfirmDialog>
  );
}
