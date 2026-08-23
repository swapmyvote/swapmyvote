import { useEffect, useId, useState } from "react";
import Form from "react-bootstrap/Form";
import type { Constituency } from "@/types/api";

interface ConstituencyAutocompleteProps {
  constituencies: Constituency[];
  /** The selected constituency's ONS GSS code, or "" for none. */
  value: string;
  onChange: (onsId: string) => void;
  disabled?: boolean;
}

/**
 * Pick a constituency by typing its name.
 *
 * Replaces the legacy pairing of a `<select>` holding the ONS code and a
 * jQuery autocomplete input showing the name. A native `<datalist>` does the
 * same job with no library: the browser filters as you type, the control stays
 * a real text input for screen readers and keyboards, and it scales from the
 * two constituencies of a by-election to all 650 of a general election.
 *
 * The name is what the user sees and types; the ONS code is what leaves this
 * component, since that is what the whole domain keys on.
 */
export function ConstituencyAutocomplete({
  constituencies,
  value,
  onChange,
  disabled = false,
}: ConstituencyAutocompleteProps) {
  const inputId = useId();
  const listId = useId();

  const selectedName =
    constituencies.find((constituency) => constituency.onsId === value)?.name ??
    "";

  // What the user has typed, which is only the selected name once they have
  // actually matched one. Kept in step with `value` so that a selection made
  // elsewhere — the postcode lookup filling this in, as the legacy helper did
  // — shows up here, without fighting the user mid-keystroke.
  const [text, setText] = useState(selectedName);

  useEffect(() => {
    setText(selectedName);
  }, [selectedName]);

  function matchFor(typed: string) {
    return constituencies.find(
      (constituency) =>
        constituency.name.toLowerCase() === typed.trim().toLowerCase(),
    );
  }

  function handleChange(typed: string) {
    setText(typed);
    // Partial text narrows the suggestion list, but only a complete name is a
    // selection — matching the legacy combobox, where `_source` filters on a
    // substring while `_removeIfInvalid` requires an exact match.
    onChange(matchFor(typed)?.onsId ?? "");
  }

  function handleBlur() {
    // The legacy widget's `_removeIfInvalid`: text that matches no
    // constituency is wiped on the way out, so a half-typed name can never sit
    // in the box looking like a choice the user has made.
    if (text !== "" && !matchFor(text)) {
      setText("");
      onChange("");
    }
  }

  return (
    <Form.Group controlId={inputId}>
      <Form.Label>My constituency is</Form.Label>
      <Form.Control
        type="text"
        list={listId}
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
        autoComplete="off"
        placeholder="Type to select your constituency"
      />
      <datalist id={listId}>
        {constituencies.map((constituency) => (
          <option key={constituency.onsId} value={constituency.name} />
        ))}
      </datalist>
    </Form.Group>
  );
}
