import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Cookies } from "@/components/static/Cookies";
import { forwardDemocracyPrivacyPolicyUrl } from "@/lib/externalLinks";

describe("Cookies", () => {
  it("renders the Cookie Policy heading and its sections", () => {
    render(<Cookies />);
    expect(
      screen.getByRole("heading", { name: /^cookie policy$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /types of cookie/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /cookie list/i }),
    ).toBeInTheDocument();
  });

  it("lists the session cookie by name in the cookie table", () => {
    render(<Cookies />);
    expect(screen.getByText("_swapmyvote_session")).toBeInTheDocument();
  });

  it("links to the Forward Democracy privacy policy", () => {
    render(<Cookies />);
    expect(
      screen.getByRole("link", { name: /our privacy policy/i }),
    ).toHaveAttribute("href", forwardDemocracyPrivacyPolicyUrl);
  });

  it("links to the browser cookies guide in a new tab", () => {
    render(<Cookies />);
    const guide = screen.getByRole("link", { name: /browser cookies guide/i });
    expect(guide).toHaveAttribute(
      "href",
      "https://privacypolicies.com/blog/how-to-delete-cookies/",
    );
    expect(guide).toHaveAttribute("target", "_blank");
  });
});
