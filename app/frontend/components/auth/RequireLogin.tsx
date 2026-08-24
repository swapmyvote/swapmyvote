import type { ReactNode } from "react";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { useSession } from "@/contexts/useSession";

// Devise's sign-in page is still HAML, so this is a full-page link out of the
// SPA rather than a react-router route. It becomes an in-app route in M5.
const hamlSignIn = "/users/sign_in";

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
          <Alert.Link href={hamlSignIn}>Log in</Alert.Link>
        </Alert>
      </Container>
    );
  }

  return <>{children}</>;
}
