import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/apiClient";
import { useRecordVote } from "@/lib/vote";
import { sessionQueryKey } from "@/contexts/SessionContext";

vi.mock("@/lib/apiClient", () => ({
  apiClient: { post: vi.fn() },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useRecordVote", () => {
  it("posts to /vote and primes the session cache from the response", async () => {
    const session = { appMode: "open", currentUser: { hasVoted: true } };
    vi.mocked(apiClient.post).mockResolvedValue(session);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useRecordVote(), {
      wrapper: wrapper(client),
    });
    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(apiClient.post).toHaveBeenCalledWith("/vote");
    expect(client.getQueryData(sessionQueryKey)).toEqual(session);
  });
});
