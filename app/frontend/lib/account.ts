import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { sessionQueryKey } from "@/contexts/SessionContext";
import { apiClient } from "@/lib/apiClient";
import type { SessionPayload } from "@/types/api";

const userPath = "/user";

/**
 * Delete the logged-in account, permanently.
 *
 * The server tears down the swap and emails the partner (User and Swap both
 * have before_destroy hooks), so there is nothing to do here but prime the
 * now-signed-out session so the chrome stops showing a logged-in user.
 */
export function useDeleteAccount(): UseMutationResult<
  SessionPayload,
  Error,
  void
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.delete<SessionPayload>(userPath),
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session);
    },
  });
}
