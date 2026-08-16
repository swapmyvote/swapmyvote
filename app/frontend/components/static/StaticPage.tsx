import type { ReactNode } from "react";
import Container from "react-bootstrap/Container";

// Shared wrapper for the migrated static content pages. Adds vertical spacing
// so the page heading sits below the header rather than jammed against it (the
// `main` element already carries the bottom border from globals.scss). Keeps
// spacing consistent across About/Contact/Cookies/Terms in one place.
export function StaticPage({ children }: { children: ReactNode }) {
  return <Container className="py-4 py-md-5">{children}</Container>;
}
