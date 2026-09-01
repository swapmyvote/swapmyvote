import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signUp } from "@/lib/auth";
import { spaPaths } from "@/lib/spaPaths";
import { SignUp } from "@/pages/SignUp";
import {
  sessionPayload,
  sessionValue,
  testUser,
  TestSessionProvider,
} from "@/test/sessionFixtures";
import type { SessionPayload } from "@/types/api";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, signUp: vi.fn() };
});

function renderPage(loginsOpen = true, session?: SessionPayload) {
  const refetchSession = vi.fn().mockResolvedValue(null);
  render(
    <TestSessionProvider
      value={sessionValue({
        refetchSession,
        session:
          session ??
          sessionPayload({
            appMode: loginsOpen ? "open" : "closed-warm-up",
            flags: { loginsOpen },
          }),
      })}
    >
      <MemoryRouter initialEntries={[spaPaths.signup]}>
        <Routes>
          <Route path={spaPaths.signup} element={<SignUp />} />
          <Route path={spaPaths.home} element={<p>Home</p>} />
          <Route path={spaPaths.constituency} element={<p>Constituency</p>} />
        </Routes>
      </MemoryRouter>
    </TestSessionProvider>,
  );
  return { refetchSession };
}

async function submit() {
  await userEvent.type(screen.getByLabelText("Your name"), "Ada Lovelace");
  await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
  await userEvent.type(
    screen.getByLabelText("Confirm password"),
    "correct-horse",
  );
  await userEvent.click(
    screen.getByRole("checkbox", { name: /processing my personal data/i }),
  );
  await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
}

describe("SignUp", () => {
  beforeEach(() => {
    vi.mocked(signUp).mockReset();
  });

  // A brand new account has whatever the entry form stashed, or nothing —
  // either way the constituency screen is where it belongs if it has none.
  it("refetches the session and goes to the constituency screen", async () => {
    vi.mocked(signUp).mockResolvedValue(
      sessionPayload({
        currentUser: { ...testUser, hasConstituency: false },
      }),
    );
    const { refetchSession } = renderPage();

    await submit();

    await waitFor(() =>
      expect(screen.getByText("Constituency")).toBeInTheDocument(),
    );
    expect(refetchSession).toHaveBeenCalled();
  });

  it("goes home when the entry form already supplied a constituency", async () => {
    vi.mocked(signUp).mockResolvedValue(
      sessionPayload({ currentUser: testUser }),
    );
    renderPage();

    await submit();

    await waitFor(() => expect(screen.getByText("Home")).toBeInTheDocument());
  });

  it("shows the closed notice instead of the form during closed-warm-up", () => {
    renderPage(false);

    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/not open/i);
  });

  // The endpoint refuses an already-authenticated caller (403
  // already_authenticated) — without this a logged-in user could create a
  // second account and orphan their first.
  it("sends an already-logged-in visitor on instead of showing the form", () => {
    renderPage(true, sessionPayload({ currentUser: testUser }));

    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
  });
});
