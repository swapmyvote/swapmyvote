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
 * enabled for a logged-in user who does not already have a swap; anyone else
 * would trigger match generation they cannot use, or a 409.
 */
export function Swap() {
  const { session } = useSession();
  const loggedIn = session?.currentUser != null;
  const swapped = session?.swap != null;
  const candidates = usePotentialSwaps(loggedIn && !swapped);

  if (swapped) {
    return <Navigate to={spaPaths.dashboard} replace />;
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
