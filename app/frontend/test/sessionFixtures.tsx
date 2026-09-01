import type { ReactNode } from "react";
import { AppModeProvider } from "@/contexts/AppModeContext";
import {
  SessionContext,
  type SessionContextValue,
} from "@/contexts/SessionContext";
import type {
  CurrentUser,
  SessionFlags,
  SessionPayload,
  SwapSummary,
} from "@/types/api";

// Fixtures + a harness for components that read the session. They inject a
// SessionContext value directly rather than standing up react-query and a
// fetch mock — SessionProvider's own wiring is covered by its own test.

export const loggedOutSession: SessionPayload = {
  appMode: "open",
  flags: {
    loginsOpen: true,
    swappingOpen: true,
    votingOpen: false,
    votingInfoLocked: false,
  },
  currentUser: null,
  swap: null,
};

export const testUser: CurrentUser = {
  id: 1,
  name: "Ada Lovelace",
  email: "ada@example.com",
  imageUrl: "https://example.com/ada.png",
  hasConstituency: true,
  constituencyName: "Woking",
  constituencyOnsId: "E14001009",
  mobileNumber: "+447911123456",
  mobileVerified: true,
  mobileSetButNotVerified: false,
  preferredParty: { id: 1, name: "Green", color: "#6AB023", smvCode: "grn" },
  willingParty: { id: 2, name: "Labour", color: "#DC241f", smvCode: "lab" },
};

export const testSwap: SwapSummary = {
  id: 7,
  state: "outgoing",
  confirmed: false,
  partner: {
    name: "Grace Hopper",
    imageUrl: "https://example.com/grace.png",
    constituencyName: "Wakefield",
  },
};

export function sessionPayload(
  overrides: Partial<Omit<SessionPayload, "flags">> & {
    flags?: Partial<SessionFlags>;
  } = {},
): SessionPayload {
  return {
    ...loggedOutSession,
    ...overrides,
    flags: { ...loggedOutSession.flags, ...overrides.flags },
  };
}

export function sessionValue(
  overrides: Partial<SessionContextValue> = {},
): SessionContextValue {
  return {
    session: loggedOutSession,
    isLoading: false,
    isError: false,
    refetchSession: () => Promise.resolve(null),
    logOut: () => Promise.resolve(loggedOutSession),
    ...overrides,
  };
}

export function TestSessionProvider({
  value,
  children,
}: {
  value: SessionContextValue;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={value}>
      <AppModeProvider>{children}</AppModeProvider>
    </SessionContext.Provider>
  );
}
