import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sessionQueryKey } from "@/contexts/SessionContext";
import { useDeleteAccount } from "@/lib/account";
import { apiClient } from "@/lib/apiClient";
import { loggedOutSession } from "@/test/sessionFixtures";

// Held out here, not built inside `wrapper`: the point of these tests is what
// the mutation writes into the session cache, which is unreadable from a
// client the test has no reference to (and a fresh one per render would not
// be the client the hook wrote to anyway).
let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("account", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it("deletes the account and primes the signed-out session", async () => {
    const destroy = vi
      .spyOn(apiClient, "delete")
      .mockResolvedValue(loggedOutSession);
    const { result } = renderHook(() => useDeleteAccount(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(destroy).toHaveBeenCalledWith("/user");
    });

    // The cache, not `result.current.data` — the latter is only the mocked
    // resolve value and says nothing about the chrome going signed-out.
    await waitFor(() => {
      expect(queryClient.getQueryData(sessionQueryKey)).toEqual(
        loggedOutSession,
      );
    });
  });
});
