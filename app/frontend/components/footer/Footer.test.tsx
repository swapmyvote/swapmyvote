import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Footer } from "@/components/footer/Footer";
import { FORWARD_DEMOCRACY_PRIVACY_POLICY_URL } from "@/lib/externalLinks";
import { STATIC_PATHS } from "@/lib/staticPaths";

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe("Footer", () => {
  it("links migrated static pages as in-SPA routes", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: /^about$/i })).toHaveAttribute(
      "href",
      STATIC_PATHS.about,
    );
    expect(screen.getByRole("link", { name: /contact us/i })).toHaveAttribute(
      "href",
      STATIC_PATHS.contact,
    );
    expect(screen.getByRole("link", { name: /terms of use/i })).toHaveAttribute(
      "href",
      STATIC_PATHS.terms,
    );
    expect(
      screen.getByRole("link", { name: /cookie policy/i }),
    ).toHaveAttribute("href", STATIC_PATHS.cookies);
  });

  it("links the not-yet-migrated FAQ and API to the HAML routes (full-page)", () => {
    renderFooter();
    // FAQ is deferred to M2, /api is still HAML — both must be plain anchors.
    expect(screen.getByRole("link", { name: /^faq$/i })).toHaveAttribute(
      "href",
      "/faq",
    );
    expect(
      screen.getByRole("link", { name: /^is this legal\?$/i }),
    ).toHaveAttribute("href", "/faq#legal");
    expect(screen.getByRole("link", { name: /^api$/i })).toHaveAttribute(
      "href",
      "/api",
    );
  });

  it("links the privacy policy externally", () => {
    renderFooter();
    expect(
      screen.getByRole("link", { name: /privacy policy/i }),
    ).toHaveAttribute("href", FORWARD_DEMOCRACY_PRIVACY_POLICY_URL);
  });

  it("links the social accounts", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: /twitter/i })).toHaveAttribute(
      "href",
      "https://twitter.com/swapmyvote",
    );
    expect(screen.getByRole("link", { name: /facebook/i })).toHaveAttribute(
      "href",
      "https://www.facebook.com/swapmyvote",
    );
  });

  it("shows the legal promoter notice", () => {
    renderFooter();
    expect(
      screen.getByText(/published and promoted by tom de grunwald/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/company no\. 11707599/i)).toBeInTheDocument();
  });
});
