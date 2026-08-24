// The in-SPA path of every screen that has been ported to React.
//
// None of them serve their canonical route yet: `/`, `/about`, `/faq` and the
// rest keep their HAML controllers until the whole site cuts over in one step
// (see "Cutover strategy" in docs/frontend-modernization-plan.md). Until then
// each ported screen is previewed under an `/app/*` prefix, matching the M0
// `/app/ping` convention, and the Rails SpaController allow-list routes only
// these prefixed paths — keep the two in lockstep.
//
// Centralising them here is what makes that eventual cutover one edit: drop
// the `/app` prefix, repoint config/routes.rb, retire the HAML controllers.
// Only ported screens belong here — the FAQ is not ported, so links to it stay
// full-page anchors to `/faq`.
export const spaPaths = {
  home: "/app/home",
  about: "/app/about",
  contact: "/app/contact",
  terms: "/app/terms",
  cookies: "/app/cookies",
  constituency: "/app/constituency",
  profile: "/app/profile",
  review: "/app/review",
} as const;

export type SpaPathKey = keyof typeof spaPaths;
