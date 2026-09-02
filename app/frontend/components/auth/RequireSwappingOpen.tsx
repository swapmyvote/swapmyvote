import type { ReactNode } from "react";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import { useAppMode } from "@/contexts/useAppMode";

/**
 * UX only — `require_swapping_open!` enforces this server-side.
 *
 * Swapping is closed in any mode whose name does not contain "open":
 * `closed-warm-up`, `closed-and-voting` and `closed-wind-down`, per
 * `AppModeConcern#swapping_open?`.
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
