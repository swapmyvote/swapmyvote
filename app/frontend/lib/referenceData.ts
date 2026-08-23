import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { Constituency, Election, Party } from "@/types/api";

// Reference data for the entry form. Unlike the session, none of this changes
// while someone is on the page: parties and constituencies change only when we
// re-seed, and the election is fixed for the life of the deploy. So these
// opt out of the refetching the query client defaults to.
const neverStale = {
  staleTime: Number.POSITIVE_INFINITY,
  refetchOnWindowFocus: false,
} as const;

export function useParties(): UseQueryResult<Party[]> {
  return useQuery({
    queryKey: ["parties"],
    queryFn: () => apiClient.get<Party[]>("/parties"),
    ...neverStale,
  });
}

export function useConstituencies(): UseQueryResult<Constituency[]> {
  return useQuery({
    queryKey: ["constituencies"],
    queryFn: () => apiClient.get<Constituency[]>("/constituencies"),
    ...neverStale,
  });
}

export function useElection(): UseQueryResult<Election> {
  return useQuery({
    queryKey: ["election"],
    queryFn: () => apiClient.get<Election>("/election"),
    ...neverStale,
  });
}
