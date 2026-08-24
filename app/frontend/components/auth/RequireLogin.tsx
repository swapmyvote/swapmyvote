import type { ReactNode } from "react";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { Link } from "react-router-dom";
import { useSession } from "@/contexts/useSession";
import { spaPaths } from "@/lib/spaPaths";

/**
 * Shows its children only to a logged-in user. UX only: every endpoint behind
 * these screens re-checks authentication itself, so a client that skipped this
 * would gain nothing.
 */
export function RequireLogin({ children }: { children: ReactNode }) {
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

  if (!session.currentUser) {
    return (
      <Container className="container-narrow py-5">
        <Alert variant="warning">
          <p>You need to be logged in to see this page</p>
          <Alert.Link as={Link} to={spaPaths.login}>
            Log in
          </Alert.Link>
        </Alert>
      </Container>
    );
  }

  return <>{children}</>;
}
