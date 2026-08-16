# SPA Cookie-Consent Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the React SPA a cookie-consent banner that shares the legacy site's `_swapmyvote_cookie_consent` cookie, and load Google Tag Manager in the SPA only after explicit consent.

**Architecture:** Two dependency-free DOM helpers (`cookies.ts`, `meta.ts`) sit under a pure consent module (`cookieConsent.ts`) that owns the cookie contract. A React context turns that into reactive state, consumed by a presentational banner and a render-nothing GTM loader. The only Rails change is two conditional `<meta>` tags in the SPA layout that carry `ENV["SERVER_HOST"]` and `ENV["GOOGLE_TAG_MANAGER_ID"]` into the browser.

**Tech Stack:** React 19 + TypeScript, react-bootstrap 2.10, react-router-dom 7, Vitest 4 + React Testing Library, Biome, Sass modules, Rails 6.1 / HAML.

**Spec:** [`docs/superpowers/specs/2026-08-16-spa-cookie-consent-design.md`](../specs/2026-08-16-spa-cookie-consent-design.md) — issue [#1039](https://github.com/swapmyvote/swapmyvote/issues/1039).

## Global Constraints

- Cookie name is exactly `_swapmyvote_cookie_consent`. Never rename, never prefix.
- Cookie attributes: `path=/`, `max-age` 365 days (`31536000` seconds), `SameSite=Lax`, `Secure` only when `location.protocol === "https:"`, `domain` from the `cookie-consent-domain` meta tag and **omitted entirely** when that tag is missing or blank.
- Cookie values are exactly `dismiss` (written by the legacy site), `allow`, `deny`. Any other value is treated as unset.
- `analyticsAllowed` is true for `allow` **and** `dismiss`; false for `deny` and for unset.
- TypeScript style: always use braces in `if`/`else`/`for`/`while` bodies, even for a single statement. No `if (foo) { return null; }` written as `if (foo) return null;`.
- Styling: Bootstrap utility classes first. Custom CSS only in a co-located `*.module.scss`. No inline `style={{…}}` for static values.
- Path alias `@/*` → `app/frontend/*`. Imports use `@/…`, never long relative paths.
- Every new module gets a co-located test. Run `corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test` before every commit.
- Prefix Ruby commands with `PATH="$HOME/.rbenv/shims:$PATH"` so the pinned Ruby 3.3.2 wins.
- Branch: `frontend-cookie-consent-banner`. Never push to `master`.

## File Structure

| File | Responsibility |
| --- | --- |
| `app/frontend/lib/cookies.ts` (create) | Build/read/write `document.cookie` strings. Knows nothing about consent. |
| `app/frontend/lib/cookies.test.ts` (create) | Tests for the above. |
| `app/frontend/lib/meta.ts` (create) | Read a `<meta name=…>` content value. |
| `app/frontend/lib/meta.test.ts` (create) | Tests for the above. |
| `app/views/layouts/spa.html.haml` (modify) | Emit `cookie-consent-domain` and `google-tag-manager-id` meta tags. |
| `app/frontend/lib/cookieConsent.ts` (create) | The cookie contract: name, statuses, read/save, `analyticsAllowed`. |
| `app/frontend/lib/cookieConsent.test.ts` (create) | Tests for the above. |
| `app/frontend/contexts/CookieConsentContext.tsx` (create) | Consent state + `accept`/`decline` actions for React. |
| `app/frontend/contexts/CookieConsentContext.test.tsx` (create) | Tests for the above. |
| `app/frontend/components/cookieConsent/CookieConsentBanner.tsx` (create) | The banner UI. |
| `app/frontend/components/cookieConsent/CookieConsentBanner.module.scss` (create) | z-index only. |
| `app/frontend/components/cookieConsent/CookieConsentBanner.test.tsx` (create) | Tests for the above. |
| `app/frontend/components/analytics/GoogleTagManager.tsx` (create) | Injects `gtm.js` when consent allows. Renders nothing. |
| `app/frontend/components/analytics/GoogleTagManager.test.tsx` (create) | Tests for the above. |
| `app/frontend/app/App.tsx` (modify) | Wrap in the provider; render the loader and banner inside `Layout`. |

---

### Task 1: DOM primitives — `cookies.ts` and `meta.ts`

Two tiny helpers with no consent knowledge. `buildCookieString` is exported separately from `writeCookie` because jsdom silently drops a cookie whose `domain` doesn't match the test host — the only reliable way to assert the `domain` attribute is to assert the string we build.

**Files:**
- Create: `app/frontend/lib/cookies.ts`
- Create: `app/frontend/lib/cookies.test.ts`
- Create: `app/frontend/lib/meta.ts`
- Create: `app/frontend/lib/meta.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type CookieOptions = { domain?: string; path?: string; maxAgeSeconds?: number; sameSite?: "Lax" | "Strict" | "None"; secure?: boolean }`
  - `buildCookieString(name: string, value: string, options?: CookieOptions): string`
  - `readCookie(name: string): string | null`
  - `writeCookie(name: string, value: string, options?: CookieOptions): boolean`
  - `readMeta(name: string): string | null`

- [ ] **Step 1: Write the failing tests**

`app/frontend/lib/cookies.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { buildCookieString, readCookie, writeCookie } from "@/lib/cookies";

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

describe("buildCookieString", () => {
  it("defaults to a root path and SameSite=Lax", () => {
    expect(buildCookieString("a", "b")).toBe("a=b; path=/; SameSite=Lax");
  });

  it("includes the domain when one is given", () => {
    expect(buildCookieString("a", "b", { domain: "swapmyvote.uk" })).toContain(
      "domain=swapmyvote.uk",
    );
  });

  it("omits the domain attribute when it is blank or absent", () => {
    expect(buildCookieString("a", "b", { domain: "" })).not.toContain("domain");
    expect(buildCookieString("a", "b")).not.toContain("domain");
  });

  it("includes max-age and Secure when asked", () => {
    const built = buildCookieString("a", "b", {
      maxAgeSeconds: 31536000,
      secure: true,
    });
    expect(built).toContain("max-age=31536000");
    expect(built).toContain("Secure");
  });

  it("omits Secure by default", () => {
    expect(buildCookieString("a", "b")).not.toContain("Secure");
  });

  it("encodes the value", () => {
    expect(buildCookieString("a", "b c")).toContain("a=b%20c");
  });
});

describe("readCookie / writeCookie", () => {
  afterEach(() => {
    clearCookie("smv_test");
    clearCookie("smv_other");
  });

  it("round-trips a value", () => {
    expect(writeCookie("smv_test", "allow")).toBe(true);
    expect(readCookie("smv_test")).toBe("allow");
  });

  it("returns null for a cookie that is not set", () => {
    expect(readCookie("smv_missing")).toBeNull();
  });

  it("does not match on a name prefix", () => {
    writeCookie("smv_other", "nope");
    expect(readCookie("smv_oth")).toBeNull();
  });
});
```

`app/frontend/lib/meta.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { readMeta } from "@/lib/meta";

function setMeta(name: string, content: string) {
  const meta = document.createElement("meta");
  meta.setAttribute("name", name);
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

afterEach(() => {
  for (const meta of document.head.querySelectorAll("meta")) {
    meta.remove();
  }
});

describe("readMeta", () => {
  it("returns the content of a matching meta tag", () => {
    setMeta("smv-thing", "swapmyvote.uk");
    expect(readMeta("smv-thing")).toBe("swapmyvote.uk");
  });

  it("returns null when the tag is absent", () => {
    expect(readMeta("smv-thing")).toBeNull();
  });

  it("returns null when the content is blank", () => {
    setMeta("smv-thing", "   ");
    expect(readMeta("smv-thing")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
corepack yarn vitest run app/frontend/lib/cookies.test.ts app/frontend/lib/meta.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/cookies"` and `"@/lib/meta"`.

- [ ] **Step 3: Write the implementations**

`app/frontend/lib/cookies.ts`:

```ts
// Minimal document.cookie helpers. No dependency, no consent knowledge — the
// cookie contract itself lives in @/lib/cookieConsent.
//
// buildCookieString is exported separately from writeCookie so the attributes
// can be asserted in tests: jsdom silently drops a cookie whose `domain` does
// not match the test host, so a round-trip cannot prove the domain was set.

export type CookieOptions = {
  domain?: string;
  path?: string;
  maxAgeSeconds?: number;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
};

export function buildCookieString(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `path=${options.path ?? "/"}`,
  ];
  if (options.domain) {
    parts.push(`domain=${options.domain}`);
  }
  if (options.maxAgeSeconds !== undefined) {
    parts.push(`max-age=${options.maxAgeSeconds}`);
  }
  parts.push(`SameSite=${options.sameSite ?? "Lax"}`);
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function readCookie(name: string): string | null {
  let jar: string;
  try {
    jar = document.cookie;
  } catch {
    // Hardened privacy settings can make document.cookie throw. Treat that as
    // "no cookie" rather than crashing the app.
    return null;
  }
  const prefix = `${encodeURIComponent(name)}=`;
  for (const part of jar.split(";")) {
    const entry = part.trim();
    if (entry.startsWith(prefix)) {
      return decodeURIComponent(entry.slice(prefix.length));
    }
  }
  return null;
}

export function writeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): boolean {
  try {
    document.cookie = buildCookieString(name, value, options);
    return true;
  } catch {
    return false;
  }
}
```

`app/frontend/lib/meta.ts`:

```ts
// Reads server-provided configuration out of <meta> tags rendered by the SPA
// layout (app/views/layouts/spa.html.haml). Blank content reads as absent, so
// an env var that is set but empty behaves the same as one that is unset.

export function readMeta(name: string): string | null {
  const element = document.querySelector(`meta[name="${name}"]`);
  const content = element?.getAttribute("content")?.trim();
  if (!content) {
    return null;
  }
  return content;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
corepack yarn vitest run app/frontend/lib/cookies.test.ts app/frontend/lib/meta.test.ts
```

Expected: PASS, 12 tests.

- [ ] **Step 5: Run the gates and commit**

```bash
corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test
```

```bash
git add app/frontend/lib/cookies.ts app/frontend/lib/cookies.test.ts app/frontend/lib/meta.ts app/frontend/lib/meta.test.ts
git commit -m "Add cookie and meta-tag DOM helpers for the SPA"
```

---

### Task 2: Expose `SERVER_HOST` and the GTM id to the SPA

The only Rails change. Both tags are conditional: in local dev `SERVER_HOST` may be unset, and `GOOGLE_TAG_MANAGER_ID` is normally unset outside production. Absent tags are the correct degradation (host-only cookie, no analytics), matching how `_google_tag_manager_head.html.haml` already guards.

**Files:**
- Modify: `app/views/layouts/spa.html.haml`

**Interfaces:**
- Consumes: nothing.
- Produces: `<meta name="cookie-consent-domain" content="…">` and `<meta name="google-tag-manager-id" content="…">`, both read via `readMeta` from Task 1.

- [ ] **Step 1: Add the meta tags**

In `app/views/layouts/spa.html.haml`, immediately after the `viewport` meta line and before `%title`, insert:

```haml
    -# Server config the SPA needs in the browser. Both are optional: without
    -# SERVER_HOST the consent cookie is written host-only, and without a GTM
    -# id the SPA loads no analytics at all. See app/frontend/lib/meta.ts.
    - if ENV["SERVER_HOST"].present?
      %meta{ name: "cookie-consent-domain", content: ENV["SERVER_HOST"] }
    - if ENV["GOOGLE_TAG_MANAGER_ID"].present?
      %meta{ name: "google-tag-manager-id", content: ENV["GOOGLE_TAG_MANAGER_ID"] }
```

- [ ] **Step 2: Verify the template lints and renders**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec haml-lint app/views/layouts/spa.html.haml
```

Expected: no offenses.

Then, with the dev stack running (`foreman start -f Procfile.dev`):

```bash
SERVER_HOST=localhost curl -s http://localhost:3000/app/ping | grep -i 'meta name="cookie-consent-domain"'
```

Expected: the meta tag is present with `content="localhost"`. If `SERVER_HOST` is exported in your `.env`, no prefix is needed.

- [ ] **Step 3: Commit**

```bash
git add app/views/layouts/spa.html.haml
git commit -m "Expose SERVER_HOST and the GTM id to the SPA as meta tags"
```

---

### Task 3: The consent cookie contract — `cookieConsent.ts`

Pure module, no React. This is the correctness-critical unit: it must write the *same* cookie the legacy `cookieconsent@3` library writes, so consent carries across the HAML↔SPA boundary in both directions.

**Files:**
- Create: `app/frontend/lib/cookieConsent.ts`
- Create: `app/frontend/lib/cookieConsent.test.ts`

**Interfaces:**
- Consumes: `readCookie`, `writeCookie` from `@/lib/cookies`; `readMeta` from `@/lib/meta` (Task 1).
- Produces:
  - `const CONSENT_COOKIE_NAME = "_swapmyvote_cookie_consent"`
  - `const CONSENT_DOMAIN_META = "cookie-consent-domain"`
  - `type ConsentStatus = "dismiss" | "allow" | "deny"`
  - `readConsent(): ConsentStatus | null`
  - `saveConsent(status: ConsentStatus): boolean`
  - `analyticsAllowed(status: ConsentStatus | null): boolean`

- [ ] **Step 1: Write the failing test**

`app/frontend/lib/cookieConsent.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import * as cookies from "@/lib/cookies";
import {
  analyticsAllowed,
  CONSENT_COOKIE_NAME,
  readConsent,
  saveConsent,
} from "@/lib/cookieConsent";

function setConsentCookie(value: string) {
  document.cookie = `${CONSENT_COOKIE_NAME}=${value}; path=/`;
}

function clearConsentCookie() {
  document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`;
}

function setDomainMeta(content: string) {
  const meta = document.createElement("meta");
  meta.setAttribute("name", "cookie-consent-domain");
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

afterEach(() => {
  clearConsentCookie();
  for (const meta of document.head.querySelectorAll("meta")) {
    meta.remove();
  }
  vi.restoreAllMocks();
});

describe("readConsent", () => {
  it("returns null when the cookie is not set", () => {
    expect(readConsent()).toBeNull();
  });

  it("reads the legacy library's dismiss value", () => {
    setConsentCookie("dismiss");
    expect(readConsent()).toBe("dismiss");
  });

  it("reads allow and deny", () => {
    setConsentCookie("allow");
    expect(readConsent()).toBe("allow");
    setConsentCookie("deny");
    expect(readConsent()).toBe("deny");
  });

  it("treats an unrecognised value as unset", () => {
    setConsentCookie("banana");
    expect(readConsent()).toBeNull();
  });
});

describe("saveConsent", () => {
  it("persists a status that readConsent can read back", () => {
    saveConsent("allow");
    expect(readConsent()).toBe("allow");
  });

  it("writes the legacy cookie name, path, expiry and domain", () => {
    setDomainMeta("swapmyvote.uk");
    const write = vi.spyOn(cookies, "writeCookie").mockReturnValue(true);
    saveConsent("deny");
    expect(write).toHaveBeenCalledWith(
      "_swapmyvote_cookie_consent",
      "deny",
      expect.objectContaining({
        domain: "swapmyvote.uk",
        path: "/",
        maxAgeSeconds: 31536000,
        sameSite: "Lax",
      }),
    );
  });

  it("omits the domain when no meta tag is present", () => {
    const write = vi.spyOn(cookies, "writeCookie").mockReturnValue(true);
    saveConsent("allow");
    expect(write.mock.calls[0][2]).not.toHaveProperty("domain", "swapmyvote.uk");
    expect(write.mock.calls[0][2]?.domain).toBeUndefined();
  });
});

describe("analyticsAllowed", () => {
  it("allows analytics for an explicit allow", () => {
    expect(analyticsAllowed("allow")).toBe(true);
  });

  it("allows analytics for a legacy dismiss (analytics already ran for them)", () => {
    expect(analyticsAllowed("dismiss")).toBe(true);
  });

  it("refuses analytics for deny and for an unanswered banner", () => {
    expect(analyticsAllowed("deny")).toBe(false);
    expect(analyticsAllowed(null)).toBe(false);
  });
});
```

The `vi.spyOn(cookies, "writeCookie")` calls require Vitest's module interop; if the spy fails with "not extensible", add this at the top of the file instead and keep the same assertions:

```ts
vi.mock("@/lib/cookies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cookies")>();
  return { ...actual, writeCookie: vi.fn(actual.writeCookie) };
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
corepack yarn vitest run app/frontend/lib/cookieConsent.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/cookieConsent"`.

- [ ] **Step 3: Write the implementation**

`app/frontend/lib/cookieConsent.ts`:

```ts
import { readCookie, writeCookie } from "@/lib/cookies";
import { readMeta } from "@/lib/meta";

// The consent cookie is SHARED with the legacy HAML site, which writes it via
// cookieconsent@3 (app/views/layouts/_cookie_consent.html.haml). Name, path and
// expiry below match that library's defaults exactly, and the domain comes from
// ENV["SERVER_HOST"] via a meta tag — so a user who answered on one side of the
// HAML/SPA boundary is never re-prompted on the other.
//
// SameSite=Lax and Secure are additions the legacy library does not set. Neither
// affects the legacy site: the cookie is first-party and still readable there.

export const CONSENT_COOKIE_NAME = "_swapmyvote_cookie_consent";
export const CONSENT_DOMAIN_META = "cookie-consent-domain";

const CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

// "dismiss" is written by the legacy library's OK button; "allow"/"deny" are
// its opt-in vocabulary, which the legacy site also reads as "already answered".
export type ConsentStatus = "dismiss" | "allow" | "deny";

const CONSENT_STATUSES: readonly string[] = ["dismiss", "allow", "deny"];

export function readConsent(): ConsentStatus | null {
  const value = readCookie(CONSENT_COOKIE_NAME);
  if (value !== null && CONSENT_STATUSES.includes(value)) {
    return value as ConsentStatus;
  }
  return null;
}

export function saveConsent(status: ConsentStatus): boolean {
  const domain = readMeta(CONSENT_DOMAIN_META);
  return writeCookie(CONSENT_COOKIE_NAME, status, {
    domain: domain ?? undefined,
    path: "/",
    maxAgeSeconds: CONSENT_MAX_AGE_SECONDS,
    sameSite: "Lax",
    secure: window.location.protocol === "https:",
  });
}

export function analyticsAllowed(status: ConsentStatus | null): boolean {
  return status === "allow" || status === "dismiss";
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
corepack yarn vitest run app/frontend/lib/cookieConsent.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Run the gates and commit**

```bash
corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test
```

```bash
git add app/frontend/lib/cookieConsent.ts app/frontend/lib/cookieConsent.test.ts
git commit -m "Add the shared cookie-consent contract for the SPA"
```

---

### Task 4: `CookieConsentContext`

Turns the pure module into reactive state so the banner and the analytics loader stay in sync in a single render pass.

**Files:**
- Create: `app/frontend/contexts/CookieConsentContext.tsx`
- Create: `app/frontend/contexts/CookieConsentContext.test.tsx`

**Interfaces:**
- Consumes: `readConsent`, `saveConsent`, `analyticsAllowed`, `ConsentStatus`, `CONSENT_COOKIE_NAME` from `@/lib/cookieConsent` (Task 3).
- Produces:
  - `type CookieConsent = { status: ConsentStatus | null; hasAnswered: boolean; analyticsAllowed: boolean; accept: () => void; decline: () => void }`
  - `<CookieConsentProvider>{children}</CookieConsentProvider>`
  - `useCookieConsent(): CookieConsent` — throws outside a provider.

- [ ] **Step 1: Write the failing test**

`app/frontend/contexts/CookieConsentContext.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  CookieConsentProvider,
  useCookieConsent,
} from "@/contexts/CookieConsentContext";
import { CONSENT_COOKIE_NAME } from "@/lib/cookieConsent";

function Probe() {
  const { status, hasAnswered, analyticsAllowed, accept, decline } =
    useCookieConsent();
  return (
    <div>
      <span data-testid="status">{status ?? "unset"}</span>
      <span data-testid="answered">{String(hasAnswered)}</span>
      <span data-testid="analytics">{String(analyticsAllowed)}</span>
      <button type="button" onClick={accept}>
        accept
      </button>
      <button type="button" onClick={decline}>
        decline
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <CookieConsentProvider>
      <Probe />
    </CookieConsentProvider>,
  );
}

afterEach(() => {
  document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`;
});

describe("CookieConsentProvider", () => {
  it("starts unanswered when no cookie is set", () => {
    renderProbe();
    expect(screen.getByTestId("status")).toHaveTextContent("unset");
    expect(screen.getByTestId("answered")).toHaveTextContent("false");
    expect(screen.getByTestId("analytics")).toHaveTextContent("false");
  });

  it("seeds from an existing legacy dismiss cookie", () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=dismiss; path=/`;
    renderProbe();
    expect(screen.getByTestId("answered")).toHaveTextContent("true");
    expect(screen.getByTestId("analytics")).toHaveTextContent("true");
  });

  it("records an accept in state and in the cookie", async () => {
    renderProbe();
    await userEvent.click(screen.getByRole("button", { name: "accept" }));
    expect(screen.getByTestId("status")).toHaveTextContent("allow");
    expect(screen.getByTestId("analytics")).toHaveTextContent("true");
    expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=allow`);
  });

  it("records a decline in state and in the cookie", async () => {
    renderProbe();
    await userEvent.click(screen.getByRole("button", { name: "decline" }));
    expect(screen.getByTestId("status")).toHaveTextContent("deny");
    expect(screen.getByTestId("analytics")).toHaveTextContent("false");
    expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=deny`);
  });
});

