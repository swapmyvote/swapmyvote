import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { confirmVerification, sendVerification } from "@/lib/mobilePhone";
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

function renderPage(
  user: CurrentUser | null,
  // What the profile screen's link puts in history state; undefined is a
  // plain visit to /app/mobile.
  state?: { changeNumber: boolean },
) {
  render(
    <TestSessionProvider
      value={sessionValue({
        session: sessionPayload({ currentUser: user }),
      })}
    >
      <MemoryRouter initialEntries={[{ pathname: "/app/mobile", state }]}>
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

  it("goes straight to the form when sent here to change the number", () => {
    renderPage(testUser, { changeNumber: true });

    expect(screen.getByLabelText("My mobile number is")).toBeInTheDocument();
    expect(
      screen.queryByText("Your mobile phone number has already been verified"),
    ).not.toBeInTheDocument();
  });

  // Not empty — the widget shows the country's calling code — so assert on
  // the digits.
  it("does not prefill the number it was asked to replace", () => {
    renderPage(testUser, { changeNumber: true });

    const field = screen.getByLabelText(
      "My mobile number is",
    ) as HTMLInputElement;
    expect(field.value.replace(/\D/g, "")).not.toContain("7400123456");
  });

  it("links Continue to the profile page", () => {
    renderPage(testUser);

    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute(
      "href",
      "/app/profile",
    );
  });

  // A failed refetch leaves `session` on the pre-verification payload, so
  // `verified` never becomes true. The success card still has to appear, or
  // the form stays mounted with the `busy` it deliberately kept.
  it("shows the success card once verified, even when the post-confirm session refetch fails", async () => {
    vi.mocked(sendVerification).mockResolvedValue({
      number: testUser.mobileNumber ?? "",
      sent: true,
    });
    vi.mocked(confirmVerification).mockResolvedValue(
      sessionPayload({ currentUser: testUser }),
    );

    render(
      <TestSessionProvider
        value={sessionValue({
          session: sessionPayload({
            currentUser: {
              ...testUser,
              mobileVerified: false,
              mobileSetButNotVerified: true,
            },
          }),
          // How refetch() actually fails: it resolves, carrying the error
          // on the query rather than rejecting, so the session never updates.
          refetchSession: () => Promise.resolve(null),
        })}
      >
        <MemoryRouter>
          <Mobile />
        </MemoryRouter>
      </TestSessionProvider>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Send me a code" }),
    );
    await userEvent.type(
      await screen.findByLabelText("The 6 digit code"),
      "123456",
    );
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(
      await screen.findByText(
        "Thank you for verifying your mobile phone number",
      ),
    ).toBeInTheDocument();
  });
});
