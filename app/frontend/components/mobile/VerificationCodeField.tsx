import { useId } from "react";
import Form from "react-bootstrap/Form";

interface VerificationCodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * `title` carries the message the legacy field set with
 * `setCustomValidity("Please enter 6 digits")`: browsers append it to the
 * pattern-mismatch text, so no ref and no imperative DOM call.
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
