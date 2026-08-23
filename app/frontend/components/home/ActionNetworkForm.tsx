import { useEffect, useRef } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

const stylesheetUrl =
  "https://actionnetwork.org/css/style-embed-whitelabel-v3.css";
const scriptUrl =
  "https://actionnetwork.org/widgets/v4/form/swapmyvote?format=js&source=widget";
// Action Network's script looks for this exact id to inject its form into.
const targetId = "can-form-area-swapmyvote";

/**
 * The newsletter sign-up embed, from app/views/home/_actionnetwork.html.
 *
 * Action Network is a third party that sets its own cookies, so the embed only
 * loads once the visitor has accepted — otherwise the banner's promise that
 * nothing non-essential is set would be untrue the moment this page rendered.
 * Declining leaves a note and a way to change their mind, rather than a silent
 * gap where a form used to be.
 */
export function ActionNetworkForm() {
  const { analyticsAllowed, hasAnswered, accept } = useCookieConsent();
  const target = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!analyticsAllowed || !target.current) {
      return;
    }

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = stylesheetUrl;
    document.head.appendChild(stylesheet);

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      stylesheet.remove();
      script.remove();
    };
  }, [analyticsAllowed]);

  if (!analyticsAllowed) {
    return (
      <Alert variant="light" className="small">
        <p className="mb-2">
          Our newsletter sign-up form is hosted by Action Network, which sets
          its own cookies, so we only load it if you have accepted cookies.
        </p>
        {hasAnswered ? (
          <Button variant="outline-secondary" size="sm" onClick={accept}>
            Accept cookies and load the form
          </Button>
        ) : (
          <span>Choose an option in the cookie banner to continue.</span>
        )}
      </Alert>
    );
  }

  return <div id={targetId} ref={target} />;
}
