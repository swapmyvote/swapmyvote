import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RequireLoginsOpen } from "@/components/auth/RequireLoginsOpen";
import {
  sessionPayload,
  sessionValue,
  TestSessionProvider,
} from "@/test/sessionFixtures";

function renderGuard(loginsOpen: boolean) {
  render(
    <TestSessionProvider
      value={sessionValue({
        session: sessionPayload({
          appMode: loginsOpen ? "open" : "closed-warm-up",
          flags: { loginsOpen },
        }),
      })}
    >
      <RequireLoginsOpen>
        <p>The form</p>
      </RequireLoginsOpen>
    </TestSessionProvider>,
  );
}

describe("RequireLoginsOpen", () => {
  it("shows its children while logins are open", () => {
    renderGuard(true);

    expect(screen.getByText("The form")).toBeInTheDocument();
  });

  it("replaces them with a notice while logins are closed", () => {
    renderGuard(false);

    expect(screen.queryByText("The form")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/not open/i);
  });
});
