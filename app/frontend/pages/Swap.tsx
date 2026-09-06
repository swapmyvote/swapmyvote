import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { Navigate } from "react-router-dom";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { RequireSwappingOpen } from "@/components/auth/RequireSwappingOpen";
import { InfoSummary } from "@/components/profile/InfoSummary";
import { PotentialSwapList } from "@/components/swap/PotentialSwapList";
import { SearchingForSwap } from "@/components/swap/SearchingForSwap";
import { useSession } from "@/contexts/useSession";
import { spaPaths } from "@/lib/spaPaths";
import { usePotentialSwaps } from "@/lib/swap";

/**
 * Ports app/views/user/swaps/show.html.haml — the find-a-swap screen.
 *
 * Fetching the candidate list *generates* it server-side, so the query is only
 * enabled for a logged-in user who does not already have a swap and has a
 * complete profile; anyone else would trigger match generation they cannot
 * use, a 409, or a 403 `profile_incomplete`.
 */
export function Swap() {
  const { session } = useSession();
  const user = session?.currentUser ?? null;
  const loggedIn = user != null;
  const swapped = session?.swap != null;
  // Mirrors User::SwapsController#assert_parties_exist: a profile missing
  // either party cannot swap, and is sent to fix that first. Guarded on
  // `user` (not just `loggedIn`) so this never fires while the session is
  // still loading — `user` is null until the session query resolves.
  const profileIncomplete =
    user != null && (!user.preferredParty || !user.willingParty);
  const candidates = usePotentialSwaps(
    loggedIn && !swapped && !profileIncomplete,
  );

  if (swapped) {
    return <Navigate to={spaPaths.dashboard} replace />;
  }

  if (profileIncomplete) {
    return <Navigate to={spaPaths.profile} replace />;
  }

  return (
    <RequireLogin>
      <RequireSwappingOpen>
        <Container className="container-narrow py-4">
          {candidates.isPending && (
            <div className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading</span>
              </Spinner>
            </div>
          )}

          {candidates.isError && (
            <Alert variant="warning" role="alert">
              We couldn't load your potential swaps just now. Please try again
              in a moment.
            </Alert>
          )}

          {candidates.data &&
            (candidates.data.potentialSwaps.length > 0 ? (
              <PotentialSwapList
                candidates={candidates.data.potentialSwaps}
                expiryMinutes={candidates.data.expiryMinutes}
              />
            ) : (
              <SearchingForSwap />
            ))}
        </Container>
        <InfoSummary />
      </RequireSwappingOpen>
    </RequireLogin>
  );
}
