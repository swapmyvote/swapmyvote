import { createContext, type ReactNode, useMemo } from "react";
import { useSession } from "@/contexts/useSession";
import type { AppMode } from "@/types/api";

export interface AppModeContextValue {
  /** null until the session has loaded. */
  appMode: AppMode | null;
  loginsOpen: boolean;
  swappingOpen: boolean;
  votingOpen: boolean;
  votingInfoLocked: boolean;
  /** False while the phase is still unknown. */
  isLoaded: boolean;
}

// Everything defaults to closed until the server tells us otherwise, so a
// slow or failed session fetch hides capabilities rather than offering ones
// the API would then reject.
export const closedAppMode: AppModeContextValue = {
  appMode: null,
  loginsOpen: false,
  swappingOpen: false,
  votingOpen: false,
  votingInfoLocked: false,
  isLoaded: false,
};

export const AppModeContext = createContext<AppModeContextValue>(closedAppMode);

/**
 * The operational phase, split out of the session payload so components that
 * only care about "is swapping open?" don't re-render on user or swap changes.
 * Phase rules themselves live in Ruby (AppModeConcern) — this is only their
 * projection for the UI.
 */
export function AppModeProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();

  // Depend on the individual flags, not the session object: every poll and
  // refetch produces a fresh object, so memoising on its identity would hand
  // consumers a new context value whenever the user or swap changed — exactly
  // the re-renders this provider exists to avoid.
  const appMode = session?.appMode ?? null;
  const loginsOpen = session?.flags.loginsOpen ?? false;
  const swappingOpen = session?.flags.swappingOpen ?? false;
  const votingOpen = session?.flags.votingOpen ?? false;
  const votingInfoLocked = session?.flags.votingInfoLocked ?? false;

  const value = useMemo<AppModeContextValue>(() => {
    if (appMode === null) {
      return closedAppMode;
    }
    return {
      appMode,
      loginsOpen,
      swappingOpen,
      votingOpen,
      votingInfoLocked,
      isLoaded: true,
    };
  }, [appMode, loginsOpen, swappingOpen, votingOpen, votingInfoLocked]);

  return (
    <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>
  );
}
