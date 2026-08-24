import { type FormEvent, useId, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { ConstituencyAutocomplete } from "@/components/home/ConstituencyAutocomplete";
import { PostcodeLookup } from "@/components/home/PostcodeLookup";
import { apiErrorMessages, updateProfile } from "@/lib/profile";
import type { Constituency } from "@/types/api";

interface ConstituencyFormProps {
  constituencies: Constituency[];
  initialOnsId: string;
  /** The legacy screen asks for an email only when the account has none. */
  needsEmail: boolean;
  initialEmail: string;
  onSaved: () => void;
}

const constituencyRequired =
  "You must tell us your constituency. Without it, the swaps we offer may not make sense.";

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
  onSaved,
}: ConstituencyFormProps) {
  const emailId = useId();
  const [onsId, setOnsId] = useState(initialOnsId);
  const [postcode, setPostcode] = useState("");
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (onsId === "") {
      setErrors([constituencyRequired]);
      return;
    }

    setSaving(true);
    setErrors([]);
    try {
      await updateProfile({
        constituencyOnsId: onsId,
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

        {errors.length > 0 && (
          <Alert variant="danger" className="small mb-0" role="alert">
            {errors.map((message, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a static list rendered once per save; message text is not unique, so the index is the only stable key.
              <p key={index} className="mb-0">
                {message}
              </p>
            ))}
          </Alert>
        )}

        <div className="d-flex justify-content-end">
          <Button type="submit" variant="primary" disabled={saving}>
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
