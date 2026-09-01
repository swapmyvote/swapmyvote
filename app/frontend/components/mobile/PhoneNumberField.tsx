import { useId } from "react";
import Form from "react-bootstrap/Form";
import flags from "react-phone-number-input/flags";
import PhoneInput, { type Value } from "react-phone-number-input/max";
import "react-phone-number-input/style.css";
import styles from "./PhoneNumberField.module.scss";

interface PhoneNumberFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** The validity message to show, or null when there is nothing to say.
   *  Owned by the caller so the field can stay quiet until it is submitted
   *  rather than complaining at the first keystroke. */
  problem: string | null;
  disabled?: boolean;
}

/**
 * Replaces the `input[type=tel]` that app/frontend/entrypoints/intlTelInput.js
 * decorates on the legacy profile page: same country dropdown, same
 * international formatting, same E.164 value.
 *
 * `/max` metadata, matching lib/phone.ts, so both share one metadata bundle.
 * `flags` is imported explicitly because the default renders flags from a
 * remote SVG host — a network dependency this page does not need and E2E runs
 * should not have.
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
        // The border, padding and focus ring live on the wrapper, so the flag
        // and the number sit inside one box — see the stylesheet. The invalid
        // state has to go here too, for the same reason.
        className={
          problem !== null ? `${styles.field} ${styles.invalid}` : styles.field
        }
        // The library renders a country <select> and the number <input> as
        // siblings, so the id has to be aimed at the input rather than at the
        // wrapper for the label to find it.
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
