# M9: Static content (FAQ + API docs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the FAQ and API documentation pages to React at `/app/faq` and `/app/api`, and repoint every SPA link that still targets the legacy `/faq`.

**Architecture:** Two presentational components under `components/static/`, matching the existing `About`/`Contact`/`Terms`/`Cookies` pattern. No new API endpoints — the pages read the existing `useParties`/`useConstituencies`/`useElection` hooks, plus two new serializer fields (`swapValidityHours`, `canonicalName`) that exist so the client never re-derives a value Ruby already owns. The FAQ's HTML-4 `%a(name=)` anchors become `id` attributes on the headings themselves.

**Tech Stack:** React 19 + TypeScript, react-bootstrap, react-router-dom v7, Vitest + React Testing Library, Alba serializers, RSpec request specs, Playwright + axe, Biome.

**Spec:** [`docs/superpowers/specs/2026-09-14-remaining-pages-design.md`](../specs/2026-09-14-remaining-pages-design.md)

## Global Constraints

- **Never flip a canonical route to React.** `/faq` and `/api` keep serving HAML. React ships at `/app/faq` and `/app/api` only. Cutover is M11.
- **`config/routes.rb` allow-list, `app/frontend/lib/spaPaths.ts` and the `<Routes>` table in `app/frontend/app/App.tsx` must stay in lockstep.** Every task that adds a route touches all three.
- **TypeScript style:** always use braces in `if`/`else`/`for`/`while` bodies, even single-statement.
- **Styling:** prefer Bootstrap utility classes over custom CSS. No inline `style={{…}}` unless the value is genuinely dynamic.
- **Quality gates before every commit:** `corepack yarn lint:fix`, `corepack yarn typecheck`, `corepack yarn test`, and `bundle exec rspec` when Ruby changed. **Check the exit code explicitly** — do not pipe these through `tail` and read only the last lines.
- **Ruby is pinned to 3.3.12 via rbenv** and a newer system Ruby may shadow the shims. Prefix Ruby commands with `PATH="$HOME/.rbenv/shims:$PATH"`.
- **`.env.test` must exist** for RSpec (it ships only as `.env.test.example` and is not gitignored — see issue #1075). If `bundle exec rspec` fails with "Missing host to link to!", create it containing `export SERVER_HOST=localhost`.
- **Do not delete any HAML.** `app/views/static_pages/faq.html.haml`, `api.html.haml` and `_api_constituencies.html.haml` all stay live.

---

### Task 1: `swapValidityHours` on the election payload

The FAQ's `#reset` section says a swap expires "after #{swap_validity_hours} hours". That helper is `ENV["SWAP_EXPIRY_HOURS"] || 48` and sits on no payload.

`SwapsHelper` is **not** included in `ApplicationController` (only `ApplicationHelper` is), so the presenter's context cannot answer `swap_validity_hours` until the controller includes it.

**Files:**
- Modify: `app/controllers/api/v1/election_controller.rb`
- Modify: `app/presenters/api/v1/election_presenter.rb:20-35` (the `ATTRIBUTES` hash)
- Modify: `app/serializers/api/v1/election_serializer.rb:10-12` (the `attributes` call)
- Modify: `app/frontend/types/api.ts` (the `Election` interface)
- Test: `spec/requests/api/v1/reference_data_spec.rb` (inside the existing `describe "GET /api/v1/election"` block at line 154)

**Interfaces:**
- Consumes: nothing.
- Produces: `Election.swapValidityHours: number` on `GET /api/v1/election`, read by Task 5.

- [ ] **Step 1: Write the failing test**

There is no `election_spec.rb` — the election endpoint is covered by `spec/requests/api/v1/reference_data_spec.rb`. Append this nested block inside its existing `describe "GET /api/v1/election" do` (line 154), and drop the local `json` helper if that file already defines one:

```ruby
  describe "swapValidityHours" do
    def json
      JSON.parse(response.body)
    end

    it "defaults to 48 when SWAP_EXPIRY_HOURS is unset" do
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with("SWAP_EXPIRY_HOURS").and_return(nil)

      get "/api/v1/election"

      expect(json["swapValidityHours"]).to eq(48)
    end

    it "reports the configured expiry when SWAP_EXPIRY_HOURS is set" do
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with("SWAP_EXPIRY_HOURS").and_return("72")

      get "/api/v1/election"

      expect(json["swapValidityHours"]).to eq(72)
    end
  end
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/reference_data_spec.rb -e "swapValidityHours"; echo "EXIT=$?"
```

Expected: FAIL — `swapValidityHours` is `nil`, not `48`.

- [ ] **Step 3: Include the helper on the controller**

In `app/controllers/api/v1/election_controller.rb`, add the include inside the class, above `def show`:

```ruby
    class ElectionController < BaseController
      # ApplicationController includes ApplicationHelper, which is where most
      # of ElectionPresenter's methods come from — but not SwapsHelper, and
      # the presenter reads swap_validity_hours through the same context.
      # Included here rather than on ApplicationController: this is the only
      # controller that needs it.
      include SwapsHelper

      def show
```

- [ ] **Step 4: Expose it through the presenter**

In `app/presenters/api/v1/election_presenter.rb`, add a final entry to the `ATTRIBUTES` hash (after `constituencies_as_sentence:`):

```ruby
        constituencies_as_sentence: :by_election_constituencies_as_sentence,
        # Not a property of the election, strictly. It lives here because this
        # endpoint is already "deploy-immutable config the client caches
        # forever", which is exactly what SWAP_EXPIRY_HOURS is. See the M9
        # design doc — a recorded decision, not a drift.
        swap_validity_hours: :swap_validity_hours
```

- [ ] **Step 5: Serialize it**

In `app/serializers/api/v1/election_serializer.rb`, add to the `attributes` list:

```ruby
      attributes :general_election, :hide_polls, :year, :season, :date_md,
                 :date_dm, :date_and_type_my, :date_and_type_mdy,
                 :date_season_type, :event_title_with_year, :event_choice,
                 :hashtags, :constituency_other, :constituencies_as_sentence,
                 :swap_validity_hours
```

- [ ] **Step 6: Add the TypeScript field**

In `app/frontend/types/api.ts`, inside `interface Election`, immediately before the `donate` block:

```typescript
  /** How long an unconfirmed swap survives before it expires, in hours
   *  (`SWAP_EXPIRY_HOURS`, default 48). Deploy-immutable config that happens
   *  to ride on this endpoint — see the M9 design doc. */
  swapValidityHours: number;
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/reference_data_spec.rb; echo "EXIT=$?"
corepack yarn typecheck; echo "EXIT=$?"
```

Expected: both PASS, `EXIT=0`.

- [ ] **Step 8: Commit**

```bash
git add app/controllers/api/v1/election_controller.rb \
        app/presenters/api/v1/election_presenter.rb \
        app/serializers/api/v1/election_serializer.rb \
        app/frontend/types/api.ts \
        spec/requests/api/v1/reference_data_spec.rb
git commit -m "Serve swapValidityHours on the election payload

The FAQ's swap-expiry section reads ENV[\"SWAP_EXPIRY_HOURS\"], which no
payload carried. It rides on the election endpoint because that is already
the deploy-immutable config the client caches forever.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `canonicalName` on the party payload

The API docs page lists the party names a partner site may pass to `/swap?willing_party_name=`. Rails derives those with `ApplicationHelper#canonical_name` — `parameterize(separator: "_").gsub(/_party$/, "")` — and `Api::V1::RegistrationController#party_id_for` matches inbound values through the same function. Re-implementing it in TypeScript would create a second definition of the string the deep link keys on, free to drift.

**Files:**
- Modify: `app/serializers/api/v1/party_serializer.rb`
- Modify: `app/frontend/types/api.ts` (the `Party` interface)
- Modify: `app/frontend/test/sessionFixtures.tsx:38-40` (the two `Party` literals on `testUser`)
- Test: `spec/requests/api/v1/reference_data_spec.rb` (inside the existing `describe "GET /api/v1/parties"` block at line 22)

**Interfaces:**
- Consumes: nothing.
- Produces: `Party.canonicalName: string | null` on `GET /api/v1/parties`, read by Task 6.

- [ ] **Step 1: Write the failing test**

There is no `parties_spec.rb` — parties are covered by `spec/requests/api/v1/reference_data_spec.rb`. Append this nested block inside its existing `describe "GET /api/v1/parties" do` (line 22), and drop the local `json` helper if that file already defines one:

```ruby
  describe "canonicalName" do
    def json
      JSON.parse(response.body)
    end

    def canonical_for(name)
      create(:party, name: name)
      get "/api/v1/parties"
      json.find { |party| party["name"] == name }["canonicalName"]
    end

    it "lowercases and underscores the name" do
      expect(canonical_for("Liberal Democrat")).to eq("liberal_democrat")
    end

    # The suffix is dropped so "Labour Party" and "Labour" are one key. The
    # inbound side of the deep link (Api::V1::RegistrationController
    # #party_id_for) applies the same function, so both spellings resolve.
    it "drops a trailing 'party'" do
      expect(canonical_for("Labour Party")).to eq("labour")
    end
  end
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/reference_data_spec.rb -e "canonicalName"; echo "EXIT=$?"
```

Expected: FAIL — `NoMethodError` on `nil` (no `canonicalName` key).

- [ ] **Step 3: Add the serializer attribute**

Replace the body of `app/serializers/api/v1/party_serializer.rb`:

```ruby
module Api
  module V1
    # A party as the SPA needs it: enough to name it and colour it.
    # `smvCode` is what utils/party.ts maps to the `.party-*` colour classes.
    class PartySerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :id, :name, :color, :smv_code

      # The spelling a partner site passes to /swap?willing_party_name=, which
      # the API docs page documents. Derived here rather than in TypeScript
      # because Api::V1::RegistrationController#party_id_for matches inbound
      # values through the same helper — two definitions of this string would
      # silently break deep links the moment either changed.
      attribute :canonical_name do |party|
        ActionController::Base.helpers.then do
          ApplicationController.helpers.canonical_name(party.name)
        end
      end
    end
  end
end
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/reference_data_spec.rb; echo "EXIT=$?"
```

Expected: PASS. If `ApplicationController.helpers.canonical_name` raises `NoMethodError`, replace the attribute body with the direct derivation and keep the comment:

```ruby
      attribute :canonical_name do |party|
        party.name&.parameterize(separator: "_")&.gsub(/_party$/, "")
      end
```

- [ ] **Step 5: Add the TypeScript field and update the fixtures**

In `app/frontend/types/api.ts`, inside `interface Party`, after `smvCode`:

```typescript
  /** The spelling `/swap?willing_party_name=` accepts, e.g. `liberal_democrat`.
   *  Derived server-side (PartySerializer) because the inbound matcher uses the
   *  same helper. */
  canonicalName: string | null;
```

In `app/frontend/test/sessionFixtures.tsx`, add the field to both party literals on `testUser`:

```typescript
  preferredParty: {
    id: 1,
    name: "Green",
    color: "#6AB023",
    smvCode: "grn",
    canonicalName: "green",
  },
  willingParty: {
    id: 2,
    name: "Labour",
    color: "#DC241f",
    smvCode: "lab",
    canonicalName: "labour",
  },
```

- [ ] **Step 6: Fix any other `Party` literals the type checker finds**

```bash
corepack yarn typecheck; echo "EXIT=$?"
```

Expected: initially FAIL, listing every test file with a `Party` object literal missing `canonicalName`. Add the field to each (derive the value from the party's own name), then re-run until `EXIT=0`.

- [ ] **Step 7: Run the full frontend suite**

```bash
corepack yarn test; echo "EXIT=$?"
```

Expected: PASS, `EXIT=0`.

- [ ] **Step 8: Commit**

```bash
git add app/serializers/api/v1/party_serializer.rb \
        app/frontend/types/api.ts \
        app/frontend/test/sessionFixtures.tsx \
        spec/requests/api/v1/reference_data_spec.rb
git commit -m "Serve canonicalName on the party payload

The API docs page documents the party spellings /swap accepts. Deriving
them in TypeScript would fork the string the inbound matcher already keys
on in Ruby.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Let `ScrollToTop` honour an anchor

`ScrollToTop` watches `pathname` only, and its docstring already claims that an in-page anchor like `/faq#legal` is left alone. That is true today only because no in-SPA link carries a hash — every `/faq#…` link is still a full page load. Task 7 turns them into router links, at which point the effect runs on arrival and scrolls to the top, defeating the anchor.

**Files:**
- Modify: `app/frontend/components/navigation/ScrollToTop.tsx`
- Test: `app/frontend/components/navigation/ScrollToTop.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: no new exports. `ScrollToTop` gains the behaviour Task 7 depends on.

- [ ] **Step 1: Write the failing test**

In `app/frontend/components/navigation/ScrollToTop.test.tsx`, replace `renderRoutes` and add a third route so a hash link exists to click:

```tsx
function renderRoutes() {
  return render(
    <MemoryRouter initialEntries={["/first"]}>
      <ScrollToTop />
      <Routes>
        <Route
          path="/first"
          element={
            <>
              <Link to="/second">go to second</Link>
              <Link to="/third#middle">go to an anchor</Link>
            </>
          }
        />
        <Route path="/second" element={<p>second page</p>} />
        <Route path="/third" element={<p>third page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
```

Then add these two cases inside `describe("ScrollToTop", …)`:

```tsx
  // The browser resolves the fragment itself. Scrolling to the top here would
  // undo that — which is the whole point of a /faq#legal link.
  it("leaves the scroll alone when the destination carries a hash", async () => {
    renderRoutes();
    vi.mocked(window.scrollTo).mockClear();

    await userEvent.click(screen.getByRole("link", { name: "go to an anchor" }));

    expect(screen.getByText("third page")).toBeInTheDocument();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("still scrolls when the destination has no hash", async () => {
    renderRoutes();
    vi.mocked(window.scrollTo).mockClear();

    await userEvent.click(screen.getByRole("link", { name: "go to second" }));

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
corepack yarn test ScrollToTop; echo "EXIT=$?"
```

Expected: FAIL — "leaves the scroll alone" fails, because `scrollTo` was called.

- [ ] **Step 3: Implement the guard**

Replace the body of `app/frontend/components/navigation/ScrollToTop.tsx`:

```tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to the top whenever the route changes.
 *
 * A full page load — which is what every cross-screen link used to be — reset
 * the scroll position for free. Client-side navigation does not: react-router
 * swaps the tree and leaves the window where it was, so following a link from
 * halfway down a long page lands you halfway down the next one, usually below
 * its heading.
 *
 * A destination carrying a hash is exempt. `/app/faq#legal` is asking to land
 * at that element and the browser resolves the fragment itself; scrolling to
 * the top would undo it. Until M9 this only had to be true in principle — every
 * `/faq#…` link was a full page load — but the FAQ port turns them into router
 * links, so it is now load-bearing.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a value the body reads. Biome sees it unused inside and offers to drop it, which would leave [hash] — no longer scrolling on an ordinary navigation, defeating the component.
  useEffect(() => {
    if (hash) {
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
corepack yarn test ScrollToTop; echo "EXIT=$?"
corepack yarn lint; echo "EXIT=$?"
```

Expected: both PASS, `EXIT=0`. If Biome still flags the effect, read its message before changing anything — its suggested fix drops `pathname` and breaks the component.

- [ ] **Step 5: Commit**

```bash
git add app/frontend/components/navigation/ScrollToTop.tsx \
        app/frontend/components/navigation/ScrollToTop.test.tsx
git commit -m "Let ScrollToTop honour an in-page anchor

Its docstring already promised this, but nothing tested it and no in-SPA
link carried a hash yet. The FAQ port makes /faq#legal a router link, so
the promise has to be real.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Route `/app/faq` and `/app/api`

Wire both routes end to end with placeholder components, so Tasks 5 and 6 are pure content work against a route that already resolves. Keeping the three lockstep files in one commit is deliberate — they are the thing that drifts.

**Files:**
- Modify: `app/frontend/lib/spaPaths.ts`
- Modify: `config/routes.rb` (the SPA allow-list, after the M8 entries)
- Modify: `app/frontend/app/App.tsx`
- Create: `app/frontend/components/static/Faq.tsx`
- Create: `app/frontend/components/static/ApiDocs.tsx`
- Test: `playwright-tests/spa-navigation.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `spaPaths.faq` (`"/app/faq"`), `spaPaths.api` (`"/app/api"`); `Faq` and `ApiDocs` named exports from `@/components/static/Faq` and `@/components/static/ApiDocs`.

- [ ] **Step 1: Add the paths**

In `app/frontend/lib/spaPaths.ts`, add two entries to the `spaPaths` object after `cookies`:

```typescript
  faq: "/app/faq",
  api: "/app/api",
```

Then correct the file's closing comment, which currently singles the FAQ out as unported:

```typescript
// Centralising them here is what makes that eventual cutover one edit: drop
// the `/app` prefix, repoint config/routes.rb, retire the HAML controllers.
// Only ported screens belong here.
```

- [ ] **Step 2: Add the Rails routes**

In `config/routes.rb`, after the M8 block (`get "app/vote", to: "spa#index"`):

```ruby
  # M9 static content. /faq and /api keep serving StaticPagesController until
  # cutover.
  get "app/faq", to: "spa#index"
  get "app/api", to: "spa#index"
```

- [ ] **Step 3: Create the placeholder components**

`app/frontend/components/static/Faq.tsx`:

```tsx
import { StaticPage } from "@/components/static/StaticPage";

export function Faq() {
  return (
    <StaticPage>
      <h1>FAQ</h1>
    </StaticPage>
  );
}
```

`app/frontend/components/static/ApiDocs.tsx`:

```tsx
import { StaticPage } from "@/components/static/StaticPage";

export function ApiDocs() {
  return (
    <StaticPage>
      <h1>Swap My Vote API</h1>
    </StaticPage>
  );
}
```

- [ ] **Step 4: Add the routes to the table**

In `app/frontend/app/App.tsx`, add the imports alongside the other `@/components/static/` ones (Biome sorts imports — run `lint:fix` after):

```tsx
import { ApiDocs } from "@/components/static/ApiDocs";
import { Faq } from "@/components/static/Faq";
```

and the routes after the `spaPaths.terms` entry:

```tsx
                  <Route path={spaPaths.faq} element={<Faq />} />
                  <Route path={spaPaths.api} element={<ApiDocs />} />
```

- [ ] **Step 5: Add the navigation smoke test**

In `playwright-tests/spa-navigation.spec.ts`, follow the file's existing per-path pattern and add `spaPaths.faq` and `spaPaths.api` to whatever list of paths it already drives. If it has no such list, append:

```typescript
test("must serve the FAQ and API pages from the SPA shell", async ({ page }) => {
  await page.goto(spaPaths.faq);
  await expect(page.getByRole("heading", { name: "FAQ", level: 1 })).toBeVisible();

  await page.goto(spaPaths.api);
  await expect(
    page.getByRole("heading", { name: "Swap My Vote API", level: 1 }),
  ).toBeVisible();
});
```

- [ ] **Step 6: Verify the routes resolve**

```bash
corepack yarn lint:fix; echo "EXIT=$?"
corepack yarn typecheck; echo "EXIT=$?"
corepack yarn test; echo "EXIT=$?"
```

Expected: all `EXIT=0`. Then boot the stack and confirm both paths render the SPA shell rather than a Rails 404:

```bash
foreman start -f Procfile.dev
```

Visit `http://localhost:3000/app/faq` and `http://localhost:3000/app/api`.

- [ ] **Step 7: Commit**

```bash
git add app/frontend/lib/spaPaths.ts config/routes.rb app/frontend/app/App.tsx \
        app/frontend/components/static/Faq.tsx \
        app/frontend/components/static/ApiDocs.tsx \
        playwright-tests/spa-navigation.spec.ts
git commit -m "Route /app/faq and /app/api to the SPA

Allow-list, spaPaths and the router table in one commit — they are the
three files that drift apart. Content follows.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The FAQ content

Port `app/views/static_pages/faq.html.haml` (428 lines). **Read that file first and port its prose verbatim** — this task specifies the structure, the anchors and the four deliberate divergences, not the copy.

**Files:**
- Modify: `app/frontend/components/static/Faq.tsx`
- Test: `app/frontend/components/static/Faq.test.tsx` (create)

**Interfaces:**
- Consumes: `spaPaths` (Task 4), `Election.swapValidityHours` (Task 1) via `useElection()`.
- Produces: the fifteen anchor ids Task 7's links target.

**Section order and anchor ids** — one `<h2 id="…">` per row, in this order:

| id | Heading | HAML lines |
|---|---|---|
| `legal` | Is this legal? | 8–28 |
| `trust` | How do I know my partner will vote (for who I want)? | 30–68 |
| `privacy` | Do my voting intentions stay private? | 70–95 |
| `independence` | Are you aligned with a political party? | 98–108 |
| `parties` | How have you chosen which political parties to offer through Swap My Vote? | 110–135 |
| `facebook-profile` | Why can't I reach my swap partner's Facebook profile? | 155–192 |
| `trouble` | The site isn't working properly - help! | 194–221 |
| `constituencies` | I want to swap with someone in a particular constituency. Please can you find me a swap there? | 223–238 |
| `change` | Can I change my mind about my voting preferences, or my other information? | 240–254 |
| `reset` | How can I reset or cancel my swap? | 287–298 |
| `better` | The swap I've been offered isn't a good one - how can I find a better voting partner? | 274–285 |
| `noone` | No-one is confirming a swap with me. What's going on? | 300–309 |
| `deactivate` | I have changed my mind and no longer wish to find someone to swap with. What should I do? | 311–333 |
| `who` | Who made this site? | 335–412 |
| `open` | How can I trust this app? | 414–428 |

One further section has no anchor of its own and keeps its position between `change` and `better`: **"My swap hasn't been confirmed; what should I do?"** (HAML 256–272). It held the *first* of the two duplicate `name="reset"` anchors; the id now belongs to "How can I reset or cancel my swap?" below it.

**The four divergences, all deliberate:**

1. **`#login` is dropped.** "Why do I need to log in with Facebook / Twitter / email, and not X?" (HAML 138–153). It is gated on `log_in_with_facebook? || log_in_with_twitter?`, both defaulting to true, but the social login buttons were deleted in `8a4b078` and the React login is email-only. The `#trust` section already says so.
2. **`#facebook-profile` is kept, ungated.** Existing social accounts still authenticate, so partners who signed up that way still have Facebook profile links. `ReachOutToSwap` links to it.
3. **The duplicate `#reset` is resolved onto the second section**, as tabled above.
4. **HAML line 270's self-link is repointed.** Inside "My swap hasn't been confirmed", "cancel your swap immediately ... as described below" links to `#reset` — which, with the old anchor placement, was its own section. It now resolves to the section the prose describes.

**Link conversions:**

| HAML | React |
|---|---|
| `contact_path` (lines 215, 428) | `<Link to={spaPaths.contact}>` |
| `edit_user_path` (lines 249, 293) | `<Link to={spaPaths.profile}>` |
| `link_to_forward_democracy_privacy_policy` (93, 424) | `<a href={forwardDemocracyPrivacyPolicyUrl}>` |
| `github_url` (420) | `<a href={githubUrl}>` |
| `#trust`, `#reset` in-page (145, 188, 270, 283) | `<a href="#reset">` — plain anchors, same page |
| `confirm_account_deletion_path` (319) | **full-page `<a href="/confirm_account_deletion">`, see below** |
| `#{election_date_season_type}` (68) | `election.data?.dateSeasonType` |
| `#{swap_validity_hours}` (262) | `election.data?.swapValidityHours` |
| external `<a href>` (18, 20, 169, 330, 348, 361, 368, 370, 377, 387, 396, 402, 410) | keep verbatim, add `target="_blank" rel="noopener"` where the HAML has `target=_blank` |

- [ ] **Step 1: Write the failing test**

Create `app/frontend/components/static/Faq.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Faq } from "@/components/static/Faq";
import { spaPaths } from "@/lib/spaPaths";

vi.mock("@/lib/referenceData", () => ({
  useElection: () => ({
    data: { dateSeasonType: "2026 summer by-elections", swapValidityHours: 48 },
    isPending: false,
  }),
}));

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
      name: /cancel your swap|cancelling your swap|section on trust/i,
    })) {
      expect(link.getAttribute("href")).toMatch(/^#/);
    }
  });

  it("links to the ported contact and profile screens, not their legacy paths", () => {
    renderFaq();

    expect(screen.getAllByRole("link", { name: /contact us/i })[0]).toHaveAttribute(
      "href",
      spaPaths.contact,
    );
    expect(
      screen.getAllByRole("link", { name: /not right\? update your info/i })[0],
    ).toHaveAttribute("href", spaPaths.profile);
  });

  it("reports the configured swap expiry", () => {
    renderFaq();

    expect(screen.getByText(/after 48 hours/i)).toBeInTheDocument();
  });

  it("names the current election in the trust section", () => {
    renderFaq();

    expect(
      screen.getByText(/2026 summer by-elections/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
corepack yarn test Faq; echo "EXIT=$?"
```

Expected: FAIL — the placeholder renders only an `<h1>`, so every anchor assertion fails.

- [ ] **Step 3: Write the component**

Read `app/views/static_pages/faq.html.haml` in full, then write `app/frontend/components/static/Faq.tsx` following the tables above. The skeleton:

```tsx
import { Link } from "react-router-dom";
import { StaticPage } from "@/components/static/StaticPage";
import {
  forwardDemocracyPrivacyPolicyUrl,
  githubUrl,
} from "@/lib/externalLinks";
import { useElection } from "@/lib/referenceData";
import { spaPaths } from "@/lib/spaPaths";

// Ported from app/views/static_pages/faq.html.haml, which stays live at /faq
// until cutover.
//
// The legacy view marks each section with `%a(name="legal")` — the HTML 4
// named anchor, dropped from HTML 5 but still honoured by browsers, which is
// why /faq#trust works today. Here the anchor is an `id` on the heading
// itself, so the scroll target is the heading rather than an empty element
// above it.
//
// Four deliberate divergences from the HAML; see the M9 design doc:
//   - the `#login` section ("why Facebook / Twitter / email, and not X?") is
//     dropped — social login was removed in 8a4b078 and the `#trust` section
//     two headings up already says so;
//   - `#facebook-profile` is kept and ungated, because existing social
//     accounts still authenticate and ReachOutToSwap deep-links to it;
//   - `name="reset"` appears twice in the HAML, so only the first was
//     reachable; the id is on the second, which is what every #reset link
//     means;
//   - HAML line 270's "cancel your swap immediately" linked to its own
//     section; it now points at the cancel instructions below it.
export function Faq() {
  const election = useElection();
  const expiryHours = election.data?.swapValidityHours ?? 48;
  const dateSeasonType = election.data?.dateSeasonType ?? "";

  return (
    <StaticPage>
      <h1>FAQ</h1>

      <h2 id="legal">Is this legal?</h2>
      {/* …port HAML 10–28 verbatim… */}

      {/* …remaining sections, in the order tabled in the plan… */}
    </StaticPage>
  );
}
```

The account-deletion link in `#deactivate` stays a full page load for now:

```tsx
        You can{" "}
        {/* Not yet an SPA screen — M10 ports /confirm_account_deletion and
            repoints this. Deliberately a full-page <a> until then. */}
        <a href="/confirm_account_deletion">permanently remove your account</a>.
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
corepack yarn test Faq; echo "EXIT=$?"
corepack yarn lint:fix; echo "EXIT=$?"
corepack yarn typecheck; echo "EXIT=$?"
```

Expected: all `EXIT=0`.

- [ ] **Step 5: Compare the two pages side by side**

```bash
foreman start -f Procfile.dev
```

Open `http://localhost:3000/faq` and `http://localhost:3000/app/faq` in two tabs and read them against each other. Check every section is present and in order, no prose was dropped, and each of the fifteen `#…` fragments scrolls to the right heading.

- [ ] **Step 6: Commit**

```bash
git add app/frontend/components/static/Faq.tsx \
        app/frontend/components/static/Faq.test.tsx
git commit -m "Port the FAQ to React

Anchors move from HTML 4 %a(name=) onto the headings as ids. Drops the
stale social-login section, keeps the Facebook-profile one, and fixes the
duplicate #reset anchor that made only the first of the two reachable.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: The API docs content

Port `app/views/static_pages/api.html.haml` (126 lines) and `_api_constituencies.html.haml` (19 lines). Read both first.

**Files:**
- Modify: `app/frontend/components/static/ApiDocs.tsx`
- Test: `app/frontend/components/static/ApiDocs.test.tsx` (create)

**Interfaces:**
- Consumes: `Party.canonicalName` (Task 2), `useParties`/`useConstituencies`/`useElection`, `spaPaths.contact`.
- Produces: nothing later tasks depend on.

**The random example party is kept.** `Party.all.sample` picks a different party on every page load. That looks like an oversight but is load-bearing: the FAQ calls the site "devotedly non-partisan", and a hard-coded party in the integration docs would read as an endorsement. The chooser is a prop defaulting to `Math.random` so tests can pin it:

```tsx
export function ApiDocs({ random = Math.random }: { random?: () => number }) {
```

**Other conversions:**

| HAML | React |
|---|---|
| `@parties` (line 111) | `useParties()`, rendered as `party.canonicalName` |
| `canonical_name(party.name)` (114) | `party.canonicalName` — already derived server-side |
| `swap_url(...)` (86, 99) | `` `${window.location.origin}/swap?…` `` with `URLSearchParams` |
| `- unless general_election?` (116) | `{election.data?.generalElection === false && …}` |
| `OnsConstituency.all` (partial) | `useConstituencies()` |
| `CGI.escape constituency.name` | `encodeURIComponent(constituency.name)` |
| `contact_path` (22) | `<Link to={spaPaths.contact}>` |
| `constituency_ons_id_dataset_url` (55, 73) | the literal URL from `app/helpers/static_pages_helper.rb` |

Note for whoever reads the HAML and thinks it is inconsistent: line 86 builds the example URL with `parameterize.gsub('-', '_')` (giving `labour_party`) while line 114 documents `canonical_name` (giving `labour`). **Both work** — `Api::V1::RegistrationController#party_id_for` canonicalises the inbound value too. Port both spellings as they are; this is not a bug to fix.

- [ ] **Step 1: Write the failing test**

Create `app/frontend/components/static/ApiDocs.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ApiDocs } from "@/components/static/ApiDocs";
import { spaPaths } from "@/lib/spaPaths";

const parties = [
  { id: 1, name: "Green", color: "#6AB023", smvCode: "grn", canonicalName: "green" },
  { id: 2, name: "Labour Party", color: "#DC241f", smvCode: "lab", canonicalName: "labour" },
];

const constituencies = [
  { onsId: "E14001009", name: "Woking" },
  { onsId: "E14001605", name: "York Outer" },
];

const election = { generalElection: true };

vi.mock("@/lib/referenceData", () => ({
  useParties: () => ({ data: parties, isPending: false }),
  useConstituencies: () => ({ data: constituencies, isPending: false }),
  useElection: () => ({ data: election, isPending: false }),
}));

function renderDocs(random = () => 0) {
  render(
    <MemoryRouter>
      <ApiDocs random={random} />
    </MemoryRouter>,
  );
}

describe("ApiDocs", () => {
  it("documents each party by its canonical name", () => {
    renderDocs();

    expect(screen.getByText("green")).toBeInTheDocument();
    expect(screen.getByText("labour")).toBeInTheDocument();
  });

  // The example party is random on every load on purpose — a fixed one in the
  // integration docs would read as an endorsement from a site that calls
  // itself devotedly non-partisan. Pinned here, not removed.
  it("builds its example links from the injected chooser", () => {
    renderDocs(() => 0);

    const [example] = screen.getAllByRole("link", { name: /willing_party_name=/ });
    expect(example).toHaveAttribute(
      "href",
      expect.stringContaining("willing_party_name=green"),
    );
  });

  it("picks a different party for a different draw", () => {
    renderDocs(() => 0.99);

    expect(
      screen.getAllByRole("link", { name: /willing_party_name=/ })[0],
    ).toHaveAttribute("href", expect.stringContaining("willing_party_name=labour"));
  });

  it("hides the by-election constituency list at a general election", () => {
    renderDocs();

    expect(screen.queryByText(/constituencies for this by election/i)).toBeNull();
  });

  it("links to the ported contact screen", () => {
    renderDocs();

    expect(screen.getByRole("link", { name: /get in touch/i })).toHaveAttribute(
      "href",
      spaPaths.contact,
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
corepack yarn test ApiDocs; echo "EXIT=$?"
```

Expected: FAIL — the placeholder renders only an `<h1>`.

- [ ] **Step 3: Write the component**

Read both HAML files, then write `app/frontend/components/static/ApiDocs.tsx` following the conversion table. Pick the example party with `parties[Math.floor(random() * parties.length)]`, guarding an empty list.

- [ ] **Step 4: Add a by-election test**

The `generalElection: false` branch renders the constituency partial, which the mock above cannot reach. Add a second describe block that re-mocks `useElection` to return `{ generalElection: false }` and asserts the list renders each constituency's name, its `encodeURIComponent`-escaped `constituency_name`, and its `onsId`.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
corepack yarn test ApiDocs; echo "EXIT=$?"
corepack yarn lint:fix; echo "EXIT=$?"
corepack yarn typecheck; echo "EXIT=$?"
```

Expected: all `EXIT=0`.

- [ ] **Step 6: Compare against the live page**

With `foreman start -f Procfile.dev` running, open `/api` and `/app/api` side by side. Click one generated example link on each and confirm both pre-populate the entry form identically.

- [ ] **Step 7: Commit**

```bash
git add app/frontend/components/static/ApiDocs.tsx \
        app/frontend/components/static/ApiDocs.test.tsx
git commit -m "Port the API docs to React

Party spellings come from the server's canonicalName rather than a
TypeScript copy of the helper. The random example party is kept and its
chooser injected — a fixed party in integration docs would read as an
endorsement.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Repoint every SPA link that targets `/faq`

This is the milestone's real risk, and the bug class M6 and M8 each shipped believing they had fixed. **A screen is not ported until nothing links to its legacy path.** Both times the component tests asserted the buggy hrefs, so the suite agreed with the bug.

**Files:**
- Modify: `app/frontend/components/footer/Footer.tsx:100-121`
- Modify: `app/frontend/components/footer/Footer.test.tsx:38-46`
- Modify: `app/frontend/components/static/Contact.tsx:12`
- Modify: `app/frontend/components/static/Contact.test.tsx:26-27`
- Modify: `app/frontend/components/auth/SignUpForm.tsx:18`
- Modify: `app/frontend/components/profile/ProfileForm.tsx:43`
- Modify: `app/frontend/components/profile/ProfileForm.test.tsx:169`
- Modify: `app/frontend/components/swap/ReachOutToSwap.tsx:5-6`
- Modify: `app/frontend/components/swap/ReachOutToSwap.test.tsx:74,77,113`

**Interfaces:**
- Consumes: `spaPaths.faq` (Task 4), the anchor ids (Task 5).
- Produces: nothing.

- [ ] **Step 1: Find every one of them**

```bash
grep -rn '"/faq' app/frontend/ playwright-tests/; echo "EXIT=$?"
```

Expected: matches in the nine files above. Work from this list, not from memory — that is how the previous two misses happened.

- [ ] **Step 2: Update the tests first**

In each `*.test.tsx` above, change the expected href from the legacy path to the SPA one, e.g. in `Footer.test.tsx`:

```tsx
    ).toHaveAttribute("href", `${spaPaths.faq}#legal`);
```

importing `spaPaths` where it is not already imported.

- [ ] **Step 3: Run the tests to verify they fail**

```bash
corepack yarn test; echo "EXIT=$?"
```

Expected: FAIL in `Footer`, `Contact`, `ProfileForm` and `ReachOutToSwap` — each still renders the legacy href.

- [ ] **Step 4: Repoint the components**

A hash-free link becomes a router `<Link>`:

```tsx
<Link className="stealth-link" to={spaPaths.faq}>FAQ</Link>
```

A link with a fragment keeps `<Link>` too — `ScrollToTop` now stands aside for it (Task 3):

```tsx
<Link className="small" to={`${spaPaths.faq}#legal`}>Is this legal?</Link>
```

Replace the module constants in `SignUpForm.tsx`, `ProfileForm.tsx` and `ReachOutToSwap.tsx`:

```tsx
const faqTrust = `${spaPaths.faq}#trust`;
```

```tsx
const facebookFaq = `${spaPaths.faq}#facebook-profile`;
const resetFaq = `${spaPaths.faq}#reset`;
```

Delete the now-false `{/* FAQ is not yet migrated (M2) … */}` comment in `Footer.tsx`, and the "not-yet-migrated /api HAML page" clause in the `About.tsx` docstring.

Where a repointed link sat inside `target="_blank"` (`ProfileForm.tsx:186`), keep opening a new tab — `<Link to={…} target="_blank" rel="noreferrer">` does that.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
corepack yarn test; echo "EXIT=$?"
corepack yarn lint:fix; echo "EXIT=$?"
corepack yarn typecheck; echo "EXIT=$?"
```

Expected: all `EXIT=0`.

- [ ] **Step 6: Confirm nothing is left**

```bash
grep -rn 'href="/faq\|href="/api"' app/frontend/; echo "EXIT=$?"
```

Expected: no matches (`EXIT=1` from grep). The only surviving legacy href in ported code should be `/confirm_account_deletion` in `Faq.tsx` and `ProfileForm.tsx`, both of which M10 owns.

- [ ] **Step 7: Commit**

```bash
git add app/frontend/
git commit -m "Keep the SPA's FAQ links inside the SPA

Nine links across the footer, contact, sign-up, profile and swap screens
still pointed at the HAML /faq, dropping the user into the Bootstrap 4
site with no way back. Same bug class as the nav's Edit profile link.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Accessibility coverage

**Files:**
- Modify: `playwright-tests/accessibility.spec.ts:11-22`

**Interfaces:**
- Consumes: `spaPaths.faq`, `spaPaths.api`.
- Produces: nothing.

- [ ] **Step 1: Add both pages to the scanned list**

Replace the stale comment and extend `migratedPages`:

```typescript
// The static pages, under the `/app/*` preview paths they are served from
// until each one is cut over.
const migratedPages = [
  { name: "About", path: spaPaths.about },
  { name: "Contact", path: spaPaths.contact },
  { name: "Cookie Policy", path: spaPaths.cookies },
  { name: "Terms of Use", path: spaPaths.terms },
  { name: "FAQ", path: spaPaths.faq },
  { name: "API", path: spaPaths.api },
  { name: "Log in", path: spaPaths.login },
  { name: "Sign up", path: spaPaths.signup },
];
```

(The old comment claimed `spaPaths` "also carries `faq`, which is not migrated yet (M2)". It did not carry `faq` at all until Task 4, and M2 was the session bootstrap, not the FAQ.)

- [ ] **Step 2: Run the accessibility suite**

```bash
corepack yarn e2e accessibility; echo "EXIT=$?"
```

Expected: PASS. Needs `foreman` on PATH and a development database. If pre-existing unrelated failures appear, check them against issue #1074 before treating them as yours — confirm by running the same spec on `master`.

- [ ] **Step 3: Fix any violations**

Most likely candidate: heading order. The FAQ is `h1` then fifteen `h2`s, which is fine; the API docs use `%dl`/`%dt`/`%dd`, which axe checks for correct nesting.

- [ ] **Step 4: Commit**

```bash
git add playwright-tests/accessibility.spec.ts
git commit -m "Scan the FAQ and API pages for accessibility violations

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Update the plan document

**Files:**
- Modify: `docs/frontend-modernization-plan.md` (the "Migration order (milestones)" list)

- [ ] **Step 1: Correct M1's entry**

M1 claims it ported "faq/about/contact/terms/cookies". The FAQ was dropped without a note. Add to that bullet:

> *(The FAQ was not in fact ported here — it was dropped silently and finally landed in M9. Worth noting as the same failure mode as M6's and M8's "last legacy link" claims: a milestone note asserting completion that nobody checked.)*

- [ ] **Step 2: Add the M9 entry and renumber cutover**

Insert an **M9 — Static content** bullet after M8, in the established style: what landed, at which paths, which serializer fields were added, which divergences were deliberate, what stays live in HAML, and what covers it. Renumber the existing **M9 — Cutover** to **M11**.

- [ ] **Step 3: Commit**

```bash
git add docs/frontend-modernization-plan.md
git commit -m "Record M9 and renumber cutover to M11

Also corrects M1, which claimed the FAQ and dropped it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Done when

- `/app/faq` and `/app/api` render, and `/faq` and `/api` still serve HAML unchanged.
- All fifteen FAQ anchors resolve; `#reset` lands on the cancel instructions.
- `grep -rn 'href="/faq' app/frontend/` returns nothing.
- `corepack yarn lint`, `typecheck`, `test`, and `bundle exec rspec` all exit 0.
- `corepack yarn e2e` is no worse than on `master` (see #1074).
