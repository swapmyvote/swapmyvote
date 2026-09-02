import { apiClient } from "@/lib/apiClient";
import type { MobileVerificationSent, SessionPayload } from "@/types/api";

const verificationsPath = "/mobile_phone/verifications";

/** Ask for an SMS code. Omitting the number re-sends to the one on file;
 *  a different number replaces it and starts a fresh verification. */
export function sendVerification(
  number?: string,
): Promise<MobileVerificationSent> {
  return apiClient.post<MobileVerificationSent>(
    verificationsPath,
    number === undefined ? {} : { number },
  );
}

/** Check the code. Answers with the whole session payload, since
 *  `mobileVerified` flips here. */
export function confirmVerification(token: string): Promise<SessionPayload> {
  return apiClient.post<SessionPayload>(`${verificationsPath}/confirm`, {
    token,
  });
}
