import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { ConstituencyForm } from "@/components/profile/ConstituencyForm";
import { useSession } from "@/contexts/useSession";
import { useConstituencies } from "@/lib/referenceData";

// Where the legacy controller sends people once their constituency is saved.
// Still HAML until M7, so this is a full page load.
const hamlSwap = "/user/swap";

/**
 * Ports app/views/user/constituencies/edit.html.haml — the screen a new
 * account lands on when it has no constituency yet.
 */
export function Constituency() {
  const { session, refetchSession } = useSession();
  const constituencies = useConstituencies();

  async function handleSaved() {
    await refetchSession();
    window.location.assign(hamlSwap);
  }

  return (
    <RequireLogin>
      <Container className="container-narrow py-4">
        <Card>
          <Card.Header>
            <h1 className="h4 mb-0">Where do you vote?</h1>
          </Card.Header>
          <Card.Body>
            {constituencies.isPending ? (
              <div className="text-center">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading</span>
                </Spinner>
              </div>
            ) : (
              <ConstituencyForm
                constituencies={constituencies.data ?? []}
                initialOnsId={session?.currentUser?.constituencyOnsId ?? ""}
                needsEmail={!session?.currentUser?.email}
                initialEmail={session?.currentUser?.email ?? ""}
                onSaved={handleSaved}
              />
            )}
          </Card.Body>
        </Card>
      </Container>
    </RequireLogin>
  );
}
