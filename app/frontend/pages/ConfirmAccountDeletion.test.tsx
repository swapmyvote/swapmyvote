import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { ConfirmAccountDeletion } from "@/pages/ConfirmAccountDeletion";
import { spaPaths } from "@/lib/spaPaths";
import {
  sessionPayload,
  sessionValue,
  testUser,
  TestSessionProvider,
} from "@/test/sessionFixtures";

const mutate = vi.hoisted(() => vi.fn());
const useDeleteAccountMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/account", () => ({
  useDeleteAccount: useDeleteAccountMock,
}));

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

function renderPage({ locked = false } = {}) {
  render(
    <TestSessionProvider
      value={sessionValue({
        session: sessionPayload({
          currentUser: testUser,
          flags: { votingInfoLocked: locked },
        }),
      })}
    >
      <MemoryRouter initialEntries={[spaPaths.confirmAccountDeletion]}>
        <Routes>
          <Route
            path={spaPaths.confirmAccountDeletion}
            element={<ConfirmAccountDeletion />}
          />
          <Route path={spaPaths.accountDeleted} element={<p>Deleted</p>} />
          <Route path={spaPaths.profile} element={<p>Profile</p>} />
        </Routes>
      </MemoryRouter>
    </TestSessionProvider>,
  );
}

describe("ConfirmAccountDeletion", () => {
  beforeEach(() => {
    mutate.mockReset();
    useDeleteAccountMock.mockReset();
    useDeleteAccountMock.mockReturnValue(mutationState());
  });

  it("renders the warning, verbatim from the legacy view", () => {
    renderPage();

    expect(
      screen.getByText(
        "Are you sure you want to delete your account? This will cancel any pending or confirmed swaps you have made.",
      ),
    ).toBeInTheDocument();
  });

  it("offers a way out back to the profile", () => {
    renderPage();

    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      spaPaths.profile,
    );
  });

  it("calls the mutation when the confirm button is pressed", async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole("button", { name: "Yes, delete my account" }),
    );

    expect(mutate).toHaveBeenCalled();
  });

  it("navigates to the deleted screen, replacing history, once the delete succeeds", () => {
    useDeleteAccountMock.mockReturnValue(
      mutationState({ isSuccess: true, data: sessionPayload() }),
    );

    renderPage();

    expect(screen.getByText("Deleted")).toBeInTheDocument();
  });

  it("disables the button and explains why when voting information is locked", () => {
    renderPage({ locked: true });

    expect(
      screen.getByRole("button", { name: "Yes, delete my account" }),
    ).toBeDisabled();
    expect(screen.getByText(/currently locked/)).toBeInTheDocument();
  });

  it("surfaces a voting_info_locked error rather than navigating", () => {
    useDeleteAccountMock.mockReturnValue(
      mutationState({
        isError: true,
        error: new ApiError(403, {
          error: {
            code: "voting_info_locked",
            messages: [
              "It's election day and your swap is confirmed, so your details are locked.",
            ],
            fields: {},
          },
        }),
      }),
    );

    renderPage();

    expect(
      screen.getByText(
        "It's election day and your swap is confirmed, so your details are locked.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Deleted")).not.toBeInTheDocument();
  });

  it("surfaces a record_not_destroyed failure rather than navigating", () => {
    useDeleteAccountMock.mockReturnValue(
      mutationState({
        isError: true,
        error: new ApiError(422, {
          error: {
            code: "not_destroyed",
            messages: ["Something went wrong - please try that again."],
            fields: {},
          },
        }),
      }),
    );

    renderPage();

    expect(
      screen.getByText("Something went wrong - please try that again."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Deleted")).not.toBeInTheDocument();
  });
});
