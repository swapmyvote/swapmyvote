import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmIncomingSwap } from "@/components/swap/ConfirmIncomingSwap";
import {
  sessionPayload,
  sessionValue,
  TestSessionProvider,
  testUser,
} from "@/test/sessionFixtures";
import type { SwapDetail } from "@/types/api";

const useSwapMutation = vi.hoisted(() => vi.fn());
const confirmSwap = vi.hoisted(() => vi.fn());
vi.mock("@/lib/swap", () => ({
  useSwapMutation,
  confirmSwap,
  consentMessage:
    "You and your vote swap partner need to be able to contact each other by " +
    "email so you can establish trust between you. (See the FAQ)",
}));
vi.mock("@/lib/referenceData", () => ({
  useElection: () => ({ data: { hidePolls: false } }),
}));
vi.mock("@/components/swap/SwapProfileCard", () => ({
  SwapProfileCard: () => <div data-testid="profile-card" />,
}));
vi.mock("@/components/swap/RejectSwapModal", () => ({
  RejectSwapModal: ({ show }: { show: boolean }) =>
    show ? <div data-testid="reject-modal" /> : null,
}));

function swap(): SwapDetail {
  return {
    id: 7,
    state: "incoming",
    confirmed: false,
    consentGiven: false,
    validityHours: 48,
    partner: {
      name: "Grace H",
      imageUrl: "https://example.com/grace.png",
      constituencyName: "Wakefield",
      constituencyOnsId: "E14001009",
      badges: { mobileVerified: true, provider: null, hasEmail: true },
      preferredParty: null,
      willingParty: null,
      polls: [],
      recommendations: [],
      contact: null,
    },
  };
}

function renderState(mobileVerified = true) {
  return render(
    <MemoryRouter>
      <TestSessionProvider
        value={sessionValue({
          session: sessionPayload({
            currentUser: { ...testUser, mobileVerified },
          }),
        })}
      >
        <ConfirmIncomingSwap swap={swap()} />
      </TestSessionProvider>
    </MemoryRouter>,
  );
}

describe("ConfirmIncomingSwap", () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync = vi.fn().mockResolvedValue({ swap: {}, session: null });
    useSwapMutation.mockReturnValue({ mutateAsync, isPending: false });
  });

  it("says who wants to swap", () => {
    renderState();

    expect(
      screen.getByText("Grace H would like to swap their vote with you!"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("profile-card")).toBeInTheDocument();
  });

  it("sends an unverified user to verify before they can confirm", () => {
    renderState(false);

    expect(
      screen.getByText("You must verify your mobile number before you swap"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Verify your mobile number" }),
    ).toHaveAttribute("href", "/app/mobile");
    expect(
      screen.queryByRole("button", { name: "Swap with Grace H" }),
    ).not.toBeInTheDocument();
  });

  it("refuses to confirm without email consent", async () => {
    renderState();

    await userEvent.click(
      screen.getByRole("button", { name: "Swap with Grace H" }),
    );

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(
      screen.getByText(/need to be able to contact each other by email/),
    ).toBeInTheDocument();
  });

  it("confirms once consent is ticked", async () => {
    renderState();

    await userEvent.click(
      screen.getByRole("checkbox", {
        name: /my email address will be shared with Grace H/,
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Swap with Grace H" }),
    );

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(undefined));
  });

  it("opens the reject modal from the escape hatch", async () => {
    renderState();

    expect(screen.queryByTestId("reject-modal")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", {
        name: "I'd prefer to swap with someone else",
      }),
    );

    expect(screen.getByTestId("reject-modal")).toBeInTheDocument();
  });
});
