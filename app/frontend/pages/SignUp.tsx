import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import { useNavigate } from "react-router-dom";
import { RequireLoginsOpen } from "@/components/auth/RequireLoginsOpen";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useSession } from "@/contexts/useSession";
import { postAuthPath } from "@/lib/auth";
import type { SessionPayload } from "@/types/api";

/**
 * Ports app/views/devise/registrations/new.html.erb.
 *
 * A new account arrives with whatever the entry form stashed — the API applies
 * it server-side — so where it goes next depends on whether that stash
 * included a constituency.
 */
export function SignUp() {
  const { refetchSession } = useSession();
  const navigate = useNavigate();

  async function handleSignedUp(session: SessionPayload) {
    await refetchSession();
    navigate(postAuthPath(session));
  }

  return (
    <RequireLoginsOpen>
      <Container className="container-narrow py-4">
        <Card>
          <Card.Header>
            <h1 className="h4 mb-0">Sign up</h1>
          </Card.Header>
          <Card.Body>
            <SignUpForm onSignedUp={handleSignedUp} />
          </Card.Body>
        </Card>
      </Container>
    </RequireLoginsOpen>
  );
}
