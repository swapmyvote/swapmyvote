import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sessionQueryKey } from "@/contexts/SessionContext";
import { apiClient } from "@/lib/apiClient";
import {
  cancelSwap,
  offerSwap,
  potentialSwapsQueryKey,
  swapQueryKey,
  useSwap,
  useSwapMutation,
} from "@/lib/swap";
import { loggedOutSession } from "@/test/sessionFixtures";

vi.mock("@/lib/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function harness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return { queryClient, Wrapper };
}

const swapDetail = {
  id: 7,
  state: "outgoing" as const,
  confirmed: false,
  consentGiven: true,
  validityHours: 48,
  partner: null,
};

describe("useSwap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the current swap", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ swap: swapDetail });
    const { Wrapper } = harness();

    const { result } = renderHook(() => useSwap(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith("/swap");
    expect(result.current.data).toEqual(swapDetail);
  });
});

describe("useSwapMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("primes both caches from one response", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      swap: swapDetail,
      session: loggedOutSession,
    });
    const { queryClient, Wrapper } = harness();

    const { result } = renderHook(() => useSwapMutation(offerSwap), {
      wrapper: Wrapper,
    });
    result.current.mutate({ userId: 3, consentShareEmail: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(swapQueryKey)).toEqual(swapDetail);
    expect(queryClient.getQueryData(sessionQueryKey)).toEqual(loggedOutSession);
  });

  it("invalidates the candidate list, which the swap has just consumed", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({
      swap: null,
      session: loggedOutSession,
    });
    const { queryClient, Wrapper } = harness();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useSwapMutation(cancelSwap), {
      wrapper: Wrapper,
    });
    result.current.mutate(undefined);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: potentialSwapsQueryKey,
    });
  });
});

describe("offerSwap", () => {
  it("sends snake_case keys, which is what strong parameters permit", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      swap: swapDetail,
      session: loggedOutSession,
    });

    await offerSwap({ userId: 3, consentShareEmail: true });

    expect(apiClient.post).toHaveBeenCalledWith("/swap", {
      user_id: 3,
      consent_share_email: true,
    });
  });
});
