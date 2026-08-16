import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Footer } from "@/components/footer/Footer";
import { Navigation } from "@/components/navigation/Navigation";
import { About } from "@/components/static/About";
import { Contact } from "@/components/static/Contact";
import { Cookies } from "@/components/static/Cookies";
import { Terms } from "@/components/static/Terms";
import { AppModeProvider } from "@/contexts/AppModeContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { queryClient } from "@/lib/queryClient";
import { STATIC_PATHS } from "@/lib/staticPaths";
import { Ping } from "@/pages/Ping";

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
    </>
  );
}

export function App() {
  return (
    // SessionProvider wraps everything: auth, operational phase and swap state
    // all come from one payload, and the chrome needs them on every route.
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AppModeProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/app/ping" element={<Ping />} />
                <Route path={STATIC_PATHS.about} element={<About />} />
                <Route path={STATIC_PATHS.contact} element={<Contact />} />
                <Route path={STATIC_PATHS.cookies} element={<Cookies />} />
                <Route path={STATIC_PATHS.terms} element={<Terms />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </AppModeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
