import type { ReactNode } from "react";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import { useAppMode } from "@/contexts/useAppMode";

/**
 * Shows its children only while swapping is open, mirroring
 * `require_swapping_open`. UX only: every endpoint behind these screens calls
 * `require_swapping_open!` itself, so a client that skipped this would gain
 * nothing.
 */
export function RequireSwappingOpen({ children }: { children: ReactNode }) {
  const { swappingOpen } = useAppMode();

  if (!swappingOpen) {
    return (
      <Container className="container-narrow py-5">
        <Alert variant="warning" role="alert" className="mb-0">
          We are not open for swapping at the moment
        </Alert>
      </Container>
    );
  }

  return <>{children}</>;
}
