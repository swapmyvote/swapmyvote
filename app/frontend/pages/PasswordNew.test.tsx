import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { PasswordNew } from "@/pages/PasswordNew";
import {
  sessionPayload,
  sessionValue,
  testUser,
  TestSessionProvider,
} from "@/test/sessionFixtures";

const mutate = vi.hoisted(() => vi.fn());
const useRequestPasswordResetMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/password", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/password")>();
  return { ...actual, useRequestPasswordReset: useRequestPasswordResetMock };
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

function renderPage(value = sessionValue()) {
  render(
    <TestSessionProvider value={value}>
      <MemoryRouter>
        <PasswordNew />
      </MemoryRouter>
    </TestSessionProvider>,
  );
}

async function submit(email = "ada@example.com") {
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.click(
    screen.getByRole("button", { name: "Send reset instructions" }),
  );
}

describe("PasswordNew", () => {
  beforeEach(() => {
    mutate.mockReset();
    useRequestPasswordResetMock.mockReset();
    useRequestPasswordResetMock.mockReturnValue(mutationState());
  });

  it("renders the form", () => {
    renderPage();

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send reset instructions" }),
    ).toBeInTheDocument();
  });

  it("requests a reset for the typed address", async () => {
    renderPage();

    await submit("ada@example.com");

    expect(mutate).toHaveBeenCalledWith("ada@example.com");
  });

  // A mis-click on an untouched form is a dead end otherwise: the API accepts
  // `{email: ""}` with the same 202, so the screen would answer an empty
  // submit with the "if that address is registered" confirmation.
  it("will not submit an empty address", async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole("button", { name: "Send reset instructions" }),
    );

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Email")).toBeRequired();
  });

  it("shows a conditional confirmation that does not reveal whether the account exists", () => {
    useRequestPasswordResetMock.mockReturnValue(
      mutationState({ isSuccess: true }),
    );

    renderPage();

    const confirmation = screen.getByText(/we've sent reset instructions/i);
    expect(confirmation.textContent).toMatch(/if that address is registered/i);
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("surfaces an error instead of the confirmation when the request fails", () => {
    useRequestPasswordResetMock.mockReturnValue(
      mutationState({
        isError: true,
        error: new ApiError(422, {
          error: {
            code: "validation_failed",
            messages: ["Something went wrong"],
            fields: {},
          },
        }),
      }),
    );

    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(
      screen.queryByText(/we've sent reset instructions/i),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  // RequireLoggedOut, mirroring the API's own reject_when_logged_in!: someone
  // who is already signed in has no use for a reset form, and the endpoint
  // would refuse them anyway.
  it("bounces a signed-in visitor rather than showing the form", () => {
    renderPage(
      sessionValue({ session: sessionPayload({ currentUser: testUser }) }),
    );

    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send reset instructions" }),
    ).not.toBeInTheDocument();
  });
});
