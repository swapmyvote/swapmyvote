import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { ProfileReview } from "@/components/profile/ProfileReview";
import { useSession } from "@/contexts/useSession";
import { useConstituencyDetail } from "@/lib/profile";

/**
 * Ports app/views/users/review.haml — shown after a save that changed the
 * offered vote.
 */
export function Review() {
  const { session } = useSession();
  const user = session?.currentUser ?? null;
  const constituency = useConstituencyDetail(user?.constituencyOnsId ?? null);

  return (
    <RequireLogin>
      <Container className="container-narrow py-4">
        <Card>
          <Card.Header>
            <h1 className="h4 mb-0">Your offered vote</h1>
          </Card.Header>
          <Card.Body>
            {constituency.isPending && user?.constituencyOnsId ? (
              <div className="text-center">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading</span>
                </Spinner>
              </div>
            ) : (
              <ProfileReview
                constituencyName={user?.constituencyName ?? null}
                polls={constituency.data?.polls ?? []}
                willingParty={user?.willingParty ?? null}
              />
            )}
          </Card.Body>
        </Card>
      </Container>
    </RequireLogin>
  );
}
