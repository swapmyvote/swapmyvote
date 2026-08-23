import { useCombobox } from "downshift";
import { useId, useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import type { Constituency } from "@/types/api";
import styles from "./ConstituencyAutocomplete.module.scss";

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
 * Ports the legacy jQuery UI combobox (app/assets/javascripts/autocomplete.js),
 * which paired a hidden `<select>` holding the ONS code with an autocomplete
 * input showing the name. Its three behaviours are kept:
 *
 *  - `_source` filters on a case-insensitive **substring**, anywhere in the
 *    name — not a prefix match.
 *  - `_removeIfInvalid` accepts an exactly-typed name even if the menu was
 *    never opened, and wipes anything else when the field is left, so a
 *    half-typed name can never sit there looking like a choice.
 *  - `_createShowAllButton` opens the full list on demand.
 *
 * Built on Downshift rather than a native `<datalist>` (a browser-drawn
 * dropdown that cannot be positioned or styled) or react-bootstrap-typeahead
 * (whose hint handling calls preventDefault on Tab, trapping keyboard focus
 * in the field — WCAG 2.1.2). Downshift supplies the ARIA wiring and keyboard
 * behaviour; the markup and styling are ours.
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
  const [query, setQuery] = useState("");

  const selectedItem =
    constituencies.find((constituency) => constituency.onsId === value) ?? null;

  // Substring, anywhere in the name, case-insensitive — matching the legacy
  // `_source` regex rather than a prefix match.
  const trimmed = query.trim().toLowerCase();
  const items =
    trimmed === ""
      ? constituencies
      : constituencies.filter((constituency) =>
          constituency.name.toLowerCase().includes(trimmed),
        );

  function exactMatch(text: string) {
    return constituencies.find(
      (constituency) =>
        constituency.name.toLowerCase() === text.trim().toLowerCase(),
    );
  }

  const {
    isOpen,
    getLabelProps,
    getInputProps,
    getMenuProps,
    getItemProps,
    getToggleButtonProps,
    highlightedIndex,
  } = useCombobox<Constituency>({
    items,
    selectedItem,
    inputValue: query,
    itemToString: (constituency) => constituency?.name ?? "",
    onInputValueChange: ({ inputValue }) => setQuery(inputValue ?? ""),
    onSelectedItemChange: ({ selectedItem: chosen }) => {
      onChange(chosen?.onsId ?? "");
    },
    // Leaving the field is where the legacy `_removeIfInvalid` ran, and it is
    // the one place Downshift's defaults differ from it: Downshift restores
    // the last selection, where the legacy widget committed an exactly-typed
    // name and wiped anything else.
    stateReducer: (state, { type, changes }) => {
      if (type !== useCombobox.stateChangeTypes.InputBlur) {
        return changes;
      }
      const match = exactMatch(state.inputValue);
      if (match) {
        // An exact name counts as a choice even if the menu was never opened.
        return { ...changes, selectedItem: match, inputValue: match.name };
      }
      // Anything else is wiped, so a half-typed name can never sit in the box
      // looking like a selection the user has made.
      return { ...changes, selectedItem: null, inputValue: "" };
    },
  });

  // Keep the box in step with a selection made elsewhere — the postcode
  // lookup filling this in, as the legacy helper did.
  const selectedName = selectedItem?.name ?? "";
  if (selectedName !== "" && query !== selectedName && !isOpen) {
    setQuery(selectedName);
  }

  return (
    <Form.Group className={styles.combobox}>
      <Form.Label {...getLabelProps({ htmlFor: inputId })}>
        My constituency is
      </Form.Label>
      <InputGroup>
        <Form.Control
          {...getInputProps({
            id: inputId,
            disabled,
            placeholder: "Type to select your constituency",
          })}
        />
        <Button
          variant="outline-secondary"
          disabled={disabled}
          // Downshift points the toggle's aria-labelledby at the field label,
          // which would give the button the same accessible name as the input.
          // Name it for what it does instead.
          {...getToggleButtonProps({
            "aria-label": "Show all constituencies",
            "aria-labelledby": undefined,
          })}
        >
          ▼
        </Button>
      </InputGroup>
      <ul
        {...getMenuProps()}
        className={`dropdown-menu w-100 ${styles.menu} ${
          isOpen && items.length > 0 ? "show" : ""
        }`}
      >
        {isOpen &&
          items.map((constituency, index) => (
            <li key={constituency.onsId}>
              <button
                type="button"
                className={`dropdown-item ${
                  highlightedIndex === index ? "active" : ""
                }`}
                {...getItemProps({ item: constituency, index })}
              >
                {constituency.name}
              </button>
            </li>
          ))}
      </ul>
    </Form.Group>
  );
}
