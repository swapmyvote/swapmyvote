import { apiClient } from "@/lib/apiClient";
import type { MobileVerificationSent, SessionPayload } from "@/types/api";

const verificationsPath = "/mobile_phone/verifications";

/**
 * Ask for an SMS code. Omitting the number re-sends to the one already on the
 * account, which is what the legacy page's "re-sending" link does; passing a
 * different number replaces it and starts a fresh verification.
 */
export function sendVerification(
  number?: string,
): Promise<MobileVerificationSent> {
  return apiClient.post<MobileVerificationSent>(
    verificationsPath,
    number === undefined ? {} : { number },
  );
}

/**
 * Check the code. The server answers with the whole session payload —
 * `mobileVerified` flips here — but the current caller
 * (MobileVerification.tsx) discards it and calls `onVerified`, which
 * Mobile.tsx uses to trigger a plain `refetchSession()` instead of reading
 * this response. The payload is still returned so a future caller can prime
 * its session cache from it rather than racing a refetch, which was the
 * original intent for shipping it here; nothing in this codebase does that
 * yet.
 */
export function confirmVerification(token: string): Promise<SessionPayload> {
  return apiClient.post<SessionPayload>(`${verificationsPath}/confirm`, {
    token,
  });
}
