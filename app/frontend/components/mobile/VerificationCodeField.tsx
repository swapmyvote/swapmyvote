import { useId } from "react";
import Form from "react-bootstrap/Form";

interface VerificationCodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * The 6-digit code field from app/views/mobile_phone/verify_create.html.haml,
 * with the same pattern and length constraints. `one-time-code` lets iOS and
 * Android offer the code straight from the SMS, which the legacy field did
 * not.
 *
 * The legacy field called `setCustomValidity("Please enter 6 digits")` on a
 * pattern mismatch. `title` is the idiomatic React equivalent — browsers
 * append it to the pattern-mismatch validation message — without reaching
 * for a ref and imperative DOM calls.
 */
export function VerificationCodeField({
  value,
  onChange,
  disabled,
}: VerificationCodeFieldProps) {
  const inputId = useId();

  return (
    <Form.Group controlId={inputId}>
      <Form.Label>The 6 digit code</Form.Label>
      <Form.Control
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        title="Please enter 6 digits"
        maxLength={6}
        required
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Form.Group>
  );
}
