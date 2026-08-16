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
export const CLOSED_APP_MODE: AppModeContextValue = {
  appMode: null,
  loginsOpen: false,
  swappingOpen: false,
  votingOpen: false,
  votingInfoLocked: false,
  isLoaded: false,
};

export const AppModeContext =
  createContext<AppModeContextValue>(CLOSED_APP_MODE);

/**
 * The operational phase, split out of the session payload so components that
 * only care about "is swapping open?" don't re-render on user or swap changes.
 * Phase rules themselves live in Ruby (AppModeConcern) — this is only their
 * projection for the UI.
 */
export function AppModeProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();

  const value = useMemo<AppModeContextValue>(() => {
    if (!session) {
      return CLOSED_APP_MODE;
    }
    return {
      appMode: session.appMode,
      loginsOpen: session.flags.loginsOpen,
      swappingOpen: session.flags.swappingOpen,
      votingOpen: session.flags.votingOpen,
      votingInfoLocked: session.flags.votingInfoLocked,
      isLoaded: true,
    };
  }, [session]);

  return (
    <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>
  );
}
