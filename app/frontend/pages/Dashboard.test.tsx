import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "@/pages/Dashboard";
import {
  sessionPayload,
  sessionValue,
  TestSessionProvider,
  testUser,
} from "@/test/sessionFixtures";
import type { SwapDetail } from "@/types/api";

const useSwap = vi.hoisted(() => vi.fn());
vi.mock("@/lib/swap", () => ({ useSwap }));
vi.mock("@/components/swap/ConfirmOutgoingSwap", () => ({
  ConfirmOutgoingSwap: () => <div data-testid="outgoing" />,
}));
vi.mock("@/components/swap/ConfirmIncomingSwap", () => ({
  ConfirmIncomingSwap: () => <div data-testid="incoming" />,
}));
vi.mock("@/components/swap/SwapConfirmed", () => ({
  SwapConfirmed: () => <div data-testid="confirmed" />,
}));
vi.mock("@/components/profile/InfoSummary", () => ({
  InfoSummary: () => <div data-testid="info-summary" />,
}));

function detail(overrides: Partial<SwapDetail> = {}): SwapDetail {
  return {
    id: 7,
    state: "outgoing",
    confirmed: false,
    consentGiven: false,
    validityHours: 48,
    partner: null,
    ...overrides,
  };
}

function renderPage(value = sessionValue()) {
  return render(
    <MemoryRouter initialEntries={["/app/dashboard"]}>
      <TestSessionProvider value={value}>
        <Routes>
          <Route path="/app/dashboard" element={<Dashboard />} />
          <Route path="/app/swap" element={<div>Find a swap</div>} />
          <Route path="/app/constituency" element={<div>Constituency</div>} />
        </Routes>
      </TestSessionProvider>
    </MemoryRouter>,
  );
}

const loggedIn = sessionValue({
  session: sessionPayload({ currentUser: testUser }),
});

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSwap.mockReturnValue({ data: null, isPending: false, isError: false });
  });

  it("asks people to log in first", () => {
    renderPage();

    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
    // /api/v1/swap requires a logged-in user: polling it for an anonymous
    // visitor would just 401 every 15 seconds behind this prompt.
    expect(useSwap).toHaveBeenCalledWith(false);
  });

  it("sends a user with no swap off to find one", () => {
    renderPage(loggedIn);

    expect(screen.getByText("Find a swap")).toBeInTheDocument();
    expect(useSwap).toHaveBeenCalledWith(true);
  });

  it("sends a user with no constituency to set one", () => {
    renderPage(
      sessionValue({
        session: sessionPayload({
          currentUser: {
            ...testUser,
            hasConstituency: false,
            constituencyOnsId: null,
          },
        }),
      }),
    );

    expect(screen.getByText("Constituency")).toBeInTheDocument();
  });

  it("sends a user with no email address to set one", () => {
    renderPage(
      sessionValue({
        session: sessionPayload({ currentUser: { ...testUser, email: null } }),
      }),
    );

    expect(screen.getByText("Constituency")).toBeInTheDocument();
  });

  it("shows the outgoing state", () => {
    useSwap.mockReturnValue({
      data: detail({ state: "outgoing" }),
      isPending: false,
      isError: false,
    });

    renderPage(loggedIn);

    expect(screen.getByTestId("outgoing")).toBeInTheDocument();
  });

  it("shows the incoming state", () => {
    useSwap.mockReturnValue({
      data: detail({ state: "incoming" }),
      isPending: false,
      isError: false,
    });

    renderPage(loggedIn);

    expect(screen.getByTestId("incoming")).toBeInTheDocument();
  });

  it("shows the confirmed state whichever side confirmed it", () => {
    useSwap.mockReturnValue({
      data: detail({ state: "incoming", confirmed: true }),
      isPending: false,
      isError: false,
    });

    renderPage(loggedIn);

    expect(screen.getByTestId("confirmed")).toBeInTheDocument();
    expect(screen.queryByTestId("incoming")).not.toBeInTheDocument();
  });

  it("ends with the info summary", () => {
    useSwap.mockReturnValue({
      data: detail(),
      isPending: false,
      isError: false,
    });

    renderPage(loggedIn);

    expect(screen.getByTestId("info-summary")).toBeInTheDocument();
  });
});
