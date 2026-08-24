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

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, logIn: vi.fn() };
});

function renderPage(loginsOpen = true) {
  const refetchSession = vi.fn().mockResolvedValue(null);
  render(
    <TestSessionProvider
      value={sessionValue({
        refetchSession,
        session: sessionPayload({
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
});
