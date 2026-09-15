import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeleteAccount } from "@/lib/account";
import { apiClient } from "@/lib/apiClient";
import { loggedOutSession } from "@/test/sessionFixtures";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("account", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
    expect(result.current.data?.currentUser).toBeNull();
  });
});
