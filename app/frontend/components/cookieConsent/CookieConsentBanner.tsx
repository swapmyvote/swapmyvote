import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import { Link } from "react-router-dom";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { STATIC_PATHS } from "@/lib/staticPaths";
import styles from "./CookieConsentBanner.module.scss";

// React replacement for the legacy cookieconsent@3 bar. Deliberately NOT a
// dialog: no aria-modal, no focus trap, no focus stealing. It is a
// complementary landmark rendered last in the DOM, so a keyboard user reaches
// the page content first and the banner never blocks it.
//
// Unlike the legacy bar (dismiss-only), this offers a real choice, because the
// SPA gates Google Tag Manager on the answer. See GoogleTagManager.tsx.
export function CookieConsentBanner() {
  const { hasAnswered, accept, decline } = useCookieConsent();

  if (hasAnswered) {
    return null;
  }

  return (
    <aside
      aria-label="Cookie consent"
      className={`${styles.banner} fixed-bottom bg-white border-top shadow p-3`}
    >
      <Container className="d-flex flex-column flex-md-row align-items-md-center gap-3 px-lg-5">
        <p className="mb-0 flex-grow-1 small">
          We use cookies to improve your experience. Analytics cookies are only
          set if you accept.{" "}
          <Link to={STATIC_PATHS.cookies}>Cookie Policy</Link>
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
