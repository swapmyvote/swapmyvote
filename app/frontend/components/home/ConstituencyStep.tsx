import { useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import { ConstituencyAutocomplete } from "@/components/home/ConstituencyAutocomplete";
import { PostcodeLookup } from "@/components/home/PostcodeLookup";
import type { Constituency } from "@/types/api";

interface ConstituencyStepProps {
  constituencies: Constituency[];
  /** Pre-filled from an earlier visit, or from a ?constituency_ons_id link. */
  initialOnsId?: string;
  onComplete: (onsId: string) => void;
}

/**
 * Step one of the entry form: which constituency do you vote in?
 *
 * Ports app/views/home/_constituency_form.html.haml. It owns both ways of
 * answering — picking the name, or looking it up from a postcode — because
 * they are mutually exclusive: the legacy widget cleared the postcode field
 * when a name was chosen (`autocompleteselect` did `$("#txt-postcode").val("")`)
 * and the postcode lookup filled in the name.
 */
export function ConstituencyStep({
  constituencies,
  initialOnsId = "",
  onComplete,
}: ConstituencyStepProps) {
  const [onsId, setOnsId] = useState(initialOnsId);
  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleConstituencyPicked(picked: string) {
    setOnsId(picked);
    if (picked !== "") {
      // Answering by name retires the postcode, so a stale one can't suggest
      // the constituency came from somewhere it didn't.
      setPostcode("");
      setError(null);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (onsId === "") {
      setError("Please choose your constituency.");
      return;
    }
    onComplete(onsId);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="d-flex flex-column align-items-center"
    >
      <div className="w-100" style={{ maxWidth: 480 }}>
        <ConstituencyAutocomplete
          constituencies={constituencies}
          value={onsId}
          onChange={handleConstituencyPicked}
        />

        <div className="mt-3">
          <PostcodeLookup
            constituencies={constituencies}
            postcode={postcode}
            onPostcodeChange={setPostcode}
            onConstituencyFound={setOnsId}
          />
        </div>

        {error && (
          <Alert variant="danger" className="small" role="alert">
            {error}
          </Alert>
        )}

        <div className="text-center">
          <Button type="submit" variant="primary">
            Next: Choose Parties
          </Button>
        </div>
      </div>
    </form>
  );
}
