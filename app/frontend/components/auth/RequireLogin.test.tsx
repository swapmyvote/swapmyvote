import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RequireLogin } from "@/components/auth/RequireLogin";
import {
  SessionContext,
  type SessionContextValue,
} from "@/contexts/SessionContext";
import type { CurrentUser, SessionPayload } from "@/types/api";

const user: CurrentUser = {
  id: 1,
  name: "John",
  email: "john@example.com",
  imageUrl: "/john.png",
  hasConstituency: true,
  constituencyName: "Woking",
  constituencyOnsId: "E14001063",
  mobileVerified: true,
  mobileSetButNotVerified: false,
  mobileNumber: "+447911123456",
  preferredParty: null,
  willingParty: null,
};

function renderWithSession(session: SessionPayload | null, isLoading = false) {
  const value: SessionContextValue = {
    session,
    isLoading,
    isError: false,
    refetchSession: async () => undefined,
    logOut: async () => {
      throw new Error("not used");
    },
  };
  render(
    <SessionContext.Provider value={value}>
      <MemoryRouter>
        <RequireLogin>
          <p>Secret</p>
        </RequireLogin>
      </MemoryRouter>
    </SessionContext.Provider>,
  );
}

const loggedOut: SessionPayload = {
  appMode: "open",
  flags: {
    loginsOpen: true,
    swappingOpen: true,
    votingOpen: false,
    votingInfoLocked: false,
  },
  currentUser: null,
  swap: null,
};

describe("RequireLogin", () => {
  it("shows the children to a logged-in user", () => {
    renderWithSession({ ...loggedOut, currentUser: user });

    expect(screen.getByText("Secret")).toBeInTheDocument();
  });

  it("sends a logged-out visitor to log in, leaving the SPA", () => {
    renderWithSession(loggedOut);

    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/app/login",
    );
  });

  it("says nothing while the session is still loading", () => {
    renderWithSession(null, true);

    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /log in/i }),
    ).not.toBeInTheDocument();
  });
});
