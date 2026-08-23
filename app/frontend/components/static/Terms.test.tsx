import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Terms } from "@/components/static/Terms";
import { forwardDemocracyPrivacyPolicyUrl } from "@/lib/externalLinks";
import { staticPaths } from "@/lib/staticPaths";

function renderTerms() {
  return render(
    <MemoryRouter>
      <Terms />
    </MemoryRouter>,
  );
}

describe("Terms", () => {
  it("renders the Terms heading", () => {
    renderTerms();
    expect(
      screen.getByRole("heading", { name: /terms and conditions of use/i }),
    ).toBeInTheDocument();
  });

  it("links to the privacy policy externally", () => {
    renderTerms();
    expect(
      screen.getByRole("link", { name: /^privacy policy$/i }),
    ).toHaveAttribute("href", forwardDemocracyPrivacyPolicyUrl);
  });

  it("links to the Cookie Policy as an in-SPA route", () => {
    renderTerms();
    expect(
      screen.getByRole("link", { name: /cookie policy/i }),
    ).toHaveAttribute("href", staticPaths.cookies);
  });

  it("shows the copyright notice", () => {
    renderTerms();
    expect(
      screen.getByText(/© 2019 Forward Democracy Limited/i),
    ).toBeInTheDocument();
  });
});
