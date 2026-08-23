import { useEffect } from "react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { readMeta } from "@/lib/meta";

// Consent-gated Google Tag Manager for the SPA. This is a deliberate divergence
// from the legacy site, which loads GTM unconditionally in
// app/views/layouts/_google_tag_manager_head.html.haml — gating the legacy
// partials on the same cookie is tracked as a follow-up.
//
// No <noscript> iframe counterpart: the SPA renders nothing without JS anyway.

export const GTM_ID_META = "google-tag-manager-id";
export const GTM_SCRIPT_ID = "gtm-script";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function injectGoogleTagManager(id: string) {
  // Guard on the element rather than a module flag: a script tag cannot be
  // un-injected, and this stays correct under StrictMode's double effects.
  if (document.getElementById(GTM_SCRIPT_ID) !== null) {
    return;
  }
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

  const script = document.createElement("script");
  script.id = GTM_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

export function GoogleTagManager() {
  const { analyticsAllowed } = useCookieConsent();

  useEffect(() => {
    if (!analyticsAllowed) {
      return;
    }
    const id = readMeta(GTM_ID_META);
    if (id === null) {
      return;
    }
    injectGoogleTagManager(id);
  }, [analyticsAllowed]);

  return null;
}
