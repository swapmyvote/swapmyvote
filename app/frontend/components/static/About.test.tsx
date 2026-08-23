import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { About } from "@/components/static/About";
import { githubUrl } from "@/lib/externalLinks";

function renderAbout() {
  return render(
    <MemoryRouter>
      <About />
    </MemoryRouter>,
  );
}

describe("About", () => {
  it("renders the About heading", () => {
    renderAbout();
    expect(
      screen.getByRole("heading", { name: /about swap my vote/i }),
    ).toBeInTheDocument();
  });

  it("links to the wasted-votes research in a new tab", () => {
    renderAbout();
    const link = screen.getByRole("link", { name: /68% were wasted in 2017/i });
    expect(link).toHaveAttribute(
      "href",
      "https://www.electoral-reform.org.uk/latest-news-and-research/publications/the-2017-general-election-report/",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("links to the codebase on GitHub", () => {
    renderAbout();
    expect(
      screen.getByRole("link", { name: /our entire codebase/i }),
    ).toHaveAttribute("href", githubUrl);
  });

  it("links to the API page as a full-page link (not yet migrated)", () => {
    renderAbout();
    // The /api page is still HAML, so this must be a plain anchor, not a
    // client-side <Link>.
    expect(screen.getByRole("link", { name: /^API$/ })).toHaveAttribute(
      "href",
      "/api",
    );
  });
});
