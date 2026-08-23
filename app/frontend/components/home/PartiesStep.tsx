import { useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import type { Party } from "@/types/api";

interface PartiesStepProps {
  parties: Party[];
  /** "another constituency" / "the other constituency", from the election. */
  constituencyOther: string;
  initialPreferredPartyId?: string;
  initialWillingPartyId?: string;
  submitting?: boolean;
  onComplete: (parties: {
    preferredPartyId: string;
    willingPartyId: string;
  }) => void;
}

const bothRequired =
  "Please choose both your preferred party and your willing party.";
const mustDiffer =
  "Your preferred party and your willing party cannot be the same.";

/**
 * Step two of the entry form: which party would you rather vote for, and which
 * would you vote for in exchange?
 *
 * Ports app/views/home/_candidates_form.html.haml and the two validations from
 * _candidates_form_js.html.haml. Those were Bootstrap modals raised from a
 * jQuery `checkForm()`; here they are inline messages tied to the fields via
 * aria-describedby, which screen readers announce without a dialog to dismiss
 * and which keep the answer visible while it is corrected.
 */
export function PartiesStep({
  parties,
  constituencyOther,
  initialPreferredPartyId = "",
  initialWillingPartyId = "",
  submitting = false,
  onComplete,
}: PartiesStepProps) {
  const [preferredPartyId, setPreferredPartyId] = useState(
    initialPreferredPartyId,
  );
  const [willingPartyId, setWillingPartyId] = useState(initialWillingPartyId);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (preferredPartyId === "" || willingPartyId === "") {
      setError(bothRequired);
      return;
    }
    if (preferredPartyId === willingPartyId) {
      setError(mustDiffer);
      return;
    }
    setError(null);
    onComplete({ preferredPartyId, willingPartyId });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Same rhythm as the constituency step: one gap between blocks. */}
      <div className="d-flex flex-column gap-3">
        <Form.Group controlId="preferred-party">
          <Form.Label>Which party would you most like to vote for?</Form.Label>
          <Form.Select
            value={preferredPartyId}
            onChange={(event) => setPreferredPartyId(event.target.value)}
            aria-describedby={error ? "parties-error" : undefined}
          >
            <option value="">...</option>
            {parties.map((party) => (
              <option key={party.id} value={String(party.id)}>
                {party.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group controlId="willing-party">
          <Form.Label>
            When we find someone to vote for your party in {constituencyOther},
            which party could you vote for in exchange?
          </Form.Label>
          <Form.Select
            value={willingPartyId}
            onChange={(event) => setWillingPartyId(event.target.value)}
            aria-describedby={error ? "parties-error" : undefined}
          >
            <option value="">...</option>
            {parties.map((party) => (
              <option key={party.id} value={String(party.id)}>
                {party.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        {error && (
          <Alert
            variant="danger"
            className="small mb-0"
            id="parties-error"
            role="alert"
          >
            {error}
          </Alert>
        )}

        <p className="small text-muted mb-0">
          We will match you with someone who will cast your preferred vote in a
          different area where it could count for more. In return, you will cast
          their preferred vote in your area.
        </p>

        <div className="d-flex justify-content-end">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
          >
            Next: Sign Up
          </Button>
        </div>
      </div>
    </form>
  );
}
