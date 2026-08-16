import { useState } from "react";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";
import logoNav from "@/assets/images/logo_nav.png";
import logoNav2x from "@/assets/images/logo_nav@2x.png";
import { useAppMode } from "@/contexts/useAppMode";
import { useSession } from "@/contexts/useSession";

// Paths still served by the legacy HAML site. Crossing the SPA→HAML boundary
// needs a real page load, so these are plain `href`s, never react-router
// <Link>s. Each becomes a <Link> as its screen is ported.
const HAML_HOME = "/";
const HAML_SIGN_IN = "/users/sign_in";
const HAML_EDIT_PROFILE = "/user/edit";

// Branded top bar. Matches the legacy site's look for now: the pink SwapMyVote
// wordmark + icon (logo_nav) on a near-white bar with a subtle bottom border —
// deliberately NOT the tacticalvote black bar, so the SPA doesn't diverge from
// the live site during migration.
//
// Auth and phase state come from the session payload: the logged-in user's
// avatar + name + log out, or a log in link — and nothing at all while logins
// are closed (closed-warm-up), mirroring the legacy _current_user / _login
// partials and `require_logins_open`.
export function Navigation() {
  const { session, logOut } = useSession();
  const { loginsOpen } = useAppMode();
  const [loggingOut, setLoggingOut] = useState(false);
  const currentUser = session?.currentUser ?? null;

  async function handleLogOut() {
    setLoggingOut(true);
    try {
      await logOut();
    } catch {
      // A failed log out (already logged out, expired CSRF token) is still
      // resolved by landing on the server-rendered home page, which re-reads
      // the real session.
    }
    // Home is still legacy HAML, so leave the SPA with a full page load.
    window.location.assign(HAML_HOME);
  }

  return (
    <div className="sticky-top">
      <Navbar bg="white" expand="md" className="py-2 border-bottom">
        <Container fluid className="px-3">
          <Navbar.Brand href={HAML_HOME}>
            <img
              src={logoNav}
              srcSet={`${logoNav} 1x, ${logoNav2x} 2x`}
              alt="SwapMyVote"
              height={32}
              width={173}
            />
          </Navbar.Brand>

          {currentUser ? (
            <div className="d-flex align-items-center gap-2">
              <a
                href={HAML_EDIT_PROFILE}
                className="d-flex align-items-center gap-2 text-decoration-none"
              >
                <img
                  src={currentUser.imageUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-circle"
                />
                <span>{currentUser.name}</span>
              </a>
              <Button
                variant="link"
                size="sm"
                className="p-0"
                onClick={handleLogOut}
                disabled={loggingOut}
              >
                Log out
              </Button>
            </div>
          ) : (
            loginsOpen && (
              <a href={HAML_SIGN_IN} className="small">
                Already been here? Log in
              </a>
            )
          )}
        </Container>
      </Navbar>
    </div>
  );
}
