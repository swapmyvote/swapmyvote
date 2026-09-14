import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Vote } from "@/pages/Vote";

const useSession = vi.hoisted(() => vi.fn());
const useSwap = vi.hoisted(() => vi.fn());
const mutate = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/useSession", () => ({ useSession }));
vi.mock("@/lib/swap", () => ({ useSwap }));
vi.mock("@/lib/vote", () => ({
  useRecordVote: () => ({ mutate, isPending: false }),
}));
vi.mock("@/components/auth/RequireLogin", () => ({
  RequireLogin: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("@/components/share/SocialShare", () => ({
  SocialShare: () => <div data-testid="social-share" />,
}));

function setUp({ hasVoted = false, confirmed = true } = {}) {
  useSession.mockReturnValue({
    session: {
      currentUser: {
        hasVoted,
        willingParty: { name: "Green Party" },
      },
    },
  });
  useSwap.mockReturnValue({
    isPending: false,
    data: confirmed ? { confirmed: true, partner: { name: "Sam" } } : null,
  });
}

describe("Vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <Vote />
      </MemoryRouter>,
    );
  }

  it("offers the button naming the party they are voting for", () => {
    setUp();
    renderPage();

    expect(
      screen.getByRole("button", {
        name: "Yes, I've voted! (for Green Party)",
      }),
    ).toBeInTheDocument();
  });

  it("names the partner it will email", () => {
    setUp();
    renderPage();

    expect(screen.getByText(/Sam/)).toBeInTheDocument();
  });

  it("records the vote when the button is pressed", async () => {
    setUp();
    renderPage();

    await userEvent.click(
      screen.getByRole("button", { name: /Yes, I've voted/ }),
    );

    expect(mutate).toHaveBeenCalled();
  });

  it("thanks a user who has already voted and offers sharing", () => {
    setUp({ hasVoted: true });
    renderPage();

    expect(screen.getByText(/Thanks!/)).toBeInTheDocument();
    expect(screen.getByText(/Sam/)).toBeInTheDocument();
    expect(screen.getByTestId("social-share")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /I've voted/ })).toBeNull();
  });

  it("sends a user without a confirmed swap to the dashboard", () => {
    setUp({ confirmed: false });
    renderPage();

    expect(screen.queryByRole("button", { name: /I've voted/ })).toBeNull();
  });

  it("waits for the swap poll rather than bouncing mid-load", () => {
    setUp();
    useSwap.mockReturnValue({ isPending: true, data: undefined });
    renderPage();

    expect(screen.queryByRole("button", { name: /I've voted/ })).toBeNull();
  });
});
