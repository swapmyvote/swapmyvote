import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/apiClient";
import { requestPasswordReset, useResetPassword } from "@/lib/password";
import {
  loggedOutSession,
  sessionPayload,
  testUser,
} from "@/test/sessionFixtures";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("password", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("posts the address to request a reset", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ status: "accepted" });

    await requestPasswordReset("ada@example.com");

    expect(post).toHaveBeenCalledWith("/password", {
      email: "ada@example.com",
    });
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

    await waitFor(() => {
      expect(result.current.data).toEqual(session);
    });
    expect(session).not.toEqual(loggedOutSession);
  });
});
