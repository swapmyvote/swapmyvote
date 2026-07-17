import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";

// Minimal branded top bar for the M0 spike. Auth/phase-aware state
// (logged-in menu vs login links) arrives in M2 once the session endpoint
// exists. Kept as a react-bootstrap Navbar to match tacticalvote.
//
// The brand uses a plain `href` (full-page navigation), not a react-router
// <Link>: "/" is still served by the legacy HAML home controller, so this
// crosses the SPA→HAML boundary and must do a real page load. It becomes a
// <Link> once the home page is ported to React (M3).
export function Navigation() {
  return (
    <div className="sticky-top">
      <Navbar bg="black" variant="dark" expand="md" className="py-2">
        <Container fluid className="px-2">
          <Navbar.Brand href="/" className="brand-text fw-bold">
            SwapMyVote
          </Navbar.Brand>
        </Container>
      </Navbar>
    </div>
  );
}
