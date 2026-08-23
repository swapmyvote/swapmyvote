import { type KeyboardEvent, useId, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import { lookupPostcode, PostcodeLookupError } from "@/lib/postcodes";
import type { Constituency } from "@/types/api";

interface PostcodeLookupProps {
  /** The constituencies we actually run swaps in. */
  constituencies: Constituency[];
  /** The postcode being typed. Controlled by the caller so that picking a
   *  constituency by name can empty it — the two inputs are two ways of
   *  answering one question, and the legacy widget kept them exclusive
   *  (`autocompleteselect` did `$("#txt-postcode").val("")`). */
  postcode: string;
  onPostcodeChange: (postcode: string) => void;
  /** Called with the matched ONS GSS code, or "" when the postcode resolves
   *  to somewhere we do not cover. */
  onConstituencyFound: (onsId: string) => void;
}

const notCovered = "Postcode is not in one of the accepted constituencies";

/**
 * Find a constituency from a postcode, as a convenience beside the
 * constituency picker. Replaces app/javascript/packs/postcodesHelper.js.
 *
 * Two behaviours carried over deliberately from that helper:
 *
 *  - Enter runs the lookup instead of submitting the surrounding form. The
 *    postcode field sits inside the entry form, and the user is unlikely to
 *    have filled in the rest of it yet.
 *  - A postcode outside our constituencies is an error *and* clears any
 *    existing selection, rather than quietly leaving a stale one behind.
 *
 * The postcode is used and discarded — never sent to our own backend, and
 * never stored. The copy below says so.
 */
export function PostcodeLookup({
  constituencies,
  postcode,
  onPostcodeChange,
  onConstituencyFound,
}: PostcodeLookupProps) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    setSearching(true);
    setError(null);
    try {
      const { onsId } = await lookupPostcode(postcode);
      const covered = constituencies.some(
        (constituency) => constituency.onsId === onsId,
      );
      if (covered) {
        onConstituencyFound(onsId);
      } else {
        setError(notCovered);
        onConstituencyFound("");
      }
    } catch (caught) {
      setError(
        caught instanceof PostcodeLookupError
          ? caught.message
          : "Postcode lookup failed - please try again.",
      );
      onConstituencyFound("");
    }
    setSearching(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // Search, don't submit the form around us.
      event.preventDefault();
      void handleSearch();
    }
  }

  return (
    <div>
      <Form.Label htmlFor={inputId}>
        Or find my constituency using my postcode
      </Form.Label>

      <InputGroup>
        <Form.Control
          id={inputId}
          type="text"
          value={postcode}
          minLength={5}
          maxLength={9}
          spellCheck={false}
          autoComplete="postal-code"
          onChange={(event) => onPostcodeChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        {/* Outline, not solid: beside the combobox's quiet toggle a filled
            dark button read as the loudest thing on the form, which it is
            not — the primary action is "Next". */}
        <Button
          variant="outline-secondary"
          onClick={() => void handleSearch()}
          disabled={searching}
        >
          Search
        </Button>
      </InputGroup>

      {error && (
        <Alert
          variant="danger"
          className="small mt-2 mb-0"
          id={`${inputId}-error`}
          role="alert"
        >
          {error}
        </Alert>
      )}

      <p className="small text-muted mt-2 mb-0">
        Your postcode is only used to find your constituency; we do not retain
        this info
      </p>
    </div>
  );
}
