import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionNetworkForm } from "@/components/home/ActionNetworkForm";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

vi.mock("@/contexts/CookieConsentContext", () => ({
  useCookieConsent: vi.fn(),
}));

function withConsent(overrides: Record<string, unknown> = {}) {
  const accept = vi.fn();
  vi.mocked(useCookieConsent).mockReturnValue({
    status: null,
    hasAnswered: false,
    analyticsAllowed: false,
    accept,
    decline: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useCookieConsent>);
  return { accept };
}

function embedScript() {
  return document.querySelector('script[src*="actionnetwork.org"]');
}

describe("ActionNetworkForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
    document.head.innerHTML = "";
    for (const script of document.querySelectorAll("script")) {
      script.remove();
    }
  });

  describe("before cookies are accepted", () => {
    it("loads nothing from Action Network", () => {
      withConsent({ analyticsAllowed: false });

      render(<ActionNetworkForm />);

      // A third party must not set cookies while the banner still says
      // nothing non-essential has been.
      expect(embedScript()).toBeNull();
      expect(
        document.querySelector('link[href*="actionnetwork.org"]'),
      ).toBeNull();
    });

    it("explains why the form is missing", () => {
      withConsent({ analyticsAllowed: false });

      render(<ActionNetworkForm />);

      expect(screen.getByRole("alert")).toHaveTextContent(/Action Network/);
    });

    it("points an undecided visitor at the banner", () => {
      withConsent({ analyticsAllowed: false, hasAnswered: false });

      render(<ActionNetworkForm />);

      expect(
        screen.getByText(/choose an option in the cookie banner/i),
      ).toBeVisible();
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("offers someone who declined a way to change their mind", async () => {
      const { accept } = withConsent({
        analyticsAllowed: false,
        hasAnswered: true,
        status: "deny",
      });

      render(<ActionNetworkForm />);
      await userEvent.click(
        screen.getByRole("button", {
          name: /accept cookies and load the form/i,
        }),
      );

      expect(accept).toHaveBeenCalled();
    });
  });

  describe("once cookies are accepted", () => {
    it("loads the embed", () => {
      withConsent({
        analyticsAllowed: true,
        hasAnswered: true,
        status: "allow",
      });

      render(<ActionNetworkForm />);

      expect(embedScript()).not.toBeNull();
    });

    it("gives the script the element it injects into", () => {
      withConsent({
        analyticsAllowed: true,
        hasAnswered: true,
        status: "allow",
      });

      render(<ActionNetworkForm />);

      // Action Network's script looks this id up by name.
      expect(
        document.getElementById("can-form-area-swapmyvote"),
      ).not.toBeNull();
    });

    it("takes the embed away again when unmounted", () => {
      withConsent({
        analyticsAllowed: true,
        hasAnswered: true,
        status: "allow",
      });

      const { unmount } = render(<ActionNetworkForm />);
      expect(embedScript()).not.toBeNull();

      unmount();

      expect(embedScript()).toBeNull();
    });
  });
});
