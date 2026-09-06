import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { Navigate } from "react-router-dom";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { RequireSwappingOpen } from "@/components/auth/RequireSwappingOpen";
import { InfoSummary } from "@/components/profile/InfoSummary";
import { ConfirmIncomingSwap } from "@/components/swap/ConfirmIncomingSwap";
import { ConfirmOutgoingSwap } from "@/components/swap/ConfirmOutgoingSwap";
import { SwapConfirmed } from "@/components/swap/SwapConfirmed";
import { useSession } from "@/contexts/useSession";
import { spaPaths } from "@/lib/spaPaths";
import { useSwap } from "@/lib/swap";

/**
 * Ports app/views/users/show.html.haml and the redirects in
 * UsersController#show.
 *
 * useSwap polls: a partner can confirm or reject while this page is open, and
 * Swap.cancel_old expires unconfirmed swaps on a schedule, so the state here
 * can change with no action from this user at all.
 */
export function Dashboard() {
  const { session } = useSession();
  const user = session?.currentUser ?? null;
  const swap = useSwap(user !== null);

  // Mirrors UsersController#show: a profile without a constituency or an email
  // address cannot swap, and is sent to fix that first.
  if (user && (!user.hasConstituency || !user.email)) {
    return <Navigate to={spaPaths.constituency} replace />;
  }

  // Mirrors `redirect_to user_swap_path unless @user.swapped?`. Guarded on
  // isPending so a user with a perfectly good swap is not bounced to the
  // find-a-swap screen while the polling query is still loading.
  if (user && !swap.isPending && swap.data == null) {
    return <Navigate to={spaPaths.swap} replace />;
  }

  return (
    <RequireLogin>
      <RequireSwappingOpen>
        <Container className="container-narrow py-4">
          {swap.isPending && (
            <div className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading</span>
              </Spinner>
            </div>
          )}

          {swap.isError && (
            <Alert variant="warning" role="alert">
              We couldn't load your swap just now. Please try again in a moment.
            </Alert>
          )}

          {user && swap.data?.confirmed && (
            <SwapConfirmed swap={swap.data} user={user} />
          )}
          {swap.data &&
            !swap.data.confirmed &&
            swap.data.state === "outgoing" && (
              <ConfirmOutgoingSwap swap={swap.data} />
            )}
          {swap.data &&
            !swap.data.confirmed &&
            swap.data.state === "incoming" && (
              <ConfirmIncomingSwap swap={swap.data} />
            )}
        </Container>
        <InfoSummary />
      </RequireSwappingOpen>
    </RequireLogin>
  );
}
