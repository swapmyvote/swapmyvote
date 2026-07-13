import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";

// Throwaway M0 page: proves Vite Ruby + React + Bootstrap 5 + the Rubik
// brand font + magenta primary all render inside the Rails-served SPA shell.
// Deleted once real pages (M1+) exist.
export function Ping() {
  return (
    <Container className="py-5 text-center">
      <h1 className="text-primary">Vite + React is live</h1>
      <p className="lead">
        Bootstrap 5, Rubik headings and the Movement Forward magenta are all
        wired up. This is a throwaway toolchain-spike page.
      </p>
      <Button variant="primary">A primary button</Button>
    </Container>
  );
}
