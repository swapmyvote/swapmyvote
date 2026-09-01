import { type FormEvent, useId, useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { Link } from "react-router-dom";
import { FormErrors } from "@/components/forms/FormErrors";
import { apiErrorMessages } from "@/lib/apiErrors";
import { logIn } from "@/lib/auth";
import { spaPaths } from "@/lib/spaPaths";
import type { SessionPayload } from "@/types/api";

interface LoginFormProps {
  onLoggedIn: (session: SessionPayload) => void;
}

// Password reset is still Devise HAML (see the M5 design), so this crosses the
// SPA boundary and needs a real page load.
const hamlForgottenPassword = "/users/password/new";

/**
 * Ports app/views/devise/sessions/new.html.erb — email, password, and the two
 * ways off the page the legacy view offers: password reset and sign-up.
 * Password reset is still Devise HAML, so it is a full-page anchor; sign-up
 * has been ported, so it is a router <Link>.
 */
export function LoginForm({ onLoggedIn }: LoginFormProps) {
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);
    try {
      const session = await logIn({ email, password });
      // Deliberately still submitting: the caller navigates away, and leaving
      // the button live would invite a second login on the way out.
      onLoggedIn(session);
    } catch (error) {
      setErrors(apiErrorMessages(error));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="d-flex flex-column gap-3">
        <Form.Group controlId={emailId}>
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Form.Group>

        <Form.Group controlId={passwordId}>
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Form.Group>

        <FormErrors messages={errors} />

        <Button type="submit" variant="primary" disabled={submitting}>
          Log in
        </Button>

        <p className="small subdued mb-0">
          <a href={hamlForgottenPassword}>Forgotten password?</a>
        </p>

        <p className="small subdued mb-0">
          Or need to <Link to={spaPaths.signup}>sign up</Link>?
        </p>
      </div>
    </form>
  );
}
