import { useState } from "react";
import Container from "react-bootstrap/Container";
import Dropdown from "react-bootstrap/Dropdown";
import Navbar from "react-bootstrap/Navbar";
import { Link } from "react-router-dom";
import logoNav from "@/assets/images/logo_nav.png";
import logoNav2x from "@/assets/images/logo_nav@2x.png";
import { useAppMode } from "@/contexts/useAppMode";
import { useSession } from "@/contexts/useSession";
import { spaPaths } from "@/lib/spaPaths";
import styles from "./Navigation.module.scss";

// Paths still served by the legacy HAML site. Crossing the SPA→HAML boundary
// needs a real page load, so these are plain `href`s, never react-router
// <Link>s. Each becomes a <Link> as its screen is ported.
const hamlHome = "/";
const hamlEditProfile = "/user/edit";

// Branded top bar. Matches the legacy site's look for now: the pink SwapMyVote
// wordmark + icon (logo_nav) on a near-white bar with a subtle bottom border —
// deliberately NOT the tacticalvote black bar, so the SPA doesn't diverge from
// the live site during migration.
//
// Auth and phase state come from the session payload: a menu under the logged-in
// user's avatar, or a log in link — and nothing at all while logins are closed
// (closed-warm-up), mirroring the legacy _current_user / _login partials and
// `require_logins_open`.
//
// Log out lives in that menu rather than sitting in the bar as the legacy
// _current_user partial has it. Two reasons: it is a destructive action and does
// not belong one stray click from the logo, and as a bare link it inherited
// whichever stylesheet the page had loaded — Bootstrap 5's underlined `.btn-link`
// here, the legacy `.stealth-link` there — so the same control looked different
// depending on where you saw it. A menu item is styled by the menu.
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
    window.location.assign(hamlHome);
  }

  return (
    <div className="sticky-top">
      <Navbar bg="white" expand="md" className="py-2 border-bottom">
        <Container fluid className="px-3">
          <Navbar.Brand href={hamlHome}>
            <img
              src={logoNav}
              srcSet={`${logoNav} 1x, ${logoNav2x} 2x`}
              alt="SwapMyVote"
              height={32}
              width={173}
            />
          </Navbar.Brand>

          {currentUser ? (
            <Dropdown align="end">
              {/* The avatar is decorative — the name beside it is the toggle's
                  accessible label, so the alt stays empty rather than repeating
                  it. `variant="link"` for a button that reads as the user's
                  name, with what that variant brings turned back off: the
                  underline, the link colour, the bold globals.scss puts on
                  every .btn-link, and the Rubik stack $btn-font-family puts on
                  every button (see the module — Rubik ships Bold only here, so
                  fw-normal on its own would still render bold). A name is not
                  emphasis. */}
              <Dropdown.Toggle
                variant="link"
                id="user-menu"
                className={`d-flex align-items-center gap-2 p-0 text-body text-decoration-none fw-normal ${styles.userMenuToggle}`}
              >
                <img
                  src={currentUser.imageUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-circle"
                />
                <span>{currentUser.name}</span>
              </Dropdown.Toggle>

              <Dropdown.Menu>
                {/* Still legacy HAML (M6 owns the mobile number this page also
                    carries), so a real page load. */}
                <Dropdown.Item href={hamlEditProfile}>
                  Edit profile
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item
                  as="button"
                  onClick={handleLogOut}
                  disabled={loggingOut}
                >
                  Log out
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            loginsOpen && (
              <Link to={spaPaths.login} className="small">
                Already been here? Log in
              </Link>
            )
          )}
        </Container>
      </Navbar>
    </div>
  );
}
