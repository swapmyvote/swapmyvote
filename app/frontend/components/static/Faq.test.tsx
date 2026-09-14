import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Faq } from "@/components/static/Faq";
import { spaPaths } from "@/lib/spaPaths";

type MockedElection = {
  data?: { dateSeasonType?: string; swapValidityHours?: number };
  isPending: boolean;
};

const loadedElection: MockedElection = {
  data: { dateSeasonType: "2026 summer by-elections", swapValidityHours: 72 },
  isPending: false,
};

// Mutable so one test can put the query back into its pending state; the
// factory only reads it when the component calls the hook, so hoisting is
// safe.
const mocks = vi.hoisted(() => ({
  election: undefined as unknown as MockedElection,
}));

vi.mock("@/lib/referenceData", () => ({
  useElection: () => mocks.election,
}));

beforeEach(() => {
  mocks.election = loadedElection;
});

function renderFaq() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Faq />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Every id here is a published URL: the footer, ProfileForm, SignUpForm and
// ReachOutToSwap all deep-link into this page, and so do emails we have
// already sent. Losing one is a broken link, not a cosmetic change.
const anchors = [
  "legal",
  "trust",
  "privacy",
  "independence",
  "parties",
  "facebook-profile",
  "trouble",
  "constituencies",
  "change",
  "reset",
  "better",
  "noone",
  "deactivate",
  "who",
  "open",
];

describe("Faq", () => {
  it.each(anchors)("anchors #%s on a heading", (id) => {
    renderFaq();

    const heading = document.getElementById(id);
    expect(heading).not.toBeNull();
    expect(heading?.tagName).toBe("H2");
  });

  // The legacy view carries name="reset" twice, so only the first was ever
  // reachable. The id belongs to the section the "as described below" links
  // actually mean.
  it("anchors #reset on the cancel instructions, not the expiry section", () => {
    renderFaq();

    expect(document.getElementById("reset")).toHaveTextContent(
      /how can i reset or cancel my swap/i,
    );
  });

  it("drops the stale social-login section", () => {
    renderFaq();

    expect(screen.queryByText(/why do i need to log in with/i)).toBeNull();
  });

  // Kept on purpose: existing social accounts still authenticate, and
  // ReachOutToSwap deep-links here.
  it("keeps the Facebook profile troubleshooting", () => {
    renderFaq();

    expect(document.getElementById("facebook-profile")).toHaveTextContent(
      /facebook profile/i,
    );
  });

  it("keeps its own cross-references inside the page", () => {
    renderFaq();

    for (const link of screen.getAllByRole("link", {
      name: /cancel your swap|cancelling your swap/i,
    })) {
      expect(link.getAttribute("href")).toMatch(/^#/);
    }
  });

  it("links to the ported contact and profile screens, not their legacy paths", () => {
    renderFaq();

    expect(
      screen.getAllByRole("link", { name: /contact us/i })[0],
    ).toHaveAttribute("href", spaPaths.contact);
    expect(
      screen.getAllByRole("link", { name: /not right\? update your info/i })[0],
    ).toHaveAttribute("href", spaPaths.profile);
  });

  it("reports the configured swap expiry", () => {
    renderFaq();

    // getByText's default matcher (getNodeText) concatenates only the DIRECT
    // text-node children of each element, so a number rendered inline via
    // {expiryHours} does still land in the same joined string as its
    // surrounding prose — no custom matcher is necessary. 72 is deliberately
    // not the component's `?? 48` fallback, so this fails if the payload
    // field stops being read.
    expect(screen.getByText(/after 72 hours/i)).toBeInTheDocument();
  });

  it("names the current election in the trust section", () => {
    renderFaq();

    expect(screen.getByText(/2026 summer by-elections/i)).toBeInTheDocument();
  });

  // The regression this page was fixed for. ScrollToTop resolves the hash once,
  // on arrival, so an anchor that is not in the DOM by then is an anchor that
  // never scrolls: a spinner here meant every cold deep link (the footer's
  // #legal and #trust, ReachOutToSwap's #reset) landed at the top of the page
  // instead. The prose must be in the document before the query settles.
  describe("while the election query is still pending", () => {
    beforeEach(() => {
      mocks.election = { data: undefined, isPending: true };
    });

    it.each(anchors)("still renders the #%s anchor", (id) => {
      renderFaq();

      const heading = document.getElementById(id);
      expect(heading).not.toBeNull();
      expect(heading?.tagName).toBe("H2");
    });

    it("omits the election-season clause rather than rendering it empty", () => {
      renderFaq();

      expect(
        screen.getByText(/these are not currently available\./i),
      ).toBeInTheDocument();
      expect(screen.queryByText(/available during the \./i)).toBeNull();
    });

    // No placeholder figure: a wrong expiry that later flips to the real one is
    // worse than a sentence that gains the detail when it is known.
    it("omits the expiry clause rather than guessing a figure", () => {
      renderFaq();

      expect(
        screen.getByText(/will now automatically expire and we will email/i),
      ).toBeInTheDocument();
      expect(screen.queryByText(/\d+ hours/i)).toBeNull();
    });
  });
});
