import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Navigation } from "@/components/navigation/Navigation";
import type { SessionContextValue } from "@/contexts/SessionContext";
import { spaPaths } from "@/lib/spaPaths";
import {
  sessionPayload,
  sessionValue,
  testUser,
  TestSessionProvider,
} from "@/test/sessionFixtures";

function renderNav(overrides: Partial<SessionContextValue> = {}) {
  const value = sessionValue(overrides);
  render(
    <TestSessionProvider value={value}>
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>
    </TestSessionProvider>,
  );
  return value;
}

function loggedInAs(user = testUser) {
  return { session: sessionPayload({ currentUser: user }) };
}

// Everything a logged-in user can do lives behind the avatar menu, so the
// tests have to open it first — that it is closed until then is itself
// asserted below.
async function openUserMenu(name: RegExp = /ada lovelace/i) {
  await userEvent.click(screen.getByRole("button", { name }));
}

describe("Navigation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The home page was ported in M3, so the brand stays inside the SPA rather
  // than dropping the user onto the Bootstrap 4 HAML home from every screen.
  it("renders the brand as a link to the ported home screen", () => {
    renderNav();
    const brand = screen.getByRole("link", { name: /swapmyvote/i });
    expect(brand).toHaveAttribute("href", spaPaths.home);
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
        "/app/login",
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
    it("labels the menu with the user's name", () => {
      renderNav(loggedInAs());

      expect(
        screen.getByRole("button", { name: /ada lovelace/i }),
      ).toBeVisible();
    });

    // /user/edit's content was ported in two halves — the parties,
    // constituency and email to /app/profile in M4, the mobile number to
    // /app/mobile in M6 — so this stays inside the SPA. Pointing it at the
    // HAML page dropped the user into the Bootstrap 4 site with no way back.
    it("links to the profile screen from the menu, staying in the SPA", async () => {
      renderNav(loggedInAs());

      await openUserMenu();

      expect(
        screen.getByRole("link", { name: /edit profile/i }),
      ).toHaveAttribute("href", spaPaths.profile);
    });

    it("shows the user's avatar", () => {
      renderNav(loggedInAs());

      // Decorative: the adjacent name is the accessible label, so the avatar
      // carries an empty alt and is found by src rather than by role.
      const avatar = document.querySelector(
        `img[src="${testUser.imageUrl}"]`,
      ) as HTMLImageElement;
      expect(avatar).not.toBeNull();
      expect(avatar.alt).toBe("");
    });

    it("offers log out instead of log in", async () => {
      renderNav(loggedInAs());

      await openUserMenu();

      expect(screen.getByRole("button", { name: /log out/i })).toBeVisible();
      expect(screen.queryByRole("link", { name: /log in/i })).toBeNull();
    });

    // Log out used to sit in the bar next to the name, one stray click from
    // the logo. It is only reachable through the menu now.
    it("keeps log out out of the bar until the menu is opened", () => {
      renderNav(loggedInAs());

      expect(screen.queryByRole("button", { name: /log out/i })).toBeNull();
    });

    it("logs out through the API, then reloads onto the SPA home", async () => {
      const assign = vi.fn();
      vi.spyOn(window, "location", "get").mockReturnValue({
        ...window.location,
        assign,
      } as unknown as Location);
      const logOut = vi
        .fn()
        .mockResolvedValue(sessionPayload({ currentUser: null }));

      renderNav({ ...loggedInAs(), logOut });

      await openUserMenu();
      await userEvent.click(screen.getByRole("button", { name: /log out/i }));

      expect(logOut).toHaveBeenCalledOnce();
      expect(assign).toHaveBeenCalledWith(spaPaths.home);
    });

    it("still leaves for home when logging out fails", async () => {
      const assign = vi.fn();
      vi.spyOn(window, "location", "get").mockReturnValue({
        ...window.location,
        assign,
      } as unknown as Location);
      const logOut = vi.fn().mockRejectedValue(new Error("already logged out"));

      renderNav({ ...loggedInAs(), logOut });

      await openUserMenu();
      await userEvent.click(screen.getByRole("button", { name: /log out/i }));

      expect(assign).toHaveBeenCalledWith(spaPaths.home);
    });
  });
});
