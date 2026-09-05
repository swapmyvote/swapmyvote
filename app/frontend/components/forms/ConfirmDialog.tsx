import type { ReactNode } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { ActionRow } from "@/components/forms/ActionRow";

interface ConfirmDialogProps {
  /** Names the dialog for assistive tech — say what it will do, not "dialog". */
  ariaLabel: string;
  show: boolean;
  /** Dismiss: the backdrop, Escape and the cancel button all call this. */
  onHide: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled?: boolean;
  cancelLabel?: string;
  children: ReactNode;
}

/**
 * A confirm/cancel dialog with its footer fixed: right-aligned, cancel then
 * confirm, confirm rightmost — macOS ordering.
 *
 * The layout is not left to the caller. The two labels arrive as props rather
 * than as footer children precisely so a future dialog cannot render its
 * buttons in the other order, which is how the in-page action rows drifted
 * before ActionRow existed.
 *
 * Cancel is the dismissive action, so it doubles as `onHide` — Escape and the
 * backdrop do the same thing the button does.
 *
 * No "danger" variant: this theme sets $danger to gray-900 (globals.scss), so
 * a destructive confirm rendered in it reads as ordinary dark ink rather than
 * a warning. Say what the button does in its label instead.
 */
export function ConfirmDialog({
  ariaLabel,
  show,
  onHide,
  onConfirm,
  confirmLabel,
  confirmDisabled = false,
  cancelLabel = "Cancel",
  children,
}: ConfirmDialogProps) {
  return (
    <Modal show={show} onHide={onHide} centered aria-label={ariaLabel}>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <ActionRow>
          <Button type="button" variant="secondary" onClick={onHide}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </ActionRow>
      </Modal.Footer>
    </Modal>
  );
}
