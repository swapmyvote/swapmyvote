import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "@/contexts/SessionContext";
import { useSession } from "@/contexts/useSession";
import { apiClient } from "@/lib/apiClient";
import { sessionPayload, TEST_USER } from "@/test/sessionFixtures";

vi.mock("@/lib/apiClient", () => ({
  apiClient: { get: vi.fn(), delete: vi.fn() },
}));

function Probe() {
  const { session, isLoading, isError, refetchSession, logOut } = useSession();
  return (
    <div>
      <span data-testid="state">
        {isLoading ? "loading" : isError ? "error" : "ready"}
      </span>
      <span data-testid="user">{session?.currentUser?.name ?? "none"}</span>
      <button type="button" onClick={() => refetchSession()}>
        Refetch
      </button>
      <button type="button" onClick={() => logOut()}>
        Log out
      </button>
    </div>
  );
}

function renderWithProvider(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>,
  );
}

describe("SessionProvider", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue(
      sessionPayload({ currentUser: TEST_USER }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the session payload from the versioned endpoint", async () => {
    renderWithProvider(<Probe />);

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("Ada Lovelace");
    });
    expect(apiClient.get).toHaveBeenCalledWith("/session");
  });

  it("reports loading before the first fetch resolves", () => {
    renderWithProvider(<Probe />);

    expect(screen.getByTestId("state")).toHaveTextContent("loading");
  });

  it("reports an error, with no session, when the fetch fails", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("network down"));

    renderWithProvider(<Probe />);

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("error");
    });
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("keeps the last good payload when a later refetch fails", async () => {
    renderWithProvider(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("Ada Lovelace");
    });

    vi.mocked(apiClient.get).mockRejectedValue(new Error("network down"));
    await userEvent.click(screen.getByRole("button", { name: "Refetch" }));

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("error");
    });
    // An error does not mean "logged out" — the chrome keeps rendering the
    // user it last knew about rather than flickering to a logged-out state.
    expect(screen.getByTestId("user")).toHaveTextContent("Ada Lovelace");
  });

  it("logs out through the API and primes the cache from the response", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(
      sessionPayload({ currentUser: null }),
    );

    renderWithProvider(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("Ada Lovelace");
    });

    await userEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(apiClient.delete).toHaveBeenCalledWith("/session");
    // No refetch needed: the logged-out payload the server returned is written
    // straight into the cache.
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("none");
    });
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});
