import { QueryClient } from "@tanstack/react-query";

// Server state for swapmyvote is live and changes out-of-band (a partner
// confirms/cancels a swap, unconfirmed swaps auto-expire), so defaults lean
// towards refetching. Per-query overrides tune staleness (short for swap
// state, long for reference data like parties/constituencies).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