describe("useCookieConsent", () => {
  it("throws when used outside a provider", () => {
    expect(() => render(<Probe />)).toThrow(/CookieConsentProvider/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
corepack yarn vitest run app/frontend/contexts/CookieConsentContext.test.tsx
```

Expected: FAIL — `Failed to resolve import "@/contexts/CookieConsentContext"`.

- [ ] **Step 3: Write the implementation**

`app/frontend/contexts/CookieConsentContext.tsx`:

```tsx
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  analyticsAllowed as isAnalyticsAllowed,
  type ConsentStatus,
  readConsent,
  saveConsent,
} from "@/lib/cookieConsent";

export type CookieConsent = {
  status: ConsentStatus | null;
  hasAnswered: boolean;
  analyticsAllowed: boolean;
  accept: () => void;
  decline: () => void;
};

const CookieConsentContext = createContext<CookieConsent | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus | null>(() =>
    readConsent(),
  );

  // The cookie write is best-effort: if it fails (hardened privacy settings),
  // still update state so the banner dismisses for this session rather than
  // becoming undismissable.
  const record = useCallback((next: ConsentStatus) => {
    saveConsent(next);
    setStatus(next);
  }, []);

  const value = useMemo<CookieConsent>(
    () => ({
      status,
      hasAnswered: status !== null,
      analyticsAllowed: isAnalyticsAllowed(status),
      accept: () => record("allow"),
      decline: () => record("deny"),
    }),
    [status, record],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsent {
  const value = useContext(CookieConsentContext);
  if (value === null) {
    throw new Error(
      "useCookieConsent must be used inside a CookieConsentProvider",
    );
  }
  return value;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
corepack yarn vitest run app/frontend/contexts/CookieConsentContext.test.tsx
```

Expected: PASS, 5 tests. React logs the expected error for the "throws outside a provider" case — that is normal.

- [ ] **Step 5: Run the gates and commit**

```bash
corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test
```

```bash
git add app/frontend/contexts/CookieConsentContext.tsx app/frontend/contexts/CookieConsentContext.test.tsx
git commit -m "Add a cookie-consent React context"
```

---

### Task 5: The banner component

Presentational. Renders nothing once answered. Uses an `<aside>` (implicit `complementary` landmark) with an `aria-label` rather than `<div role="region">` — same landmark semantics, no redundant-role lint. It is deliberately **not** a dialog: no `aria-modal`, no focus trap, no focus stealing, and it sits last in the DOM so it never blocks keyboard access to page content.

**Files:**
- Create: `app/frontend/components/cookieConsent/CookieConsentBanner.tsx`
- Create: `app/frontend/components/cookieConsent/CookieConsentBanner.module.scss`
- Create: `app/frontend/components/cookieConsent/CookieConsentBanner.test.tsx`

**Interfaces:**
- Consumes: `useCookieConsent` (Task 4); `STATIC_PATHS` from `@/lib/staticPaths`.
- Produces: `<CookieConsentBanner />` — no props.

- [ ] **Step 1: Write the failing test**

`app/frontend/components/cookieConsent/CookieConsentBanner.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { CookieConsentBanner } from "@/components/cookieConsent/CookieConsentBanner";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { CONSENT_COOKIE_NAME } from "@/lib/cookieConsent";
import { STATIC_PATHS } from "@/lib/staticPaths";

function renderBanner() {
  return render(
    <MemoryRouter>
      <CookieConsentProvider>
        <CookieConsentBanner />
      </CookieConsentProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`;
});

describe("CookieConsentBanner", () => {
  it("shows when consent has not been given", () => {
    renderBanner();
    expect(
      screen.getByRole("complementary", { name: /cookie consent/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we use cookies to improve your experience/i),
    ).toBeInTheDocument();
  });

  it("links the in-SPA cookie policy", () => {
    renderBanner();
    expect(
      screen.getByRole("link", { name: /cookie policy/i }),
    ).toHaveAttribute("href", STATIC_PATHS.cookies);
  });

  it("stays hidden when the legacy site already recorded consent", () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=dismiss; path=/`;
    renderBanner();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("hides and persists allow when accepted", async () => {
    renderBanner();
    await userEvent.click(screen.getByRole("button", { name: /accept/i }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=allow`);
  });

  it("hides and persists deny when declined", async () => {
    renderBanner();
    await userEvent.click(screen.getByRole("button", { name: /decline/i }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=deny`);
  });

  it("puts both choices in the keyboard tab order", async () => {
    renderBanner();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /decline/i })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /accept/i })).toHaveFocus();
  });
});
```

The tab test walks: cookie-policy link → Decline → Accept. If the DOM order in your implementation differs, fix the implementation to match this order rather than loosening the test — Decline must not come after Accept.

- [ ] **Step 2: Run the test to verify it fails**

```bash
corepack yarn vitest run app/frontend/components/cookieConsent/CookieConsentBanner.test.tsx
```

Expected: FAIL — `Failed to resolve import "@/components/cookieConsent/CookieConsentBanner"`.

- [ ] **Step 3: Write the implementation**

`app/frontend/components/cookieConsent/CookieConsentBanner.module.scss`:

```scss
// Bootstrap's .fixed-bottom and .sticky-top share z-index 1030, so the banner
// would sit under the sticky navigation when the page is scrolled to the end.
// One step up (Bootstrap's $zindex-fixed + 10) keeps it above the nav without
// reaching modal/toast territory.
.banner {
  z-index: 1040;
}
```

`app/frontend/components/cookieConsent/CookieConsentBanner.tsx`:

```tsx
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
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
corepack yarn vitest run app/frontend/components/cookieConsent/CookieConsentBanner.test.tsx
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Run the gates and commit**

```bash
corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test
```

```bash
git add app/frontend/components/cookieConsent
git commit -m "Add the SPA cookie-consent banner"
```

---

### Task 6: Consent-gated Google Tag Manager

Renders nothing. Injects `gtm.js` once, only when consent allows and the layout supplied an id. Idempotence is guarded by the script element's own id rather than module state, so it survives StrictMode double-effects and is trivially assertable in tests. There is no `<noscript>` iframe: the SPA does not render at all without JS.

**Files:**
- Create: `app/frontend/components/analytics/GoogleTagManager.tsx`
- Create: `app/frontend/components/analytics/GoogleTagManager.test.tsx`

**Interfaces:**
- Consumes: `useCookieConsent` (Task 4); `readMeta` from `@/lib/meta` (Task 1).
- Produces: `<GoogleTagManager />` — no props; `const GTM_ID_META = "google-tag-manager-id"`; `const GTM_SCRIPT_ID = "gtm-script"`.

- [ ] **Step 1: Write the failing test**

`app/frontend/components/analytics/GoogleTagManager.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  GoogleTagManager,
  GTM_SCRIPT_ID,
} from "@/components/analytics/GoogleTagManager";
import { CookieConsentBanner } from "@/components/cookieConsent/CookieConsentBanner";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { CONSENT_COOKIE_NAME } from "@/lib/cookieConsent";
import { MemoryRouter } from "react-router-dom";
import { screen } from "@testing-library/react";

function setGtmMeta(id: string) {
  const meta = document.createElement("meta");
  meta.setAttribute("name", "google-tag-manager-id");
  meta.setAttribute("content", id);
  document.head.appendChild(meta);
}

function gtmScripts() {
  return document.querySelectorAll(`#${GTM_SCRIPT_ID}`);
}

function renderWithConsent() {
  return render(
    <MemoryRouter>
      <CookieConsentProvider>
        <GoogleTagManager />
        <CookieConsentBanner />
      </CookieConsentProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`;
  for (const meta of document.head.querySelectorAll("meta")) {
    meta.remove();
  }
  for (const script of gtmScripts()) {
    script.remove();
  }
});

describe("GoogleTagManager", () => {
  it("does not load analytics before consent is given", () => {
    setGtmMeta("GTM-TEST");
    renderWithConsent();
    expect(gtmScripts()).toHaveLength(0);
  });

  it("does not load analytics when consent is denied", () => {
    setGtmMeta("GTM-TEST");
    document.cookie = `${CONSENT_COOKIE_NAME}=deny; path=/`;
    renderWithConsent();
    expect(gtmScripts()).toHaveLength(0);
  });

  it("loads analytics for an existing allow", () => {
    setGtmMeta("GTM-TEST");
    document.cookie = `${CONSENT_COOKIE_NAME}=allow; path=/`;
    renderWithConsent();
    const script = document.getElementById(GTM_SCRIPT_ID) as HTMLScriptElement;
    expect(script.src).toContain(
      "https://www.googletagmanager.com/gtm.js?id=GTM-TEST",
    );
  });

  it("loads analytics for a legacy dismiss", () => {
    setGtmMeta("GTM-TEST");
    document.cookie = `${CONSENT_COOKIE_NAME}=dismiss; path=/`;
    renderWithConsent();
    expect(gtmScripts()).toHaveLength(1);
  });

  it("loads analytics as soon as the banner is accepted", async () => {
    setGtmMeta("GTM-TEST");
    renderWithConsent();
    expect(gtmScripts()).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: /accept/i }));
    expect(gtmScripts()).toHaveLength(1);
  });

  it("never injects the script twice", () => {
    setGtmMeta("GTM-TEST");
    document.cookie = `${CONSENT_COOKIE_NAME}=allow; path=/`;
    const { rerender } = renderWithConsent();
    rerender(
      <MemoryRouter>
        <CookieConsentProvider>
          <GoogleTagManager />
          <CookieConsentBanner />
        </CookieConsentProvider>
      </MemoryRouter>,
    );
    expect(gtmScripts()).toHaveLength(1);
  });

  it("loads nothing when the layout supplied no GTM id", () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=allow; path=/`;
    renderWithConsent();
    expect(gtmScripts()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
corepack yarn vitest run app/frontend/components/analytics/GoogleTagManager.test.tsx
```

Expected: FAIL — `Failed to resolve import "@/components/analytics/GoogleTagManager"`.

- [ ] **Step 3: Write the implementation**

`app/frontend/components/analytics/GoogleTagManager.tsx`:

```tsx
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
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
corepack yarn vitest run app/frontend/components/analytics/GoogleTagManager.test.tsx
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Run the gates and commit**

```bash
corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test
```

```bash
git add app/frontend/components/analytics
git commit -m "Load Google Tag Manager in the SPA only after consent"
```

---

### Task 7: Wire into the SPA and verify in the browser

**Files:**
- Modify: `app/frontend/app/App.tsx`

**Interfaces:**
- Consumes: `CookieConsentProvider` (Task 4), `CookieConsentBanner` (Task 5), `GoogleTagManager` (Task 6).
- Produces: nothing further.

- [ ] **Step 1: Wire the provider, loader and banner into `App.tsx`**

Add the imports:

```tsx
import { GoogleTagManager } from "@/components/analytics/GoogleTagManager";
import { CookieConsentBanner } from "@/components/cookieConsent/CookieConsentBanner";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
```

Change `Layout` to render the loader and banner after the footer:

```tsx
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
```

Wrap the router in the provider — it must sit outside `<BrowserRouter>`'s children that use it, but the banner needs router context for its `<Link>`, so the provider goes **outside** `BrowserRouter`:

```tsx
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CookieConsentProvider>
        <BrowserRouter>
          <Layout>
            <Routes>{/* unchanged */}</Routes>
          </Layout>
        </BrowserRouter>
      </CookieConsentProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Run every gate**

```bash
corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test
```

Expected: Biome clean, no TypeScript errors, all Vitest suites pass.

- [ ] **Step 3: Verify in the browser**

Start the stack (`foreman start -f Procfile.dev`) with `SERVER_HOST` and `GOOGLE_TAG_MANAGER_ID` set in `.env`, then on `http://localhost:3000/app/cookies`:

1. Banner appears at the bottom, above the sticky nav when scrolled.
2. "Cookie Policy" navigates in-SPA (no full page load).
3. Tab order reaches Decline then Accept; no focus trap.
4. Click Decline → banner disappears, `document.cookie` shows `_swapmyvote_cookie_consent=deny`, no `googletagmanager.com` request in the network log.
5. Clear the cookie, reload, click Accept → cookie is `allow` and a `gtm.js` request fires.
6. Cross-boundary check: with the cookie set to `allow`, load a legacy page (`/about`) — the legacy bar must **not** appear. Then clear it, dismiss the bar on `/about`, and load `/app/cookies` — the React banner must **not** appear.

Step 6 is the whole point of the cookie contract. If either half re-prompts, compare the two cookies in devtools: name, domain and path must match exactly.

- [ ] **Step 4: Commit**

```bash
git add app/frontend/app/App.tsx
git commit -m "Show the cookie-consent banner on every SPA route"
```

- [ ] **Step 5: Open the pull request**

```bash
git push -u origin frontend-cookie-consent-banner
```

PR description must include `Closes #1039` and call out the deliberate behaviour change (SPA gates GTM on consent; the legacy site still does not).

- [ ] **Step 6: File the follow-up issue**

```bash
gh issue create --title "Gate the legacy HAML Google Tag Manager partials on the consent cookie" --body "Follow-up to #1039. The SPA now loads GTM only after an explicit accept, but app/views/layouts/_google_tag_manager_head.html.haml and _google_tag_manager_body.html.haml still load it unconditionally, so a user who declines on an SPA page is still tracked on legacy pages. Gate both partials on _swapmyvote_cookie_consent being 'allow' or 'dismiss' (see app/frontend/lib/cookieConsent.ts for the contract), and add a request spec."
```
