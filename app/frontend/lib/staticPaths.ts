// In-SPA paths for the migrated static pages.
//
// The React versions are built and verified but NOT cut over: the production
// routes (`/faq`, `/about`, …) keep serving HAML, so the React pages are
// previewed under an `/app/*` prefix (matching the M0 `/app/ping` convention)
// and the Rails SpaController allow-list only routes these prefixed paths.
//
// They stay that way until the *whole* site is done, tested and approved —
// verifying one page does not earn it a cutover. Centralising the paths here
// means that single, eventual cutover is one edit: drop the `/app` prefix and
// update config/routes.rb + the HAML controllers.
// Only migrated pages belong here — the FAQ is deferred to M2, so links to it
// stay full-page anchors to the HAML route (`/faq`) until it is ported.
export const STATIC_PATHS = {
  about: "/app/about",
  contact: "/app/contact",
  terms: "/app/terms",
  cookies: "/app/cookies",
} as const;

export type StaticPageKey = keyof typeof STATIC_PATHS;
