import type { Page } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";

/** AppModeConcern::VALID_MODES, in the order that file declares them. */
export const appModes = [
  "closed-warm-up",
  "open",
  "closed-and-voting",
  "open-and-voting",
  "closed-wind-down",
] as const;

export type AppMode = (typeof appModes)[number];

/**
 * Puts this browser context's session into one operational phase and lands on
 * the home screen for it.
 *
 * `?opensesame=` is `ApplicationController#whats_the_magic_word`, which stashes
 * the mode in `session[:sesame]`; `AppModeConcern#app_mode` prefers that over
 * `ENV["SWAPMYVOTE_MODE"]`. So the phase is per-session — and Playwright gives
 * each test its own browser context, so tests cannot leak a phase into each
 * other and nothing needs clearing afterwards.
 *
 * This is a full page load on purpose. The phase reaches React through
 * `GET /api/v1/session`, and a fresh document refetches it; a client-side
 * navigation would race the cached session against the new cookie.
 */
export async function setAppMode(page: Page, mode: AppMode): Promise<void> {
  await page.goto(`${spaPaths.home}?opensesame=${mode}`);
}
