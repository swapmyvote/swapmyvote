import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// `decodeURIComponent` throws `URIError` on a malformed escape sequence, and
// a hash is whatever the address bar happens to contain: `/app/faq#%zz` is
// enough. Thrown from inside the effect that would take the whole route down,
// so fall back to the undecoded fragment — still a plausible element id, and
// at worst it matches nothing and we scroll to the top as usual.
function elementIdFromHash(hash: string): string {
  const fragment = hash.slice(1);
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

/**
 * Restores the scroll position on every client-side navigation: to the top
 * normally, or to the element named by the destination's hash.
 *
 * A full page load — which is what every cross-screen link used to be — did
 * both of these for free: it reset the scroll position, and the browser
 * resolved any `#fragment` against the newly parsed document. Client-side
 * navigation does neither. react-router's `<Link>` navigates via
 * `history.pushState`, which by specification performs no fragment
 * navigation at all, and react-router only resolves `location.hash` inside
 * `<ScrollRestoration>` — a data-router component this app does not use (see
 * `app/frontend/app/App.tsx`, which mounts a plain `<BrowserRouter>`). So
 * without this component the window simply stays where it was: following
 * `/app/faq#legal` from halfway down a page leaves you halfway down the FAQ,
 * at whatever prose happens to sit at that offset.
 *
 * Hence both branches below are ours to perform. A hash scrolls its target
 * element into view; a hash matching no element falls back to the top, which
 * is the safer of the two wrong answers. Native in-page `<a href="#reset">`
 * anchors are unaffected — they never reach the router.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is a trigger, not a value the body reads. Biome sees it unused inside and offers to drop it, which would leave [hash] — no longer scrolling on an ordinary navigation, defeating the component.
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(elementIdFromHash(hash));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
