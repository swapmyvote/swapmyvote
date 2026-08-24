import { useState } from "react";
import Alert from "react-bootstrap/Alert";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { useNavigate } from "react-router-dom";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { useSession } from "@/contexts/useSession";
import { useConstituencies, useParties } from "@/lib/referenceData";
import { spaPaths } from "@/lib/spaPaths";
import type { ProfileUpdateResult } from "@/types/api";

/**
 * Ports app/views/users/edit.html.haml — "Not right? Update your info".
 *
 * A save that changes the willing party or the constituency sends the user to
 * the review screen, which is where the legacy controller sends them too.
 */
export function Profile() {
  const { session, refetchSession } = useSession();
  const parties = useParties();
  const constituencies = useConstituencies();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  async function handleSaved(result: ProfileUpdateResult) {
    await refetchSession();
    if (result.reviewRequired) {
      navigate(spaPaths.review);
      return;
    }
    setSaved(true);
  }

  const loading = parties.isPending || constituencies.isPending;

  return (
    <RequireLogin>
      <Container className="container-narrow py-4">
        <Card>
          <Card.Header>
            <h1 className="h4 mb-0">Edit profile</h1>
          </Card.Header>
          <Card.Body>
            {saved && (
              <Alert variant="success" className="small" role="status">
                Your profile has been saved
              </Alert>
            )}

            {loading || !session?.currentUser ? (
              <div className="text-center">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading</span>
                </Spinner>
              </div>
            ) : (
              <ProfileForm
                parties={parties.data ?? []}
                constituencies={constituencies.data ?? []}
                user={session.currentUser}
                locked={session.flags.votingInfoLocked}
                hasSwap={session.swap !== null}
                onSaved={handleSaved}
              />
            )}
          </Card.Body>
        </Card>
      </Container>
    </RequireLogin>
  );
}
