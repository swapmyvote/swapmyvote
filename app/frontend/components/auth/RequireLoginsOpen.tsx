import type { ReactNode } from "react";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import { useAppMode } from "@/contexts/useAppMode";

/**
 * Shows its children only while logins are open, mirroring
 * `require_logins_open`. UX only: both auth endpoints check `logins_open?`
 * themselves, so a client that skipped this would gain nothing.
 *
 * Logins are closed only during closed-warm-up, when the database is expected
 * to be empty and there is nothing worth signing up for yet.
 */
export function RequireLoginsOpen({ children }: { children: ReactNode }) {
  const { loginsOpen } = useAppMode();

  if (!loginsOpen) {
    return (
      <Container className="container-narrow py-5">
        <Alert variant="warning" role="alert" className="mb-0">
          We are not open for sign-ups or logins just yet — please check back
          nearer the election
        </Alert>
      </Container>
    );
  }

  return <>{children}</>;
}
