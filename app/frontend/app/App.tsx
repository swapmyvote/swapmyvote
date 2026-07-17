import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Footer } from "@/components/footer/Footer";
import { Navigation } from "@/components/navigation/Navigation";
import { queryClient } from "@/lib/queryClient";
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/app/ping" element={<Ping />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
