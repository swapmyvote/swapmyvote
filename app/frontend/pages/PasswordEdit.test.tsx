import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { spaPaths } from "@/lib/spaPaths";
import { PasswordEdit } from "@/pages/PasswordEdit";
import {
  sessionPayload,
  sessionValue,
  testUser,
  TestSessionProvider,
} from "@/test/sessionFixtures";

const mutate = vi.hoisted(() => vi.fn());
const useResetPasswordMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/password", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/password")>();
  return { ...actual, useResetPassword: useResetPasswordMock };
});

function mutationState(overrides: Record<string, unknown> = {}) {
  return {
    mutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  };
}

function renderPage(
  path = `${spaPaths.passwordEdit}?reset_password_token=a-token`,
) {
  render(
    <TestSessionProvider value={sessionValue()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={spaPaths.passwordEdit} element={<PasswordEdit />} />
          <Route path={spaPaths.passwordNew} element={<p>Request reset</p>} />
          <Route path={spaPaths.dashboard} element={<p>Dashboard</p>} />
          <Route path={spaPaths.home} element={<p>Home</p>} />
        </Routes>
      </MemoryRouter>
    </TestSessionProvider>,
  );
}

async function submit() {
  await userEvent.type(screen.getByLabelText("New password"), "correct-horse");
  await userEvent.type(
    screen.getByLabelText("Confirm new password"),
    "correct-horse",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Change my password" }),
  );
}

describe("PasswordEdit", () => {
  beforeEach(() => {
    mutate.mockReset();
    useResetPasswordMock.mockReset();
    useResetPasswordMock.mockReturnValue(mutationState());
  });

  it("renders both password fields when a token is present", () => {
    renderPage();

    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
  });

  it("submits the token with the new password", async () => {
    renderPage();

    await submit();

    expect(mutate).toHaveBeenCalledWith({
      token: "a-token",
      password: "correct-horse",
      passwordConfirmation: "correct-horse",
    });
  });

  it("navigates on to a signed-in destination once the reset succeeds", () => {
    useResetPasswordMock.mockReturnValue(
      mutationState({
        isSuccess: true,
        data: sessionPayload({ currentUser: testUser }),
      }),
    );

    renderPage();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders the expired-link message with a link to request a new one when the token is invalid", () => {
    useResetPasswordMock.mockReturnValue(
      mutationState({
        isError: true,
        error: new ApiError(422, {
          error: {
            code: "invalid_token",
            messages: [
              "That password reset link is invalid or has expired. Please request a new one.",
            ],
            fields: {},
          },
        }),
      }),
    );

    renderPage();

    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();

    const link = screen.getByRole("link", {
      name: /request a new reset link/i,
    });
    expect(link).toHaveAttribute("href", spaPaths.passwordNew);
  });

  it("renders per-field validation errors", () => {
    useResetPasswordMock.mockReturnValue(
      mutationState({
        isError: true,
        error: new ApiError(422, {
          error: {
            code: "validation_failed",
            messages: ["Password confirmation doesn't match Password"],
            fields: { password_confirmation: ["doesn't match Password"] },
          },
        }),
      }),
    );

    renderPage();

    expect(screen.getByText("doesn't match Password")).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });

  it("renders the expired-link state and no form when the token is missing", () => {
    renderPage(spaPaths.passwordEdit);

    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
