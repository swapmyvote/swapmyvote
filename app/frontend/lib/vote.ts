import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { sessionQueryKey } from "@/contexts/SessionContext";
import { apiClient } from "@/lib/apiClient";
import type { SessionPayload } from "@/types/api";

const votePath = "/vote";

/**
 * Records "I've voted", which also emails the swap partner server-side.
 *
 * The endpoint answers with the whole session payload rather than a bare
 * acknowledgement, so priming the session cache from the response updates
 * `hasVoted` everywhere without a refetch. Safe to fire twice: the server is
 * idempotent and sends no second email.
 */
export function useRecordVote(): UseMutationResult<
  SessionPayload,
  Error,
  void
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<SessionPayload>(votePath),
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session);
    },
  });
}
