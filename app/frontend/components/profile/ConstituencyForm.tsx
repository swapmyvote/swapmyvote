import { type FormEvent, useId, useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { FormErrors } from "@/components/forms/FormErrors";
import { ConstituencyAutocomplete } from "@/components/home/ConstituencyAutocomplete";
import { PostcodeLookup } from "@/components/home/PostcodeLookup";
import { apiErrorMessages } from "@/lib/apiErrors";
import { updateProfile } from "@/lib/profile";
import type { Constituency, Party } from "@/types/api";

interface ConstituencyFormProps {
  constituencies: Constituency[];
  initialOnsId: string;
  /** The legacy screen asks for an email only when the account has none. */
  needsEmail: boolean;
  initialEmail: string;
  parties: Party[];
  /** A visitor who skipped the entry form (going straight to /app/signup)
   *  reaches this screen with no parties at all. The API refuses to save
   *  anything until both are set, so this screen has to be able to collect
   *  them itself — mirrors needsEmail. */
  needsParties: boolean;
  initialPreferredPartyId: string;
  initialWillingPartyId: string;
  onSaved: () => void;
}

const constituencyRequired =
  "You must tell us your constituency. Without it, the swaps we offer may not make sense.";

// Wording copied verbatim from Api::V1::UsersController#missing_field_errors
// so both sites say the same thing.
const preferredPartyRequired =
  "You must state which party you would prefer to vote for.";
const willingPartyRequired =
  "You must state which party you are willing to vote for.";

/**
 * Where a new account says which constituency it votes in. Ports
 * app/views/user/constituencies/edit.html.haml, including its two ways of
 * answering (name or postcode) and the email field it shows only when the
 * account arrived without one — which OmniAuth sign-ups can.
 */
export function ConstituencyForm({
  constituencies,
  initialOnsId,
  needsEmail,
  initialEmail,
  parties,
  needsParties,
  initialPreferredPartyId,
  initialWillingPartyId,
  onSaved,
}: ConstituencyFormProps) {
  const preferredId = useId();
  const willingId = useId();
  const emailId = useId();
  const [onsId, setOnsId] = useState(initialOnsId);
  const [postcode, setPostcode] = useState("");
  const [preferredPartyId, setPreferredPartyId] = useState(
    initialPreferredPartyId,
  );
  const [willingPartyId, setWillingPartyId] = useState(initialWillingPartyId);
  const [email, setEmail] = useState(initialEmail);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function handleConstituencyPicked(picked: string) {
    setOnsId(picked);
    if (picked !== "") {
      // Same exclusivity the legacy widget kept: choosing a name clears the
      // postcode, so a stale one cannot look like the source of the answer.
      setPostcode("");
    }
  }

  function localErrors(): string[] {
    const messages: string[] = [];
    if (needsParties && preferredPartyId === "") {
      messages.push(preferredPartyRequired);
    }
    if (needsParties && willingPartyId === "") {
      messages.push(willingPartyRequired);
    }
    if (onsId === "") {
      messages.push(constituencyRequired);
    }
    return messages;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = localErrors();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors([]);
    try {
      await updateProfile({
        constituencyOnsId: onsId,
        ...(needsParties ? { preferredPartyId, willingPartyId } : {}),
        ...(needsEmail ? { email } : {}),
      });
      onSaved();
    } catch (error) {
      setErrors(apiErrorMessages(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="d-flex flex-column gap-3">
        <ConstituencyAutocomplete
          constituencies={constituencies}
          value={onsId}
          onChange={handleConstituencyPicked}
        />

        <PostcodeLookup
          constituencies={constituencies}
          postcode={postcode}
          onPostcodeChange={setPostcode}
          onConstituencyFound={setOnsId}
        />

        {needsParties && (
          <>
            <Form.Group controlId={preferredId}>
              <Form.Label>My preferred party is</Form.Label>
              <Form.Select
                value={preferredPartyId}
                onChange={(event) => setPreferredPartyId(event.target.value)}
              >
                <option value="">...</option>
                {parties.map((party) => (
                  <option key={party.id} value={String(party.id)}>
                    {party.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group controlId={willingId}>
              <Form.Label>but I'm willing to vote for</Form.Label>
              <Form.Select
                value={willingPartyId}
                onChange={(event) => setWillingPartyId(event.target.value)}
              >
                <option value="">...</option>
                {parties.map((party) => (
                  <option key={party.id} value={String(party.id)}>
                    {party.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </>
        )}

        {needsEmail && (
          <Form.Group controlId={emailId}>
            <Form.Label>My email address is</Form.Label>
            <Form.Control
              type="email"
              placeholder="me@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Form.Text className="subdued">
              We need your email address so we can tell you about your swap.
              Your details will stay private with us.
            </Form.Text>
          </Form.Group>
        )}

        <FormErrors messages={errors} />

        <div className="d-flex justify-content-end">
          <Button type="submit" variant="primary" disabled={saving}>
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
