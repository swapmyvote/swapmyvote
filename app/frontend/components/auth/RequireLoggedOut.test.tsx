import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RequireLoggedOut } from "@/components/auth/RequireLoggedOut";
import { spaPaths } from "@/lib/spaPaths";
import {
  sessionPayload,
  sessionValue,
  testUser,
  TestSessionProvider,
} from "@/test/sessionFixtures";
import type { SessionPayload } from "@/types/api";

function renderGuard(session: SessionPayload | null, isLoading = false) {
  render(
    <TestSessionProvider value={sessionValue({ session, isLoading })}>
      <MemoryRouter initialEntries={[spaPaths.login]}>
        <Routes>
          <Route
            path={spaPaths.login}
            element={
              <RequireLoggedOut>
                <p>Log in form</p>
              </RequireLoggedOut>
            }
          />
          <Route path={spaPaths.home} element={<p>Home</p>} />
          <Route path={spaPaths.constituency} element={<p>Constituency</p>} />
        </Routes>
      </MemoryRouter>
    </TestSessionProvider>,
  );
}

describe("RequireLoggedOut", () => {
  it("shows the children to a logged-out visitor", () => {
    renderGuard(sessionPayload());

    expect(screen.getByText("Log in form")).toBeInTheDocument();
  });

  it("sends a logged-in user on to where logging in would have landed them", () => {
    renderGuard(sessionPayload({ currentUser: testUser }));

    expect(screen.queryByText("Log in form")).not.toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("respects postAuthPath for an account with no constituency", () => {
    renderGuard(
      sessionPayload({ currentUser: { ...testUser, hasConstituency: false } }),
    );

    expect(screen.getByText("Constituency")).toBeInTheDocument();
  });

  it("shows nothing but a spinner while the session is still loading", () => {
    renderGuard(null, true);

    expect(screen.queryByText("Log in form")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
