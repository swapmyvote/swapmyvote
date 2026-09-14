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
 * A destination carrying a hash is exempt. `/app/faq#legal` is asking to land
 * at that element and the browser resolves the fragment itself; scrolling to
 * the top would undo it. Until M9 this only had to be true in principle — every
 * `/faq#…` link was a full page load — but the FAQ port turns them into router
 * links, so it is now load-bearing.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a value the body reads. Biome sees it unused inside and offers to drop it, which would leave [hash] — no longer scrolling on an ordinary navigation, defeating the component.
  useEffect(() => {
    if (hash) {
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
