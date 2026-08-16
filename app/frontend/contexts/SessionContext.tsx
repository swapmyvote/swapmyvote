import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useMemo } from "react";
import { apiClient } from "@/lib/apiClient";
import type { SessionPayload } from "@/types/api";

export const SESSION_PATH = "/session";
export const SESSION_QUERY_KEY = ["session"] as const;

export interface SessionContextValue {
  /** null until the first fetch resolves, or if it failed. */
  session: SessionPayload | null;
  isLoading: boolean;
  isError: boolean;
  /** Re-read the session. Call after any mutation that could change auth,
   *  phase or swap state. */
  refetchSession: () => Promise<unknown>;
  /** Log out, and prime the cache from the logged-out payload the server
   *  returns so no refetch has to race the redirect. */
  logOut: () => Promise<SessionPayload>;
}

// Exported so tests (and Storybook-style harnesses) can supply a session
// directly instead of standing up react-query and a fetch mock.
export const SessionContext = createContext<SessionContextValue | null>(null);

export function fetchSession(): Promise<SessionPayload> {
  return apiClient.get<SessionPayload>(SESSION_PATH);
}

/**
 * Holds `GET /api/v1/session` — who we are, which operational phase the site
 * is in, and the state of our swap. It is the SPA's single source of truth for
 * all three.
 *
 * Swap state changes out of band (a partner confirms or cancels, unconfirmed
 * swaps expire), so this polls and refetches on window focus rather than
 * trusting a value fetched once at mount.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const { refetch } = query;
  const refetchSession = useCallback(() => refetch(), [refetch]);

  const logOut = useCallback(async () => {
    const payload = await apiClient.delete<SessionPayload>(SESSION_PATH);
    queryClient.setQueryData(SESSION_QUERY_KEY, payload);
    return payload;
  }, [queryClient]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session: query.data ?? null,
      isLoading: query.isPending,
      isError: query.isError,
      refetchSession,
      logOut,
    }),
    [query.data, query.isPending, query.isError, refetchSession, logOut],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
