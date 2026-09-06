import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SearchingForSwap } from "@/components/swap/SearchingForSwap";
import {
  sessionPayload,
  sessionValue,
  TestSessionProvider,
  testUser,
} from "@/test/sessionFixtures";

vi.mock("@/components/share/SocialShare", () => ({
  SocialShare: () => <div data-testid="social-share" />,
}));

function renderSearching(mobileVerified: boolean) {
  return render(
    <MemoryRouter>
      <TestSessionProvider
        value={sessionValue({
          session: sessionPayload({
            currentUser: { ...testUser, mobileVerified },
          }),
        })}
      >
        <SearchingForSwap />
      </TestSessionProvider>
    </MemoryRouter>,
  );
}

describe("SearchingForSwap", () => {
  it("explains that we are still looking", () => {
    renderSearching(true);

    expect(
      screen.getByText(/We’re looking for a voting partner for you/),
    ).toBeInTheDocument();
  });

  it("suggests verifying a mobile number when there is nothing else to do", () => {
    renderSearching(false);

    expect(
      screen.getByRole("link", { name: "Verify your mobile number" }),
    ).toHaveAttribute("href", "/app/mobile");
  });

  it("does not nag a user who has already verified", () => {
    renderSearching(true);

    expect(
      screen.queryByRole("link", { name: "Verify your mobile number" }),
    ).not.toBeInTheDocument();
  });

  it("always offers the share block", () => {
    renderSearching(true);

    expect(screen.getByTestId("social-share")).toBeInTheDocument();
  });
});
