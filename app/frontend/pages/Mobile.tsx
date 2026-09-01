import { useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import { Link } from "react-router-dom";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { RequireSwappingOpen } from "@/components/auth/RequireSwappingOpen";
import { MobileVerification } from "@/components/mobile/MobileVerification";
import { useSession } from "@/contexts/useSession";
import { spaPaths } from "@/lib/spaPaths";

/**
 * Ports app/views/mobile_phone/verify_create.html.haml and verify_token.html.haml,
 * plus the number field those two screens depend on
 * (app/views/mobile_phone/_form.html.haml). The legacy split across three
 * pages exists only because the number lives on the profile form; here it is
 * one screen.
 *
 * The success card sends the user on to /app/profile. The legacy card sends
 * them to the dashboard, which is M7 and unported — swap the destination when
 * it lands.
 */
export function Mobile() {
  const { session, refetchSession } = useSession();
  const [justVerified, setJustVerified] = useState(false);
  const [changing, setChanging] = useState(false);

  const user = session?.currentUser ?? null;
  const verified = user?.mobileVerified ?? false;

  async function handleVerified() {
    try {
      await refetchSession();
    } catch {
      // The confirm already succeeded server-side — the code was right, and
      // MobileVerification's handleCodeSubmit calls this without awaiting
      // it, deliberately leaving its own busy flag true on the assumption
      // that this resolves. A failed refetch here must not leave that form
      // frozen until the 60-second session poll happens to heal the cache;
      // showing the success card is correct even though this render still
      // has the pre-verification session in hand.
    }
    setChanging(false);
    setJustVerified(true);
  }

  const showForm = !verified || changing;

  return (
    <RequireLogin>
      <RequireSwappingOpen>
        <Container className="container-narrow py-4">
          <Card>
            <Card.Header>
              <h1 className="h4 mb-0">
                {verified && !changing
                  ? "Mobile number verified"
                  : "Verify your mobile number"}
              </h1>
            </Card.Header>
            <Card.Body>
              {showForm ? (
                <MobileVerification
                  initialNumber={changing ? "" : (user?.mobileNumber ?? "")}
                  onVerified={handleVerified}
                />
              ) : (
                <div className="d-flex flex-column gap-3">
                  <p className="mb-0">
                    {justVerified
                      ? "Thank you for verifying your mobile phone number"
                      : "Your mobile phone number has already been verified"}
                  </p>
                  <div className="d-flex gap-2">
                    <Link to={spaPaths.profile} className="btn btn-primary">
                      Continue
                    </Link>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={() => {
                        setJustVerified(false);
                        setChanging(true);
                      }}
                    >
                      Use a different number
                    </Button>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Container>
      </RequireSwappingOpen>
    </RequireLogin>
  );
}
