import { useId } from "react";
import Form from "react-bootstrap/Form";
import flags from "react-phone-number-input/flags";
import PhoneInput, { type Value } from "react-phone-number-input/max";
import "react-phone-number-input/style.css";
import styles from "./PhoneNumberField.module.scss";

interface PhoneNumberFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Owned by the caller so the field can stay quiet until submitted rather
   *  than complaining at the first keystroke. */
  problem: string | null;
  disabled?: boolean;
}

/**
 * Replaces the `input[type=tel]` that intlTelInput.js decorates on the legacy
 * profile page.
 *
 * `/max` matches lib/phone.ts so both share one metadata bundle. `flags` is
 * imported explicitly because the default fetches flags from a remote SVG
 * host, which this page and the E2E runs must not depend on.
 */
export function PhoneNumberField({
  value,
  onChange,
  problem,
  disabled,
}: PhoneNumberFieldProps) {
  const inputId = useId();
  const problemId = useId();

  return (
    <Form.Group>
      <Form.Label htmlFor={inputId}>My mobile number is</Form.Label>
      <PhoneInput
        international
        defaultCountry="GB"
        flags={flags}
        disabled={disabled}
        // Chrome lives on the wrapper — see the stylesheet — so the invalid
        // state goes there too.
        className={
          problem !== null ? `${styles.field} ${styles.invalid}` : styles.field
        }
        // The id must reach the <input>, not the wrapper, or the label has
        // nothing to point at.
        numberInputProps={{
          id: inputId,
          className: "form-control",
          autoComplete: "tel",
          "aria-describedby": problem !== null ? problemId : undefined,
          "aria-invalid": problem !== null ? true : undefined,
        }}
        countrySelectProps={{ "aria-label": "Country" }}
        // The component wants undefined, not "", for an empty field.
        value={value === "" ? undefined : (value as Value)}
        onChange={(next) => onChange(next ?? "")}
      />
      {problem !== null && (
        <Form.Text id={problemId} className="text-danger">
          {problem}
        </Form.Text>
      )}
    </Form.Group>
  );
}
