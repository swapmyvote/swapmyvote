import Container from "react-bootstrap/Container";
import { Link } from "react-router-dom";
import { useAppMode } from "@/contexts/useAppMode";
import { useSession } from "@/contexts/useSession";
import { spaPaths } from "@/lib/spaPaths";

/**
 * Ports app/views/users/_info_summary.html.haml — the footer every swap screen
 * ends with, restating the offered vote and offering a way to change it.
 *
 * The edit link disappears once voting information is locked, mirroring the
 * partial's `unless voting_info_locked?`.
 */
export function InfoSummary() {
  const { session } = useSession();
  const { votingInfoLocked } = useAppMode();
  const user = session?.currentUser;

  if (!user) {
    return null;
  }

  return (
    <Container className="py-3">
      <p className="mb-1">
        Your preferred party is{" "}
        <strong>{user.preferredParty?.name ?? "?"}</strong> but you are willing
        to vote for <strong>{user.willingParty?.name ?? "?"}</strong>. You are
        in <strong>{user.constituencyName ?? "?"}</strong>.
      </p>
      {!votingInfoLocked && (
        <p className="small mb-0">
          <Link to={spaPaths.profile}>Not right? Update your info</Link>
        </p>
      )}
    </Container>
  );
}
