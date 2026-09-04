import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { ConstituencyForm } from "@/components/profile/ConstituencyForm";
import { useSession } from "@/contexts/useSession";
import { useConstituencies, useParties } from "@/lib/referenceData";

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
  const parties = useParties();

  async function handleSaved() {
    await refetchSession();
    window.location.assign(hamlSwap);
  }

  const loading = constituencies.isPending || parties.isPending;
  const currentUser = session?.currentUser;
  // A visitor who skipped the entry form (straight to /app/signup) reaches
  // this screen with neither party set — see ConstituencyForm's needsParties.
  const needsParties =
    !currentUser?.preferredParty || !currentUser?.willingParty;

  return (
    <RequireLogin>
      <Container className="container-narrow py-4">
        <Card>
          <Card.Header>
            <h1 className="h4 mb-0">Where do you vote?</h1>
          </Card.Header>
          <Card.Body>
            {loading ? (
              <div className="text-center">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading</span>
                </Spinner>
              </div>
            ) : (
              <ConstituencyForm
                constituencies={constituencies.data ?? []}
                initialOnsId={currentUser?.constituencyOnsId ?? ""}
                needsEmail={!currentUser?.email}
                initialEmail={currentUser?.email ?? ""}
                parties={parties.data ?? []}
                needsParties={needsParties}
                initialPreferredPartyId={
                  currentUser?.preferredParty
                    ? String(currentUser.preferredParty.id)
                    : ""
                }
                initialWillingPartyId={
                  currentUser?.willingParty
                    ? String(currentUser.willingParty.id)
                    : ""
                }
                onSaved={handleSaved}
              />
            )}
          </Card.Body>
        </Card>
      </Container>
    </RequireLogin>
  );
}
