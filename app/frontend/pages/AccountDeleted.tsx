import Container from "react-bootstrap/Container";

/**
 * Ports app/views/static_pages/account_deleted.html.haml.
 *
 * No `RequireLogin`: `DELETE /api/v1/user` signs the session out as part of
 * destroying the account, so by the time anyone lands here they are, by
 * design, signed out — guarding this screen would bounce them straight off
 * it.
 */
export function AccountDeleted() {
  return (
    <Container className="container-narrow py-4">
      <p>
        Your account is now deleted, and your details have been removed from our
        system.
      </p>
    </Container>
  );
}
