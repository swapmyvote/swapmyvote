import { useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [justVerified, setJustVerified] = useState(false);
  const [changing, setChanging] = useState(false);

  const user = session?.currentUser ?? null;
  const verified = user?.mobileVerified ?? false;

  async function handleVerified() {
    await refetchSession();
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
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => navigate(spaPaths.profile)}
                    >
                      Continue
                    </Button>
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
