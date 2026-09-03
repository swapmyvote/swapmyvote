import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SwapNew } from "@/pages/SwapNew";
import {
  sessionPayload,
  sessionValue,
  TestSessionProvider,
  testUser,
} from "@/test/sessionFixtures";

const usePotentialSwap = vi.hoisted(() => vi.fn());
const useSwapMutation = vi.hoisted(() => vi.fn());
const offerSwap = vi.hoisted(() => vi.fn());
vi.mock("@/lib/swap", () => ({
  usePotentialSwap,
  useSwapMutation,
  offerSwap,
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

const candidate = {
  userId: 3,
  name: "Grace H",
  imageUrl: "https://example.com/grace.png",
  constituencyName: "Wakefield",
  constituencyOnsId: "E14001009",
  badges: { mobileVerified: true, provider: null, hasEmail: true },
  preferredParty: { id: 2, name: "Labour", color: "#DC241f", smvCode: "lab" },
  willingParty: { id: 1, name: "Green", color: "#6AB023", smvCode: "grn" },
  polls: [],
  recommendations: [],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/app/swap/new/3"]}>
      <TestSessionProvider
        value={sessionValue({
          session: sessionPayload({ currentUser: testUser }),
        })}
      >
        <Routes>
          <Route path="/app/swap/new/:userId" element={<SwapNew />} />
          <Route path="/app/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </TestSessionProvider>
    </MemoryRouter>,
  );
}

describe("SwapNew", () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync = vi.fn().mockResolvedValue({ swap: {}, session: null });
    usePotentialSwap.mockReturnValue({
      data: candidate,
      isPending: false,
      isError: false,
    });
    useSwapMutation.mockReturnValue({ mutateAsync, isPending: false });
  });

  it("asks for confirmation by the candidate's redacted name", () => {
    renderPage();

    expect(usePotentialSwap).toHaveBeenCalledWith(3);
    expect(screen.getByTestId("profile-card")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Are you sure you would like to swap your vote with Grace H?",
      ),
    ).toBeInTheDocument();
  });

  it("will not submit until consent is given", async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole("button", { name: "Swap with Grace H" }),
    );

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(
      screen.getByText(/need to be able to contact each other by email/),
    ).toBeInTheDocument();
  });

  it("offers the swap once consent is ticked, then goes to the dashboard", async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole("checkbox", {
        name: /my email address will be shared with Grace H/,
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Swap with Grace H" }),
    );

    expect(mutateAsync).toHaveBeenCalledWith({
      userId: 3,
      consentShareEmail: true,
    });
    await waitFor(() =>
      expect(screen.getByText("Dashboard")).toBeInTheDocument(),
    );
  });

  it("reports what the server refused", async () => {
    mutateAsync.mockRejectedValue(
      Object.assign(new Error("nope"), {
        name: "ApiError",
        messages: ["Chosen user is already swapped"],
      }),
    );
    renderPage();

    await userEvent.click(
      screen.getByRole("checkbox", {
        name: /my email address will be shared with Grace H/,
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Swap with Grace H" }),
    );

    await waitFor(() =>
      expect(
        screen.getByText("Something went wrong - please try that again."),
      ).toBeInTheDocument(),
    );
  });

  it("says so when the candidate is no longer on offer", () => {
    usePotentialSwap.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    });

    renderPage();

    expect(
      screen.getByText(/That person is no longer available to swap with/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Find another swap" }),
    ).toHaveAttribute("href", "/app/swap");
  });
});
