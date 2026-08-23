import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  analyticsAllowed as isAnalyticsAllowed,
  type ConsentStatus,
  readConsent,
  saveConsent,
} from "@/lib/cookieConsent";

export type CookieConsent = {
  status: ConsentStatus | null;
  hasAnswered: boolean;
  analyticsAllowed: boolean;
  accept: () => void;
  decline: () => void;
};

const CookieConsentContext = createContext<CookieConsent | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus | null>(() =>
    readConsent(),
  );

  // The cookie write is best-effort: if it fails (hardened privacy settings),
  // still update state so the banner dismisses for this session rather than
  // becoming undismissable.
  const record = useCallback((next: ConsentStatus) => {
    saveConsent(next);
    setStatus(next);
  }, []);

  const value = useMemo<CookieConsent>(
    () => ({
      status,
      hasAnswered: status !== null,
      analyticsAllowed: isAnalyticsAllowed(status),
      accept: () => record("allow"),
      decline: () => record("deny"),
    }),
    [status, record],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsent {
  const value = useContext(CookieConsentContext);
  if (value === null) {
    throw new Error(
      "useCookieConsent must be used inside a CookieConsentProvider",
    );
  }
  return value;
}
