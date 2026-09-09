import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to the top whenever the route changes.
 *
 * A full page load — which is what every cross-screen link used to be — reset
 * the scroll position for free. Client-side navigation does not: react-router
 * swaps the tree and leaves the window where it was, so following a link from
 * halfway down a long page lands you halfway down the next one, usually below
 * its heading.
 *
 * Only the path is watched, not the hash: an in-page anchor (`/faq#legal`)
 * is asking to land at that element, and forcing it to the top would break it.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
