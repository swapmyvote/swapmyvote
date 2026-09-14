import Container from "react-bootstrap/Container";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { RequireSwappingOpen } from "@/components/auth/RequireSwappingOpen";
import { SocialShare } from "@/components/share/SocialShare";
import { spaPaths } from "@/lib/spaPaths";

/**
 * Ports app/views/user/share/show.html.haml, including
 * User::ShareController's `require_swapping_open` and `require_login`.
 *
 * Nothing in the legacy site links to /user/share — no view, helper or
 * controller references `user_share_path` — so this ports a screen that has
 * been dark. It is ported anyway so cutover stays a like-for-like flip;
 * whether to delete it is an M9 question.
 */
export function Share() {
  return (
    <RequireLogin>
      <RequireSwappingOpen>
        <Container className="container-narrow py-4">
          <p className="text-center">
            <FaMagnifyingGlass aria-hidden="true" className="me-2" />
            Thanks! We're looking for someone for you to swap with.
          </p>

          <p className="text-center">
            Would you like to share Swap My Vote before we continue? This will
            help us to find more people that you could swap your vote with.
          </p>

          <SocialShare />

          <p className="text-center small mt-3">
            <Link to={spaPaths.dashboard}>No Thanks, Skip &raquo;</Link>
          </p>
        </Container>
      </RequireSwappingOpen>
    </RequireLogin>
  );
}
