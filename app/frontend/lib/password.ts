import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { sessionQueryKey } from "@/contexts/SessionContext";
import { apiClient } from "@/lib/apiClient";
import type { SessionPayload } from "@/types/api";

const passwordPath = "/password";

export interface PasswordReset {
  token: string;
  password: string;
  passwordConfirmation: string;
}

/**
 * Ask for reset instructions.
 *
 * Always resolves for a well-formed request, whether or not the address is
 * registered — the API deliberately will not say which (see the M10 design
 * doc), so the screen must not promise the caller that mail is on its way to
 * an account that exists.
 */
export function requestPasswordReset(email: string): Promise<unknown> {
  return apiClient.post(passwordPath, { email });
}

/**
 * Complete a reset. Devise signs the user in on success, so this answers with
 * the session payload and priming the cache from it logs them in everywhere
 * without a refetch — the same move lib/auth.ts makes after login.
 */
export function useResetPassword(): UseMutationResult<
  SessionPayload,
  Error,
  PasswordReset
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reset: PasswordReset) =>
      apiClient.put<SessionPayload>(passwordPath, {
        token: reset.token,
        password: reset.password,
        password_confirmation: reset.passwordConfirmation,
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session);
    },
  });
}
