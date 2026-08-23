import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  ConstituencyDetail,
  ProfileUpdate,
  ProfileUpdateResult,
} from "@/types/api";

/**
 * Save the logged-in user's profile. Only the fields passed are sent, so the
 * constituency screen can post its two without clearing the parties.
 *
 * The API keys are snake_case (Rails strong parameters); the camelCase names
 * stop at this boundary.
 */
export function updateProfile(
  update: ProfileUpdate,
): Promise<ProfileUpdateResult> {
  const body: Record<string, string> = {};
  if (update.preferredPartyId !== undefined) {
    body.preferred_party_id = update.preferredPartyId;
  }
  if (update.willingPartyId !== undefined) {
    body.willing_party_id = update.willingPartyId;
  }
  if (update.constituencyOnsId !== undefined) {
    body.constituency_ons_id = update.constituencyOnsId;
  }
  if (update.email !== undefined) {
    body.email = update.email;
  }
  return apiClient.patch<ProfileUpdateResult>("/user", body);
}

/**
 * One constituency and its polls, for the review screen's chart. Polling
 * numbers are re-seeded between elections, never mid-session, so this opts out
 * of refetching the same way the other reference data does.
 */
export function useConstituencyDetail(
  onsId: string | null,
): UseQueryResult<ConstituencyDetail> {
  return useQuery({
    queryKey: ["constituency", onsId],
    queryFn: () =>
      apiClient.get<ConstituencyDetail>(`/constituencies/${onsId}`),
    enabled: onsId !== null && onsId !== "",
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });
}
