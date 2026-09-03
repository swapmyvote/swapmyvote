import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { sessionQueryKey } from "@/contexts/SessionContext";
import { apiClient } from "@/lib/apiClient";
import type {
  PotentialSwapsResponse,
  SwapCandidate,
  SwapDetail,
  SwapMutationResult,
} from "@/types/api";

export const swapQueryKey = ["swap"] as const;
export const potentialSwapsQueryKey = ["potentialSwaps"] as const;

/**
 * Verbatim from User#swap_consent_given?, so the client's own refusal reads
 * exactly like the server's. Lives here because both the offer screen and the
 * incoming-confirm screen refuse locally before spending a round trip.
 */
export const consentMessage =
  "You and your vote swap partner need to be able to contact each other by " +
  "email so you can establish trust between you. (See the FAQ)";

const swapPath = "/swap";
const potentialSwapsPath = "/potential_swaps";

/**
 * The current swap. Polled, unlike everything else the SPA reads: a partner
 * can confirm or reject while this page is open, and Swap.cancel_old expires
 * unconfirmed swaps on a schedule.
 */
export function useSwap(): UseQueryResult<SwapDetail | null> {
  return useQuery({
    queryKey: swapQueryKey,
    queryFn: async () => {
      const body = await apiClient.get<{ swap: SwapDetail | null }>(swapPath);
      return body.swap;
    },
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * The candidate list. Fetching it *generates* it — the endpoint expires stale
 * PotentialSwap rows and creates replacements — so this deliberately never
 * refetches on its own. A user's match set changes when they ask for it, not
 * when they alt-tab back to the page.
 */
export function usePotentialSwaps(
  enabled = true,
): UseQueryResult<PotentialSwapsResponse> {
  return useQuery({
    queryKey: potentialSwapsQueryKey,
    queryFn: () => apiClient.get<PotentialSwapsResponse>(potentialSwapsPath),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/** One candidate, for a cold load of the offer screen. Scoped server-side to
 *  candidates this user has actually been offered. */
export function usePotentialSwap(
  userId: number | null,
): UseQueryResult<SwapCandidate> {
  return useQuery({
    queryKey: ["potentialSwap", userId],
    queryFn: async () => {
      const body = await apiClient.get<{ potentialSwap: SwapCandidate }>(
        `${potentialSwapsPath}/${userId}`,
      );
      return body.potentialSwap;
    },
    enabled: userId !== null,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });
}

export interface OfferSwapInput {
  userId: number;
  consentShareEmail: boolean;
}

/** Offer to swap with a candidate. The API keys are snake_case (Rails strong
 *  parameters); the camelCase names stop at this boundary. */
export function offerSwap({
  userId,
  consentShareEmail,
}: OfferSwapInput): Promise<SwapMutationResult> {
  return apiClient.post<SwapMutationResult>(swapPath, {
    user_id: userId,
    consent_share_email: consentShareEmail,
  });
}

/** Confirm an incoming swap. Consent is not optional here: the server refuses
 *  to confirm without it, exactly as the legacy controller does. */
export function confirmSwap(): Promise<SwapMutationResult> {
  return apiClient.patch<SwapMutationResult>(swapPath, {
    confirmed: true,
    consent_share_email: true,
  });
}

/** Consent to share an email address, without confirming anything. */
export function shareEmail(): Promise<SwapMutationResult> {
  return apiClient.patch<SwapMutationResult>(swapPath, {
    consent_share_email: true,
  });
}

/** Reject an incoming swap. Only the chosen side can do this. */
export function cancelSwap(): Promise<SwapMutationResult> {
  return apiClient.delete<SwapMutationResult>(swapPath);
}

/**
 * Wraps any of the four mutations above with the cache work they all need:
 * prime the swap and session caches from the one response, and drop the
 * candidate list, which the mutation has either consumed or invalidated.
 */
export function useSwapMutation<TInput>(
  mutationFn: (input: TInput) => Promise<SwapMutationResult>,
): UseMutationResult<SwapMutationResult, Error, TInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      queryClient.setQueryData(swapQueryKey, result.swap);
      queryClient.setQueryData(sessionQueryKey, result.session);
      queryClient.invalidateQueries({ queryKey: potentialSwapsQueryKey });
    },
  });
}
