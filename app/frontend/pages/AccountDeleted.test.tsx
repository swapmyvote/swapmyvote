import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountDeleted } from "@/pages/AccountDeleted";
import { sessionValue, TestSessionProvider } from "@/test/sessionFixtures";

describe("AccountDeleted", () => {
  it("renders the confirmation sentence, verbatim from the legacy view", () => {
    render(
      <TestSessionProvider value={sessionValue()}>
        <AccountDeleted />
      </TestSessionProvider>,
    );

    expect(
      screen.getByText(
        "Your account is now deleted, and your details have been removed from our system.",
      ),
    ).toBeInTheDocument();
  });

  // No RequireLogin: by the time anyone sees this screen they are, by
  // design, signed out.
  it("renders for a logged-out session without redirecting", () => {
    render(
      <TestSessionProvider value={sessionValue()}>
        <AccountDeleted />
      </TestSessionProvider>,
    );

    expect(screen.getByText(/Your account is now deleted/)).toBeInTheDocument();
  });
});
