import { useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import { Link, useLocation } from "react-router-dom";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { RequireSwappingOpen } from "@/components/auth/RequireSwappingOpen";
import { MobileVerification } from "@/components/mobile/MobileVerification";
import { useSession } from "@/contexts/useSession";
import { spaPaths } from "@/lib/spaPaths";

/** Set by the profile screen's "Change your mobile number" link: the user has
 *  already said what they want, so the already-verified card would only ask
 *  again. */
export interface MobileLocationState {
  changeNumber?: boolean;
}

export function Mobile() {
  const { session, refetchSession } = useSession();
  const location = useLocation();
  const [justVerified, setJustVerified] = useState(false);
  const [changing, setChanging] = useState(
    Boolean((location.state as MobileLocationState | null)?.changeNumber),
  );

  const user = session?.currentUser ?? null;
  const verified = user?.mobileVerified ?? false;

  async function handleVerified() {
    // No try/catch: `refetchSession` is react-query's `refetch()` and nothing
    // sets `throwOnError`, so a failure resolves rather than rejecting. The
    // confirm has already succeeded server-side either way — see `showForm`
    // for what carries the success when this does not land.
    await refetchSession();
    setChanging(false);
    setJustVerified(true);
  }

  // `justVerified`, not just `verified`: a failed refetch leaves `verified`
  // false, and without this the page would flip back to the form and
  // re-render MobileVerification with the `busy` it still holds from the
  // confirm — a frozen button until the session poll heals the cache.
  const showForm = (!verified && !justVerified) || changing;

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
                  {/* Default action rightmost, as ProfileReview's
                      Change/Proceed pair also does. DOM order is visual order,
                      so keyboard users meet them in the same sequence. */}
                  <div className="d-flex justify-content-end gap-2">
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
                    {/* /app/profile only because the dashboard the legacy
                        card sends people to is M7 and unported. */}
                    <Link to={spaPaths.profile} className="btn btn-primary">
                      Continue
                    </Link>
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
