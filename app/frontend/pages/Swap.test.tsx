import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Swap } from "@/pages/Swap";
import {
  sessionPayload,
  sessionValue,
  TestSessionProvider,
  testSwap,
  testUser,
} from "@/test/sessionFixtures";

const usePotentialSwaps = vi.hoisted(() => vi.fn());
vi.mock("@/lib/swap", () => ({ usePotentialSwaps }));
vi.mock("@/components/swap/PotentialSwapList", () => ({
  PotentialSwapList: () => <div data-testid="candidate-list" />,
}));
vi.mock("@/components/swap/SearchingForSwap", () => ({
  SearchingForSwap: () => <div data-testid="searching" />,
}));
vi.mock("@/components/profile/InfoSummary", () => ({
  InfoSummary: () => <div data-testid="info-summary" />,
}));

function renderPage(value = sessionValue()) {
  return render(
    <MemoryRouter initialEntries={["/app/swap"]}>
      <TestSessionProvider value={value}>
        <Routes>
          <Route path="/app/swap" element={<Swap />} />
          <Route path="/app/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </TestSessionProvider>
    </MemoryRouter>,
  );
}

const loggedIn = sessionValue({
  session: sessionPayload({ currentUser: testUser }),
});

describe("Swap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePotentialSwaps.mockReturnValue({
      data: { potentialSwaps: [], expiryMinutes: 120 },
      isPending: false,
      isError: false,
    });
  });

  it("asks people to log in first", () => {
    renderPage();

    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(usePotentialSwaps).toHaveBeenCalledWith(false);
  });

  it("shows the empty state when there are no candidates", () => {
    renderPage(loggedIn);

    expect(screen.getByTestId("searching")).toBeInTheDocument();
    expect(screen.queryByTestId("candidate-list")).not.toBeInTheDocument();
    expect(usePotentialSwaps).toHaveBeenCalledWith(true);
  });

  it("shows a spinner while the candidate list is loading", () => {
    usePotentialSwaps.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    });

    renderPage(loggedIn);

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("shows an error message when the candidate list fails to load", () => {
    usePotentialSwaps.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    });

    renderPage(loggedIn);

    expect(
      screen.getByText(/We couldn't load your potential swaps/),
    ).toBeInTheDocument();
  });

  it("shows the list when there are candidates", () => {
    usePotentialSwaps.mockReturnValue({
      data: {
        potentialSwaps: [{ userId: 3 }],
        expiryMinutes: 120,
      },
      isPending: false,
      isError: false,
    });

    renderPage(loggedIn);

    expect(screen.getByTestId("candidate-list")).toBeInTheDocument();
  });

  it("sends an already-swapped user to their dashboard", () => {
    renderPage(
      sessionValue({
        session: sessionPayload({ currentUser: testUser, swap: testSwap }),
      }),
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(usePotentialSwaps).toHaveBeenCalledWith(false);
  });

  it("ends with the info summary", () => {
    renderPage(loggedIn);

    expect(screen.getByTestId("info-summary")).toBeInTheDocument();
  });
});
