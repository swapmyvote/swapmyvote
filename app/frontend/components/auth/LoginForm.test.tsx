import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/LoginForm";
import { ApiError } from "@/lib/apiClient";
import { logIn } from "@/lib/auth";
import { sessionPayload, testUser } from "@/test/sessionFixtures";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, logIn: vi.fn() };
});

function renderForm() {
  const onLoggedIn = vi.fn();
  render(<LoginForm onLoggedIn={onLoggedIn} />);
  return { onLoggedIn };
}

async function fillIn(password = "correct-horse") {
  await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.mocked(logIn).mockReset();
    vi.mocked(logIn).mockResolvedValue(
      sessionPayload({ currentUser: testUser }),
    );
  });

  it("logs in and hands the session back", async () => {
    const { onLoggedIn } = renderForm();

    await fillIn();

    await waitFor(() =>
      expect(logIn).toHaveBeenCalledWith({
        email: "ada@example.com",
        password: "correct-horse",
      }),
    );
    expect(onLoggedIn).toHaveBeenCalledWith(
      sessionPayload({ currentUser: testUser }),
    );
  });

  it("shows the API's message when the credentials are refused", async () => {
    vi.mocked(logIn).mockRejectedValue(
      new ApiError(401, {
        error: {
          code: "invalid_credentials",
          messages: ["Sorry, we could not log you in with those details"],
          fields: {},
        },
      }),
    );
    const { onLoggedIn } = renderForm();

    await fillIn("wrong");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sorry, we could not log you in with those details",
    );
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  it("re-enables the button after a failure so the user can try again", async () => {
    vi.mocked(logIn).mockRejectedValue(new Error("network down"));
    renderForm();

    await fillIn();

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
  });

  it("links out to the legacy password reset page", () => {
    renderForm();

    expect(
      screen.getByRole("link", { name: /forgotten password/i }),
    ).toHaveAttribute("href", "/users/password/new");
  });
});
