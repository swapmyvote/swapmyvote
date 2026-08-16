import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";
import logoNav from "@/assets/images/logo_nav.png";
import logoNav2x from "@/assets/images/logo_nav@2x.png";

// Branded top bar. Matches the legacy site's look for now: the pink SwapMyVote
// wordmark + icon (logo_nav) on a near-white bar with a subtle bottom border —
// deliberately NOT the tacticalvote black bar, so the SPA doesn't diverge from
// the live site during migration. Auth/phase-aware state (logged-in menu vs
// login links) arrives in M2 once the session endpoint exists.
//
// The brand uses a plain `href` (full-page navigation), not a react-router
// <Link>: "/" is still served by the legacy HAML home controller, so this
// crosses the SPA→HAML boundary and must do a real page load. It becomes a
// <Link> once the home page is ported to React (M3).
export function Navigation() {
  return (
    <div className="sticky-top">
      <Navbar bg="white" expand="md" className="py-2 border-bottom">
        <Container fluid className="px-3">
          <Navbar.Brand href="/">
            <img
              src={logoNav}
              srcSet={`${logoNav} 1x, ${logoNav2x} 2x`}
              alt="SwapMyVote"
              height={32}
              width={173}
            />
          </Navbar.Brand>
        </Container>
      </Navbar>
    </div>
  );
}
