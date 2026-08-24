import { type FormEvent, useId, useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { Link } from "react-router-dom";
import { FormErrors } from "@/components/forms/FormErrors";
import { apiErrorFields, apiErrorMessages } from "@/lib/apiErrors";
import { signUp } from "@/lib/auth";
import { forwardDemocracyPrivacyPolicyUrl } from "@/lib/externalLinks";
import { spaPaths } from "@/lib/spaPaths";
import type { SessionPayload } from "@/types/api";

interface SignUpFormProps {
  onSignedUp: (session: SessionPayload) => void;
}

// The FAQ is not ported (M2), so this stays a full-page link, as Footer.tsx
// and ProfileForm.tsx also do.
const hamlFaqTrust = "/faq#trust";

/**
 * Ports app/views/devise/registrations/new.html.erb.
 *
 * The constituency and party answers the entry form collected are not fields
 * here, and are not sent: the API reads them from the session stash, exactly
 * as the legacy Devise controller read its own.
 */
export function SignUpForm({ onSignedUp }: SignUpFormProps) {
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmationId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [consentNewsEmail, setConsentNewsEmail] = useState(false);
  const [consentToDataProcessing, setConsentToDataProcessing] = useState(false);
  const [swapReference, setSwapReference] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);
    setFields({});
    try {
      const session = await signUp({
        name,
        email,
        password,
        passwordConfirmation,
        consentNewsEmail,
        consentToDataProcessing,
        swapReference,
      });
      // Deliberately still submitting: the caller navigates away, and leaving
      // the button live would invite a second account on the way out.
      onSignedUp(session);
    } catch (error) {
      setErrors(apiErrorMessages(error));
      setFields(apiErrorFields(error));
      setSubmitting(false);
    }
  }

  function fieldError(key: string): string | null {
    return fields[key]?.[0] ?? null;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="d-flex flex-column gap-3">
        <Form.Group controlId={nameId}>
          <Form.Label>Your name</Form.Label>
          <Form.Control
            type="text"
            autoComplete="name"
            value={name}
            isInvalid={fieldError("name") !== null}
            onChange={(event) => setName(event.target.value)}
          />
          <Form.Control.Feedback type="invalid">
            {fieldError("name")}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId={emailId}>
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            autoComplete="email"
            value={email}
            isInvalid={fieldError("email") !== null}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Form.Control.Feedback type="invalid">
            {fieldError("email")}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId={passwordId}>
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            autoComplete="new-password"
            value={password}
            isInvalid={fieldError("password") !== null}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Form.Control.Feedback type="invalid">
            {fieldError("password")}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId={confirmationId}>
          <Form.Label>Confirm password</Form.Label>
          <Form.Control
            type="password"
            autoComplete="new-password"
            value={passwordConfirmation}
            isInvalid={fieldError("password_confirmation") !== null}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
          />
          <Form.Control.Feedback type="invalid">
            {fieldError("password_confirmation")}
          </Form.Control.Feedback>
        </Form.Group>

        <div className="d-flex flex-column gap-2">
          <Form.Check
            type="checkbox"
            id="consent-news-email"
            label="Opt-in to Forward Democracy email updates"
            checked={consentNewsEmail}
            onChange={(event) => setConsentNewsEmail(event.target.checked)}
          />

          <div>
            <Form.Check
              type="checkbox"
              id="consent-to-data-processing"
              label="I consent to SwapMyVote processing my personal data"
              checked={consentToDataProcessing}
              isInvalid={fieldError("consent_to_data_processing") !== null}
              onChange={(event) =>
                setConsentToDataProcessing(event.target.checked)
              }
            />
            <p className="small subdued mt-1 mb-0">
              Once you confirm a swap, we will share your email address and
              voting preferences with your partner{" "}
              <a href={hamlFaqTrust} target="_blank" rel="noreferrer">
                so they know who you are
              </a>
              . We may send this information by email or text message.{" "}
              <a
                href={forwardDemocracyPrivacyPolicyUrl}
                target="_blank"
                rel="noreferrer"
              >
                Your details will stay private with us
              </a>
              .
            </p>
          </div>
        </div>

        {/* The honeypot. Real people never see it, so anything in it came from
            a bot and the API refuses the sign-up. The name is deliberately
            meaningless: `nickname` is a standard HTML autocomplete token, so a
            password manager would happily fill it in and hand a real user a
            422 they can neither see nor clear. invisible_captcha randomises
            its own field name for the same reason. */}
        <input
          className="honeypot-field"
          type="text"
          name="swap_reference"
          value={swapReference}
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
          onChange={(event) => setSwapReference(event.target.value)}
        />

        <FormErrors messages={errors} />

        <Button type="submit" variant="primary" disabled={submitting}>
          Confirm and see swaps
        </Button>

        <p className="small subdued mb-0">
          Already have an account? <Link to={spaPaths.login}>Log in</Link>
        </p>
      </div>
    </form>
  );
}
