import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import { Link, Navigate } from "react-router-dom";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { ActionRow } from "@/components/forms/ActionRow";
import { FormErrors } from "@/components/forms/FormErrors";
import { useSession } from "@/contexts/useSession";
import { useDeleteAccount } from "@/lib/account";
import { apiErrorMessages } from "@/lib/apiErrors";
import { spaPaths } from "@/lib/spaPaths";

/**
 * Ports app/views/static_pages/confirm_account_deletion.html.haml.
 *
 * The legacy view was `link_to "Yes, delete my account", user_path, method:
 * :delete, style: "color: red"` — an inline-styled link. This is the whole
 * site's one irreversible action, so it gets a real destructive-action
 * treatment instead: a danger button, a way back out, and — mirroring the
 * server's `reject_when_voting_info_locked!` guard — disabled with an
 * explanation once voting is open and the swap is confirmed, rather than
 * letting the click round-trip into a 403.
 */
export function ConfirmAccountDeletion() {
  const { session } = useSession();
  const deleteAccount = useDeleteAccount();
  const locked = session?.flags.votingInfoLocked ?? false;

  // `replace`: Back must not return to a confirmation page for an account
  // that no longer exists.
  if (deleteAccount.isSuccess) {
    return <Navigate to={spaPaths.accountDeleted} replace />;
  }

  return (
    <RequireLogin>
      <Container className="container-narrow py-4">
        <p>
          Are you sure you want to delete your account? This will cancel any
          pending or confirmed swaps you have made.
        </p>

        {locked && (
          <Alert variant="warning" className="small">
            It's election day and your swap is confirmed, so your account is
            currently locked and can't be deleted.
          </Alert>
        )}

        {deleteAccount.isError && (
          <FormErrors messages={apiErrorMessages(deleteAccount.error)} />
        )}

        <ActionRow>
          <Link to={spaPaths.profile}>Cancel</Link>
          <Button
            variant="danger"
            disabled={locked || deleteAccount.isPending}
            onClick={() => {
              deleteAccount.mutate();
            }}
          >
            Yes, delete my account
          </Button>
        </ActionRow>
      </Container>
    </RequireLogin>
  );
}
