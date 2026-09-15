import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { ClosedAndVoting } from "@/components/home/ClosedAndVoting";
import { ClosedWarmUp } from "@/components/home/ClosedWarmUp";
import { ClosedWindDown } from "@/components/home/ClosedWindDown";
import { OpenAndVoting } from "@/components/home/OpenAndVoting";
import { OpenPreElections } from "@/components/home/OpenPreElections";
import { Navigate } from "react-router-dom";
import { useAppMode } from "@/contexts/useAppMode";
import { useSession } from "@/contexts/useSession";
import {
  useConstituencies,
  useElection,
  useParties,
} from "@/lib/referenceData";
import { spaPaths } from "@/lib/spaPaths";

/**
 * The landing page. Ports app/views/home/index.html.haml, whose whole job is
 * choosing one of five screens from the operational phase:
 *
 *   swapping open  + voting open   -> open-and-voting
 *   swapping open                  -> open-pre-elections
 *   voting open                    -> closed-and-voting
 *   closed-warm-up                 -> warm up
 *   otherwise                      -> wind down
 *
 * The phase comes from the session payload, so the server stays the one place
 * those rules live.
 *
 * Mirrors HomeController's `redirect_to user_path if logged_in? &&
 * swapping_open?` too: the open screens are the logged-out entry form, so
 * rendering them for someone who has already answered shows an empty
 * constituency box and reads as though their answers were thrown away.
 */
export function Home() {
  const { session, isLoading } = useSession();
  const { appMode, swappingOpen, votingOpen, isLoaded } = useAppMode();
  const election = useElection();
  const constituencies = useConstituencies();
  const parties = useParties();

  const waiting =
    isLoading ||
    !isLoaded ||
    election.isPending ||
    constituencies.isPending ||
    parties.isPending;

  if (waiting) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading</span>
        </Spinner>
      </Container>
    );
  }

  if (!election.data || !constituencies.data || !parties.data) {
    return (
      <Container className="py-5 text-center">
        <p>Sorry, we couldn't load the page just now. Please try again.</p>
      </Container>
    );
  }

  const swapConfirmed = session?.swap?.confirmed ?? false;
  const loggedIn = session?.currentUser != null;

  if (loggedIn && swappingOpen) {
    return <Navigate to={spaPaths.dashboard} replace />;
  }

  if (swappingOpen) {
    return votingOpen ? (
      <OpenAndVoting
        election={election.data}
        constituencies={constituencies.data}
        parties={parties.data}
        swapConfirmed={swapConfirmed}
      />
    ) : (
      <OpenPreElections
        election={election.data}
        constituencies={constituencies.data}
        parties={parties.data}
      />
    );
  }

  if (votingOpen) {
    return (
      <ClosedAndVoting loggedIn={loggedIn} swapConfirmed={swapConfirmed} />
    );
  }

  return appMode === "closed-warm-up" ? (
    <ClosedWarmUp election={election.data} />
  ) : (
    <ClosedWindDown election={election.data} />
  );
}
