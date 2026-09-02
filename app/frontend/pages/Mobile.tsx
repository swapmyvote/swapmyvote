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
/** Set by the profile screen's "Change your mobile number" link. Arriving
 *  with it means the user has already said what they want, so the
 *  already-verified card would be a step asking them to say it again. */
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
    // The confirm already succeeded server-side — the code was right — so
    // this refetch is purely to pick up the new `mobileVerified` flag for
    // the rest of the app. If it fails, `session` keeps holding the
    // pre-verification payload and `verified` (derived from it, below)
    // stays false; `justVerified` is what actually carries the success
    // across that gap, via `showForm`. There is nothing to catch here:
    // `refetchSession` is react-query's `refetch()`, and nothing in this
    // app sets `throwOnError`, so a failed refetch resolves with an error
    // result on the query rather than rejecting this await. The 60-second
    // session poll will retry regardless.
    await refetchSession();
    setChanging(false);
    setJustVerified(true);
  }

  // `justVerified` (not just `verified`) keeps the success card up even when
  // the post-confirm refetch above failed: without it, a failed refetch
  // would leave `verified` false and this would flip back to the form,
  // re-rendering MobileVerification in place with its `busy` state
  // preserved from the confirm that just succeeded — freezing the button
  // until the 60-second poll happens to heal the cache.
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
                  {/* Trailing edge, default action rightmost, as macOS puts
                      dialog buttons — and as ProfileReview's Change/Proceed
                      pair already does. DOM order is the visual order, so
                      keyboard and screen-reader users meet them in the same
                      sequence. */}
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
