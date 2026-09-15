import { apiClient } from "@/lib/apiClient";
import { spaPaths } from "@/lib/spaPaths";
import type { SessionPayload } from "@/types/api";

export interface Credentials {
  email: string;
  password: string;
}

export interface Registration extends Credentials {
  name: string;
  passwordConfirmation: string;
  consentNewsEmail: boolean;
  consentToDataProcessing: boolean;
  /** Honeypot. Always sent, always empty for a real person — the API rejects
   *  a sign-up that arrives with anything in it. Named to look like nothing an
   *  autocomplete heuristic recognises, so no password manager fills it in on
   *  a real user's behalf. */
  swapReference: string;
}

/** Log in. Answers with the logged-in session payload, so the caller can
 *  prime the session cache instead of refetching. */
export function logIn(credentials: Credentials): Promise<SessionPayload> {
  return apiClient.post<SessionPayload>("/session", {
    email: credentials.email,
    password: credentials.password,
  });
}

/**
 * Create an account and log in as it. The entry form's constituency and party
 * answers are not sent: the API reads them from the session stash the entry
 * form wrote, mirroring how the legacy Devise controller consumed its own.
 *
 * The API keys are snake_case (Rails strong parameters); the camelCase names
 * stop at this boundary, as they do in lib/profile.ts.
 */
export function signUp(registration: Registration): Promise<SessionPayload> {
  return apiClient.post<SessionPayload>("/registration", {
    name: registration.name,
    email: registration.email,
    password: registration.password,
    password_confirmation: registration.passwordConfirmation,
    consent_news_email: registration.consentNewsEmail,
    consent_to_data_processing: registration.consentToDataProcessing,
    swap_reference: registration.swapReference,
  });
}

/**
 * Where to send someone who has just logged in or signed up. An account with
 * no constituency goes to the screen that asks for one — the same rule
 * `users#show` applies before it will show a dashboard. Everyone else goes to
 * their dashboard, which forwards to the find-a-swap screen when they have no
 * swap yet, mirroring HomeController's `redirect_to user_path`.
 *
 * Landing them on the home page instead put a logged-in user in front of the
 * logged-out entry form with its constituency box empty, which reads as though
 * the answers they had just given were thrown away.
 */
export function postAuthPath(session: SessionPayload): string {
  if (!session.currentUser) {
    return spaPaths.home;
  }
  if (!session.currentUser.hasConstituency) {
    return spaPaths.constituency;
  }
  return spaPaths.dashboard;
}
