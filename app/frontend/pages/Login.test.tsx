import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logIn } from "@/lib/auth";
import { spaPaths } from "@/lib/spaPaths";
import { Login } from "@/pages/Login";
import {
  sessionPayload,
  sessionValue,
  testUser,
  TestSessionProvider,
} from "@/test/sessionFixtures";
import type { SessionPayload } from "@/types/api";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, logIn: vi.fn() };
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
      <MemoryRouter initialEntries={[spaPaths.login]}>
        <Routes>
          <Route path={spaPaths.login} element={<Login />} />
          <Route path={spaPaths.home} element={<p>Home</p>} />
          <Route path={spaPaths.constituency} element={<p>Constituency</p>} />
        </Routes>
      </MemoryRouter>
    </TestSessionProvider>,
  );
  return { refetchSession };
}

async function submit() {
  await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));
}

describe("Login", () => {
  beforeEach(() => {
    vi.mocked(logIn).mockReset();
  });

  it("refetches the session and goes home once logged in", async () => {
    vi.mocked(logIn).mockResolvedValue(
      sessionPayload({ currentUser: testUser }),
    );
    const { refetchSession } = renderPage();

    await submit();

    await waitFor(() => expect(screen.getByText("Home")).toBeInTheDocument());
    expect(refetchSession).toHaveBeenCalled();
  });

  it("sends an account with no constituency to the constituency screen", async () => {
    vi.mocked(logIn).mockResolvedValue(
      sessionPayload({
        currentUser: { ...testUser, hasConstituency: false },
      }),
    );
    renderPage();

    await submit();

    await waitFor(() =>
      expect(screen.getByText("Constituency")).toBeInTheDocument(),
    );
  });

  it("shows the closed notice instead of the form during closed-warm-up", () => {
    renderPage(false);

    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/not open/i);
  });

  // The endpoint refuses an already-authenticated caller (403
  // already_authenticated); someone who is already logged in came here by
  // accident, so send them on rather than showing them a form that cannot work.
  it("sends an already-logged-in visitor on instead of showing the form", () => {
    renderPage(true, sessionPayload({ currentUser: testUser }));

    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
  });
});
