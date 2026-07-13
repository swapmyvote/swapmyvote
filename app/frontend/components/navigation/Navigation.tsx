import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";
import { Link } from "react-router-dom";

// Minimal branded top bar for the M0 spike. Auth/phase-aware state
// (logged-in menu vs login links) arrives in M2 once the session endpoint
// exists. Kept as a react-bootstrap Navbar to match tacticalvote.
export function Navigation() {
  return (
    <div className="sticky-top">
      <Navbar bg="black" variant="dark" expand="md" className="py-2">
        <Container fluid className="px-2">
          <Navbar.Brand as={Link} to="/" className="brand-text fw-bold">
            SwapMyVote
          </Navbar.Brand>
        </Container>
      </Navbar>
    </div>
  );
}
