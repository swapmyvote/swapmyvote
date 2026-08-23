import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/apiClient";
import {
  useConstituencies,
  useElection,
  useParties,
} from "@/lib/referenceData";

vi.mock("@/lib/apiClient", () => ({ apiClient: { get: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("reference data hooks", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["useParties", useParties, "/parties"],
    ["useConstituencies", useConstituencies, "/constituencies"],
    ["useElection", useElection, "/election"],
  ])("%s reads %s", async (_name, useHook, path) => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    const { result } = renderHook(() => useHook(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(apiClient.get).toHaveBeenCalledWith(path);
  });

  it("never goes stale — none of this changes while the page is open", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    const { result } = renderHook(() => useParties(), { wrapper });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // The session polls; reference data must not, or every open tab would
    // re-request the party list on a timer for data that changes at seed time.
    expect(result.current.isStale).toBe(false);
  });
});
