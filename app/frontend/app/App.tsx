import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { GoogleTagManager } from "@/components/analytics/GoogleTagManager";
import { CookieConsentBanner } from "@/components/cookieConsent/CookieConsentBanner";
import { Footer } from "@/components/footer/Footer";
import { Navigation } from "@/components/navigation/Navigation";
import { About } from "@/components/static/About";
import { Contact } from "@/components/static/Contact";
import { Cookies } from "@/components/static/Cookies";
import { Terms } from "@/components/static/Terms";
import { AppModeProvider } from "@/contexts/AppModeContext";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { queryClient } from "@/lib/queryClient";
import { spaPaths } from "@/lib/spaPaths";
import { Constituency } from "@/pages/Constituency";
import { Home } from "@/pages/Home";
import { Login } from "@/pages/Login";
import { Ping } from "@/pages/Ping";
import { Profile } from "@/pages/Profile";
import { Review } from "@/pages/Review";
import { SignUp } from "@/pages/SignUp";

// Shared chrome around every SPA route: branded nav + footer, matching the
// tacticalvote layout. New routes are added to <Routes> as screens are
// migrated; the Rails route table (SpaController allow-list) must be kept in
// lockstep so only migrated paths serve this shell.
function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navigation />
      <main>{children}</main>
      <Footer />
      <GoogleTagManager />
      {/* Last in the DOM on purpose: the banner is a landmark, not a dialog,
          so keyboard users reach the page content before it. */}
      <CookieConsentBanner />
    </>
  );
}

export function App() {
  return (
    // SessionProvider wraps everything: auth, operational phase and swap state
    // all come from one payload, and the chrome needs them on every route.
    // Cookie consent is independent of it — it applies logged in or out.
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AppModeProvider>
          <CookieConsentProvider>
            <BrowserRouter>
              <Layout>
                <Routes>
                  <Route path="/app/ping" element={<Ping />} />
                  <Route path={spaPaths.home} element={<Home />} />
                  <Route path={spaPaths.login} element={<Login />} />
                  <Route path={spaPaths.signup} element={<SignUp />} />
                  <Route path={spaPaths.about} element={<About />} />
                  <Route path={spaPaths.contact} element={<Contact />} />
                  <Route path={spaPaths.cookies} element={<Cookies />} />
                  <Route path={spaPaths.terms} element={<Terms />} />
                  <Route
                    path={spaPaths.constituency}
                    element={<Constituency />}
                  />
                  <Route path={spaPaths.profile} element={<Profile />} />
                  <Route path={spaPaths.review} element={<Review />} />
                </Routes>
              </Layout>
            </BrowserRouter>
          </CookieConsentProvider>
        </AppModeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
