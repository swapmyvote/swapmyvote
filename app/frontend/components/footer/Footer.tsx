import Container from "react-bootstrap/Container";

// Placeholder footer for the M0 spike; the full footer (links to
// faq/about/terms, social icons) is ported in M1/M9 as those pages land.
export function Footer() {
  return (
    <footer className="footer">
      <Container>
        <p className="small text-center mb-0">
          SwapMyVote — make your vote count. A Forward Democracy project.
        </p>
      </Container>
    </footer>
  );
}
