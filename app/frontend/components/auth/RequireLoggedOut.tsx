import type { ReactNode } from "react";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { Navigate } from "react-router-dom";
import { useSession } from "@/contexts/useSession";
import { postAuthPath } from "@/lib/auth";

/**
 * Shows its children only to someone who is not logged in, mirroring the
 * `require_no_authentication` Devise prepends to its own sessions and
 * registrations controllers.
 *
 * UX only: both auth endpoints refuse an authenticated caller themselves
 * (403 `already_authenticated`), so a client that skipped this would gain
 * nothing. Someone who is already logged in has no use for a login or sign-up
 * form, so they go straight on to where logging in would have landed them
 * rather than reading about the refusal.
 */
export function RequireLoggedOut({ children }: { children: ReactNode }) {
  const { session, isLoading } = useSession();

  if (isLoading || !session) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading</span>
        </Spinner>
      </Container>
    );
  }

  if (session.currentUser) {
    // `replace`, so Back does not land on the page we have just bounced them
    // off — it would only bounce them again.
    return <Navigate to={postAuthPath(session)} replace />;
  }

  return <>{children}</>;
}
