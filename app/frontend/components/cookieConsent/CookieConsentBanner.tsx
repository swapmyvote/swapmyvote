import { useEffect, useRef } from "react";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import { Link } from "react-router-dom";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { spaPaths } from "@/lib/spaPaths";
import styles from "./CookieConsentBanner.module.scss";

// The footer reserves this much extra space at the foot of the page, so the
// fixed banner never covers the last of it (see globals.scss). Measured rather
// than hard-coded: the banner is one line on a wide screen and three on a
// narrow one.
const heightVariable = "--cookie-consent-height";

/** Keeps `--cookie-consent-height` in step with the banner's rendered height,
 *  and clears it once the banner goes away. */
function useReservedHeight(
  banner: React.RefObject<HTMLElement | null>,
  visible: boolean,
) {
  useEffect(() => {
    const element = banner.current;
    const root = document.documentElement;
    if (!element || !visible) {
      root.style.removeProperty(heightVariable);
      return;
    }

    const measure = () => {
      root.style.setProperty(heightVariable, `${element.offsetHeight}px`);
    };
    measure();

    // ResizeObserver catches the banner wrapping to a second line, which a
    // window-resize listener alone would miss when the text reflows without
    // the viewport changing (a font loading late, say).
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(element);

    return () => {
      observer?.disconnect();
      root.style.removeProperty(heightVariable);
    };
  }, [banner, visible]);
}

// React replacement for the legacy cookieconsent@3 bar. Deliberately NOT a
// dialog: no aria-modal, no focus trap, no focus stealing. It is a
// complementary landmark rendered last in the DOM, so a keyboard user reaches
// the page content first and the banner never blocks it.
//
// Unlike the legacy bar (dismiss-only), this offers a real choice, because the
// SPA gates Google Tag Manager on the answer. See GoogleTagManager.tsx.
export function CookieConsentBanner() {
  const { hasAnswered, accept, decline } = useCookieConsent();
  const banner = useRef<HTMLElement>(null);

  // Hooks run before the early return below, so this one is told whether the
  // banner is actually on screen: once it is answered there is nothing to
  // measure and nothing to reserve.
  useReservedHeight(banner, !hasAnswered);

  if (hasAnswered) {
    return null;
  }

  return (
    <aside
      ref={banner}
      aria-label="Cookie consent"
      className={`${styles.banner} bg-white border-top shadow p-3`}
    >
      <Container className="d-flex flex-column flex-md-row align-items-md-center gap-3 px-lg-5">
        <p className="mb-0 flex-grow-1 small">
          We use cookies to improve your experience. Analytics cookies are only
          set if you accept. <Link to={spaPaths.cookies}>Cookie Policy</Link>
        </p>
        <div className="d-flex gap-2 flex-shrink-0">
          <Button variant="outline-dark" onClick={decline}>
            Decline
          </Button>
          <Button variant="primary" onClick={accept}>
            Accept
          </Button>
        </div>
      </Container>
    </aside>
  );
}
