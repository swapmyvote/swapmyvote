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
 * Check the code. Answers with the whole session payload, because verifying
 * flips `mobileVerified` — so the caller can prime its session cache from the
 * response rather than racing a refetch.
 */
export function confirmVerification(token: string): Promise<SessionPayload> {
  return apiClient.post<SessionPayload>(`${verificationsPath}/confirm`, {
    token,
  });
}
