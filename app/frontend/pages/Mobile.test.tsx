import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Mobile } from "@/pages/Mobile";
import {
  sessionPayload,
  sessionValue,
  testUser,
  TestSessionProvider,
} from "@/test/sessionFixtures";
import type { CurrentUser } from "@/types/api";

vi.mock("@/lib/mobilePhone", () => ({
  sendVerification: vi.fn(),
  confirmVerification: vi.fn(),
}));

function renderPage(user: CurrentUser | null) {
  render(
    <TestSessionProvider
      value={sessionValue({
        session: sessionPayload({ currentUser: user }),
      })}
    >
      <MemoryRouter>
        <Mobile />
      </MemoryRouter>
    </TestSessionProvider>,
  );
}

describe("Mobile", () => {
  it("asks a logged-out visitor to log in", () => {
    renderPage(null);

    expect(screen.getByRole("alert")).toHaveTextContent(/logged in/i);
    expect(
      screen.queryByLabelText("My mobile number is"),
    ).not.toBeInTheDocument();
  });

  it("shows the form to a user whose number is not verified", () => {
    renderPage({
      ...testUser,
      mobileVerified: false,
      mobileSetButNotVerified: true,
    });

    expect(screen.getByLabelText("My mobile number is")).toBeInTheDocument();
  });

  it("tells a verified user there is nothing to do", () => {
    renderPage(testUser);

    expect(
      screen.getByText("Your mobile phone number has already been verified"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("My mobile number is"),
    ).not.toBeInTheDocument();
  });

  it("lets a verified user start again with a different number", async () => {
    renderPage(testUser);

    await userEvent.click(
      screen.getByRole("button", { name: "Use a different number" }),
    );

    expect(screen.getByLabelText("My mobile number is")).toBeInTheDocument();
  });
});
