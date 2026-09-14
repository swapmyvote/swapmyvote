import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { Navigate } from "react-router-dom";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { SocialShare } from "@/components/share/SocialShare";
import { useSession } from "@/contexts/useSession";
import { spaPaths } from "@/lib/spaPaths";
import { useSwap } from "@/lib/swap";
import { useRecordVote } from "@/lib/vote";

/**
 * Ports app/views/user/vote/show.html.haml and User::VoteController.
 *
 * The legacy `require_swap` guard tests `swapped?` — any swap — and the view
 * then prints the partner's real name. This requires a *confirmed* swap
 * instead, the client mirror of require_confirmed_swap!: it is the only state
 * the screen is reachable in (shared/_go_vote links here only when
 * `swap_confirmed?`), and it is the state in which the server will disclose
 * the partner's name at all.
 */
export function Vote() {
  const { session } = useSession();
  const user = session?.currentUser ?? null;
  const swap = useSwap(user !== null);
  const recordVote = useRecordVote();

  // Guarded on isPending for the same reason Dashboard is: a user with a
  // perfectly good swap must not be bounced while the poll is still loading.
  if (user && !swap.isPending && !swap.data?.confirmed) {
    return <Navigate to={spaPaths.dashboard} replace />;
  }

  const partnerName = swap.data?.partner?.name ?? "your swap partner";
  const partyName = user?.willingParty?.name ?? "";

  return (
    <RequireLogin>
      <Container className="container-narrow py-4">
        {swap.isPending && (
          <div className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading</span>
            </Spinner>
          </div>
        )}

        {swap.data?.confirmed && !user?.hasVoted && (
          <>
            <p className="text-center">
              Please let us know when you've voted...
            </p>
            <p className="text-center">
              <Button
                variant="primary"
                disabled={recordVote.isPending}
                onClick={() => {
                  recordVote.mutate();
                }}
              >
                Yes, I've voted! (for {partyName})
              </Button>
            </p>
            <p className="text-center subdued">
              We'll email your swap partner, {partnerName}, and let them know
              that you've voted <strong>{partyName}</strong> for them.
            </p>
          </>
        )}

        {swap.data?.confirmed && user?.hasVoted && (
          <>
            <p className="text-center">
              Thanks! We've emailed {partnerName} to let them know that you've
              voted <strong>{partyName}</strong> for them.
            </p>
            <SocialShare />
          </>
        )}
      </Container>
    </RequireLogin>
  );
}
