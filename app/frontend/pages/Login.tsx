import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { RequireLoggedOut } from "@/components/auth/RequireLoggedOut";
import { RequireLoginsOpen } from "@/components/auth/RequireLoginsOpen";
import { useSession } from "@/contexts/useSession";
import { postAuthPath } from "@/lib/auth";
import type { SessionPayload } from "@/types/api";

/**
 * Ports app/views/devise/sessions/new.html.erb. The legacy page is a Devise
 * template rendered by Users::SessionsController; this one posts to
 * POST /api/v1/session and stays inside the SPA.
 */
export function Login() {
  const { refetchSession } = useSession();
  const navigate = useNavigate();

  async function handleLoggedIn(session: SessionPayload) {
    // The endpoint answered with the logged-in payload, but the rest of the
    // SPA reads the session through react-query — refetch so the nav bar and
    // every guard see the new user too.
    await refetchSession();
    navigate(postAuthPath(session));
  }

  return (
    <RequireLoggedOut>
      <RequireLoginsOpen>
        <Container className="container-narrow py-4">
          <Card>
            <Card.Header>
              <h1 className="h4 mb-0">Log in with email</h1>
            </Card.Header>
            <Card.Body>
              <LoginForm onLoggedIn={handleLoggedIn} />
            </Card.Body>
          </Card>
        </Container>
      </RequireLoginsOpen>
    </RequireLoggedOut>
  );
}
