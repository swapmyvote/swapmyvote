import { type FormEvent, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { RequireSwappingOpen } from "@/components/auth/RequireSwappingOpen";
import { FormErrors } from "@/components/forms/FormErrors";
import { SwapProfileCard } from "@/components/swap/SwapProfileCard";
import { apiErrorMessages } from "@/lib/apiErrors";
import { useElection } from "@/lib/referenceData";
import { spaPaths } from "@/lib/spaPaths";
import {
  consentMessage,
  offerSwap,
  usePotentialSwap,
  useSwapMutation,
} from "@/lib/swap";

/**
 * Ports app/views/user/swaps/new.html.haml and User::SwapsController#create.
 *
 * The consent box is checked here as well as on the server, because the server
 * refusing is a wasted round trip for something the page already knows.
 */
export function SwapNew() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const candidate = usePotentialSwap(userId ? Number(userId) : null);
  const election = useElection();
  const hidePolls = election.data?.hidePolls ?? false;
  const mutation = useSwapMutation(offerSwap);
  const [consented, setConsented] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!consented) {
      setErrors([consentMessage]);
      return;
    }

    setErrors([]);
    try {
      await mutation.mutateAsync({
        userId: Number(userId),
        consentShareEmail: true,
      });
      navigate(spaPaths.dashboard);
    } catch (error) {
      setErrors(apiErrorMessages(error));
    }
  }

  return (
    <RequireLogin>
      <RequireSwappingOpen>
        <Container className="container-narrow py-4">
          {candidate.isPending && (
            <div className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading</span>
              </Spinner>
            </div>
          )}

          {candidate.isError && (
            <Alert variant="warning" role="alert">
              <p>
                That person is no longer available to swap with — matches are
                regenerated every couple of hours.
              </p>
              <Alert.Link as={Link} to={spaPaths.swap}>
                Find another swap
              </Alert.Link>
            </Alert>
          )}

          {candidate.data && (
            <div className="d-flex flex-column gap-3">
              <SwapProfileCard candidate={candidate.data} />

              {/* Ports _double_check_constituency, which new.html.haml renders
                  under the card. */}
              {!hidePolls && (
                <p className="small mb-0">
                  Poll results are based on averaged MRP predictions for the
                  next General Election.
                </p>
              )}

              <p className="mb-0">
                Are you sure you would like to swap your vote with{" "}
                {candidate.data.name}?
              </p>

              <Form
                onSubmit={handleSubmit}
                className="d-flex flex-column gap-3"
              >
                <FormErrors messages={errors} />

                <Form.Check
                  type="checkbox"
                  id="consent-share-email"
                  checked={consented}
                  onChange={(event) => setConsented(event.target.checked)}
                  label={`I understand that my email address will be shared with ${candidate.data.name} when the swap is confirmed`}
                />

                <div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={mutation.isPending}
                  >
                    Swap with {candidate.data.name}
                  </button>
                </div>
              </Form>

              <p className="small subdued mb-0">
                We'll send {candidate.data.name} a confirmation email, and if
                they agree, you're all good to go! Democracy here we come.
              </p>
            </div>
          )}
        </Container>
      </RequireSwappingOpen>
    </RequireLogin>
  );
}
