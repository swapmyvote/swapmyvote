import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sessionQueryKey } from "@/contexts/SessionContext";
import { apiClient } from "@/lib/apiClient";
import { useRequestPasswordReset, useResetPassword } from "@/lib/password";
import { sessionPayload, testUser } from "@/test/sessionFixtures";

// Held out here, not built inside `wrapper`: the point of the cache tests is
// what the mutations write into the session cache, which is unreadable from a
// client the test has no reference to (and a fresh one per render would not
// be the client the hook wrote to anyway).
let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("password", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it("posts the address to request a reset", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ status: "accepted" });
    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper });

    result.current.mutate("ada@example.com");

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("/password", {
        email: "ada@example.com",
      });
    });
  });

  // The 202 carries no session payload, and asking for instructions does not
  // change who is logged in, so this must leave the session cache alone.
  it("does not touch the session cache when requesting a reset", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValue({ status: "accepted" });
    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper });

    result.current.mutate("ada@example.com");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(queryClient.getQueryData(sessionQueryKey)).toBeUndefined();
  });

  // snake_case at the API boundary, as lib/auth.ts and lib/profile.ts do.
  it("puts the token and both password fields to complete a reset", async () => {
    const put = vi
      .spyOn(apiClient, "put")
      .mockResolvedValue(sessionPayload({ currentUser: testUser }));
    const { result } = renderHook(() => useResetPassword(), { wrapper });

    result.current.mutate({
      token: "a-token",
      password: "correct-horse",
      passwordConfirmation: "correct-horse",
    });

    await waitFor(() => {
      expect(put).toHaveBeenCalledWith("/password", {
        token: "a-token",
        password: "correct-horse",
        password_confirmation: "correct-horse",
      });
    });
  });

  it("primes the session cache from the response", async () => {
    const session = sessionPayload({ currentUser: testUser });
    vi.spyOn(apiClient, "put").mockResolvedValue(session);
    const { result } = renderHook(() => useResetPassword(), { wrapper });

    result.current.mutate({
      token: "a-token",
      password: "correct-horse",
      passwordConfirmation: "correct-horse",
    });

    // The cache, not `result.current.data` — the latter is only the mocked
    // resolve value and says nothing about the chrome going signed-in.
    await waitFor(() => {
      expect(queryClient.getQueryData(sessionQueryKey)).toEqual(session);
    });
  });
});
