import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Navigation } from "@/components/navigation/Navigation";
import type { SessionContextValue } from "@/contexts/SessionContext";
import {
  sessionPayload,
  sessionValue,
  TEST_USER,
  TestSessionProvider,
} from "@/test/sessionFixtures";

function renderNav(overrides: Partial<SessionContextValue> = {}) {
  const value = sessionValue(overrides);
  render(
    <TestSessionProvider value={value}>
      <Navigation />
    </TestSessionProvider>,
  );
  return value;
}

function loggedInAs(user = TEST_USER) {
  return { session: sessionPayload({ currentUser: user }) };
}

describe("Navigation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the brand as a full-page link to the (legacy) home route", () => {
    renderNav();
    const brand = screen.getByRole("link", { name: /swapmyvote/i });
    // A real anchor with href="/" (full page load), not a react-router
    // client-side link — "/" is still served by the legacy HAML home.
    expect(brand).toHaveAttribute("href", "/");
  });

  it("shows the SwapMyVote logo image (pink wordmark + icon)", () => {
    renderNav();
    // The brand is the real logo_nav asset (matching the legacy site), not
    // plain text — its accessible name comes from the img alt.
    const logo = screen.getByRole("img", { name: /swapmyvote/i });
    expect(logo.tagName).toBe("IMG");
  });

  describe("when logged out", () => {
    it("offers a log in link while logins are open", () => {
      renderNav();

      expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
        "href",
        "/users/sign_in",
      );
    });

    it("offers no log in link while logins are closed (closed-warm-up)", () => {
      renderNav({
        session: sessionPayload({
          appMode: "closed-warm-up",
          flags: {
            loginsOpen: false,
            swappingOpen: false,
            votingOpen: false,
            votingInfoLocked: false,
          },
        }),
      });

      expect(screen.queryByRole("link", { name: /log in/i })).toBeNull();
    });

    it("offers nothing until the session has loaded", () => {
      renderNav({ session: null, isLoading: true });

      expect(screen.queryByRole("link", { name: /log in/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /log out/i })).toBeNull();
    });
  });

  describe("when logged in", () => {
    it("shows the user's name, linking to the (legacy) profile page", () => {
      renderNav(loggedInAs());

      const profile = screen.getByRole("link", { name: /ada lovelace/i });
      expect(profile).toHaveAttribute("href", "/user/edit");
    });

    it("shows the user's avatar", () => {
      renderNav(loggedInAs());

      // Decorative: the adjacent name is the accessible label, so the avatar
      // carries an empty alt and is found by src rather than by role.
      const avatar = document.querySelector(
        `img[src="${TEST_USER.imageUrl}"]`,
      ) as HTMLImageElement;
      expect(avatar).not.toBeNull();
      expect(avatar.alt).toBe("");
    });

    it("offers log out instead of log in", () => {
      renderNav(loggedInAs());

      expect(screen.getByRole("button", { name: /log out/i })).toBeVisible();
      expect(screen.queryByRole("link", { name: /log in/i })).toBeNull();
    });

    it("logs out through the API, then leaves the SPA for the legacy home", async () => {
      const assign = vi.fn();
      vi.spyOn(window, "location", "get").mockReturnValue({
        ...window.location,
        assign,
      } as unknown as Location);
      const logOut = vi
        .fn()
        .mockResolvedValue(sessionPayload({ currentUser: null }));

      renderNav({ ...loggedInAs(), logOut });

      await userEvent.click(screen.getByRole("button", { name: /log out/i }));

      expect(logOut).toHaveBeenCalledOnce();
      expect(assign).toHaveBeenCalledWith("/");
    });

    it("still leaves for home when logging out fails", async () => {
      const assign = vi.fn();
      vi.spyOn(window, "location", "get").mockReturnValue({
        ...window.location,
        assign,
      } as unknown as Location);
      const logOut = vi.fn().mockRejectedValue(new Error("already logged out"));

      renderNav({ ...loggedInAs(), logOut });

      await userEvent.click(screen.getByRole("button", { name: /log out/i }));

      expect(assign).toHaveBeenCalledWith("/");
    });
  });
});
