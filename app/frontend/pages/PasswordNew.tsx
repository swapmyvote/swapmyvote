import { type FormEvent, useId, useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import { RequireLoggedOut } from "@/components/auth/RequireLoggedOut";
import { FormErrors } from "@/components/forms/FormErrors";
import { apiErrorMessages } from "@/lib/apiErrors";
import { requestPasswordReset } from "@/lib/password";

/**
 * Ports app/views/devise/passwords/new.html.erb.
 *
 * The API always answers 202, registered address or not (see the M10 design
 * doc), so the confirmation below is worded conditionally — it must never
 * promise a caller that mail is on its way to an account that exists.
 */
export function PasswordNew() {
  const emailId = useId();

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (error) {
      setErrors(apiErrorMessages(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireLoggedOut>
      <Container className="container-narrow py-4">
        <Card>
          <Card.Header>
            <h1 className="h4 mb-0">Reset password</h1>
          </Card.Header>
          <Card.Body>
            {submitted ? (
              <p className="mb-0">
                If that address is registered, we've sent reset instructions to
                it. Please check your inbox, and your spam folder.
              </p>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="d-flex flex-column gap-3">
                  <Form.Group controlId={emailId}>
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      autoFocus
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </Form.Group>

                  <FormErrors messages={errors} />

                  <Button type="submit" variant="primary" disabled={submitting}>
                    Send reset instructions
                  </Button>
                </div>
              </form>
            )}
          </Card.Body>
        </Card>
      </Container>
    </RequireLoggedOut>
  );
}
