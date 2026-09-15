import { type FormEvent, useId, useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { RequireLoggedOut } from "@/components/auth/RequireLoggedOut";
import { FormErrors } from "@/components/forms/FormErrors";
import { ApiError } from "@/lib/apiClient";
import { apiErrorFields, apiErrorMessages } from "@/lib/apiErrors";
import { postAuthPath } from "@/lib/auth";
import { useResetPassword } from "@/lib/password";
import { spaPaths } from "@/lib/spaPaths";

const invalidLinkMessage =
  "That password reset link is invalid or has expired. Please request a new one.";

/**
 * Ports app/views/devise/passwords/edit.html.erb.
 *
 * Devise's mailer spells the token param `reset_password_token`, and the
 * mailer is never edited (see the M10 design doc), so that is the name this
 * reads. With no token — or once the API reports it as spent, unknown or
 * expired via `invalid_token` — this renders the same "link no longer works"
 * state rather than a form that cannot succeed.
 */
export function PasswordEdit() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("reset_password_token") ?? "";

  const passwordId = useId();
  const confirmationId = useId();

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const resetPassword = useResetPassword();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    resetPassword.mutate({ token, password, passwordConfirmation });
  }

  if (resetPassword.isSuccess) {
    // The user is now signed in — send them where login would have.
    return <Navigate to={postAuthPath(resetPassword.data)} replace />;
  }

  const invalidToken =
    token === "" ||
    (resetPassword.error instanceof ApiError &&
      resetPassword.error.code === "invalid_token");

  // Both empty until a failed submit — apiErrorMessages falls back to a
  // generic message for a non-ApiError, which null (no submit yet) is not.
  const fields = resetPassword.isError
    ? apiErrorFields(resetPassword.error)
    : {};
  const errorMessages = resetPassword.isError
    ? apiErrorMessages(resetPassword.error)
    : [];

  function fieldError(key: string): string | null {
    return fields[key]?.[0] ?? null;
  }

  return (
    <RequireLoggedOut>
      <Container className="container-narrow py-4">
        <Card>
          <Card.Header>
            <h1 className="h4 mb-0">Change your password</h1>
          </Card.Header>
          <Card.Body>
            {invalidToken ? (
              <>
                <p>{invalidLinkMessage}</p>
                <Link to={spaPaths.passwordNew}>Request a new reset link</Link>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="d-flex flex-column gap-3">
                  <Form.Group controlId={passwordId}>
                    <Form.Label>New password</Form.Label>
                    <Form.Control
                      type="password"
                      autoFocus
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
                    <Form.Label>Confirm new password</Form.Label>
                    <Form.Control
                      type="password"
                      autoComplete="new-password"
                      value={passwordConfirmation}
                      isInvalid={fieldError("password_confirmation") !== null}
                      onChange={(event) =>
                        setPasswordConfirmation(event.target.value)
                      }
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldError("password_confirmation")}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <FormErrors messages={errorMessages} />

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={resetPassword.isPending}
                  >
                    Change my password
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
