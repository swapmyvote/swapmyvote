import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import { Link } from "react-router-dom";
import { forwardDemocracyPrivacyPolicyUrl } from "@/lib/externalLinks";
import { spaPaths } from "@/lib/spaPaths";

// Ported from app/views/layouts/_footer.html.haml. Shown on every SPA page.
//
// Three equal-width columns via the Bootstrap grid (col-md-4) so they stay
// balanced regardless of link length, stacking on mobile.
//
// Link boundary: pages already migrated to React (about/contact/terms/cookies/
// faq/api) use in-SPA <Link>; off-site links are plain anchors.
//
// The legacy footer also shows a conditional "Donate" link gated on
// donate_info[:show] (an ENV flag). That is server state not yet available to
// the SPA, so it is intentionally omitted until the M2 session endpoint
// surfaces it — same reason the FAQ body is deferred.
export function Footer() {
  return (
    <footer>
      <Container className="px-lg-5">
        <Row className="gy-4">
          <Col md={4}>
            <ul className="list-unstyled">
              <li>
                <h3 className="h5">Swap My Vote</h3>
              </li>
              <li>
                <Link className="small" to={spaPaths.about}>
                  About
                </Link>
              </li>
              <li>
                <Link className="small" to={spaPaths.contact}>
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  className="small"
                  href={forwardDemocracyPrivacyPolicyUrl}
                  target="_blank"
                  rel="noopener"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <Link className="small" to={spaPaths.terms}>
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link className="small" to={spaPaths.cookies}>
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </Col>

          <Col md={4}>
            <ul className="list-unstyled">
              <li>
                <h3 className="h5">Connect</h3>
              </li>
              <li>
                <a
                  className="small"
                  href="https://twitter.com/swapmyvote"
                  target="_blank"
                  rel="noopener"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  className="small"
                  href="https://www.facebook.com/swapmyvote"
                  target="_blank"
                  rel="noopener"
                >
                  Facebook
                </a>
              </li>
              <li>
                <Link className="small" to={spaPaths.api}>
                  API
                </Link>
              </li>
            </ul>
          </Col>

          <Col md={4}>
            <ul className="list-unstyled">
              <li>
                <h3 className="h5">
                  <Link className="stealth-link" to={spaPaths.faq}>
                    FAQ
                  </Link>
                </h3>
              </li>
              <li>
                <Link className="small" to={`${spaPaths.faq}#legal`}>
                  Is this legal?
                </Link>
              </li>
              <li>
                <Link className="small" to={`${spaPaths.faq}#trust`}>
                  How do I know my partner will vote (for who I want)?
                </Link>
              </li>
              <li>
                <Link className="small" to={spaPaths.faq}>
                  More ...
                </Link>
              </li>
            </ul>
          </Col>
        </Row>
      </Container>

      <Container className="px-lg-5">
        <p>
          Published and promoted by Tom de Grunwald on behalf of Forward
          Democracy. Registered as Movement Forward Ltd, company no. 11707599 in
          England &amp; Wales, 100 Church Street, Brighton, BN1 1UJ.
        </p>
      </Container>
    </footer>
  );
}
