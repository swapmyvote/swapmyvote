import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Share } from "@/pages/Share";

vi.mock("@/components/auth/RequireLogin", () => ({
  RequireLogin: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("@/components/auth/RequireSwappingOpen", () => ({
  RequireSwappingOpen: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("@/components/share/SocialShare", () => ({
  SocialShare: () => <div data-testid="social-share" />,
}));

describe("Share", () => {
  it("explains that a search is under way and offers the share block", () => {
    render(
      <MemoryRouter>
        <Share />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/looking for someone for you to swap with/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("social-share")).toBeInTheDocument();
  });

  it("offers a way to skip to the dashboard", () => {
    render(
      <MemoryRouter>
        <Share />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /no thanks/i })).toHaveAttribute(
      "href",
      "/app/dashboard",
    );
  });
});
