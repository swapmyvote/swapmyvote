import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { spaPaths } from "@/lib/spaPaths";
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

  // No RequireLogin: DELETE /api/v1/user signs the session out as part of
  // destroying the account, so by the time anyone lands here they are, by
  // design, signed out. A guard would bounce them straight off the one screen
  // that tells them the deletion worked — so this renders the destinations it
  // must not go to, and proves it stays put.
  it("does not redirect a signed-out visitor away from the confirmation", () => {
    render(
      <TestSessionProvider value={sessionValue()}>
        <MemoryRouter initialEntries={[spaPaths.accountDeleted]}>
          <Routes>
            <Route
              path={spaPaths.accountDeleted}
              element={<AccountDeleted />}
            />
            <Route path={spaPaths.login} element={<p>Log in</p>} />
            <Route path={spaPaths.profile} element={<p>Profile</p>} />
          </Routes>
        </MemoryRouter>
      </TestSessionProvider>,
    );

    expect(screen.getByText(/Your account is now deleted/)).toBeInTheDocument();
    expect(screen.queryByText("Log in")).not.toBeInTheDocument();
    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
  });
});
