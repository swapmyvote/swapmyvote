import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RequireSwappingOpen } from "@/components/auth/RequireSwappingOpen";
import {
  sessionPayload,
  sessionValue,
  TestSessionProvider,
} from "@/test/sessionFixtures";

function renderGuard(swappingOpen: boolean) {
  render(
    <TestSessionProvider
      value={sessionValue({
        session: sessionPayload({
          appMode: swappingOpen ? "open" : "closed-wind-down",
          flags: { swappingOpen },
        }),
      })}
    >
      <RequireSwappingOpen>
        <p>The form</p>
      </RequireSwappingOpen>
    </TestSessionProvider>,
  );
}

describe("RequireSwappingOpen", () => {
  it("shows its children while swapping is open", () => {
    renderGuard(true);

    expect(screen.getByText("The form")).toBeInTheDocument();
  });

  it("replaces them with a notice while swapping is closed", () => {
    renderGuard(false);

    expect(screen.queryByText("The form")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /not open for swapping/i,
    );
  });
});
