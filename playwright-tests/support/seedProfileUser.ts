import { execFileSync } from "node:child_process";
import { test } from "@playwright/test";

// Spring keeps a preloader around between `bin/rails` calls, and a stale one
// leaves `runner` hanging with no output — which stalls the whole suite before
// a single test starts. Seeding is a
// handful of one-shot calls, so the preloader buys nothing here anyway.
//
// SERVER_HOST (config/application.rb's action_mailer.default_url_options)
// falls back to "localhost" the same way .env.test does: this `runner`
// process is separate from whatever process is serving the app under test,
// so it does not inherit that server's own SERVER_HOST just because it is
// set there. Without it, ActionMailer raises building any mail that links
// back to the site — which clear_swap can trigger below, since destroying an
// existing swap emails both sides.
const railsEnv = {
  ...process.env,
  DISABLE_SPRING: "1",
  SERVER_HOST: process.env.SERVER_HOST || "localhost",
};

// The ONS ids below must be the ones the real boundary data uses for these
// seats, because `find_or_create_by!` only applies the name when it creates
// the row. On a database that has been through `db:seed` — which
// `bin/rails db:prepare` does on a fresh database, so most local ones — the
// row already exists and keeps whatever name the seeds gave it. Woking was
// previously seeded here as E14001063, which is really Aldershot: on a
// fixtures-only database (CI) that created a seat called Woking and passed,
// and on a seeded one it silently put the fixture user in Aldershot, failing
// profile.spec.ts's "predicted results for Woking".
const WOKING = "E14001592";
const WAKEFIELD = "E14001009";

export interface TestCredentials {
  email: string;
  password: string;
}

/**
 * Requests a real password reset for an already-seeded user and returns the
 * raw token, straight from `User#send_reset_password_instructions` — Devise
 * only ever persists that token's digest, so the plaintext otherwise exists
 * nowhere but the email it sends. This adds no production-facing code: it is
 * the instance method Devise ships, called the same way the M10 API
 * controller calls the class-level `send_reset_password_instructions`, just
 * with a handle on the return value that controller throws away.
 *
 * `railsEnv` matters doubly here: this deliberately generates a mail (Devise's
 * reset-instructions notification), which is exactly the case `SERVER_HOST`
 * exists for — see the comment above.
 *
 * The token comes back on a marked line rather than as bare stdout, because
 * `runner`'s own boot output (deprecation notices, and the like) can land on
 * the same stream as whatever the script prints.
 */
export function requestPasswordResetToken(email: string): string {
  const script = `
    user = User.find_by!(email: "${email}")
    token = user.send_reset_password_instructions
    puts "RESET_TOKEN=#{token}"
  `;
  const output = execFileSync("bin/rails", ["runner", script], {
    env: railsEnv,
  }).toString();

  const match = output.match(/^RESET_TOKEN=(\S+)$/m);
  if (!match) {
    throw new Error(
      `could not find a reset token in \`bin/rails runner\` output:\n${output}`,
    );
  }
  return match[1];
}

function runRails(script: string): void {
  execFileSync("bin/rails", ["runner", script], {
    stdio: "inherit",
    env: railsEnv,
  });
}

function profileUserCredentials(suffix: string): TestCredentials {
  return {
    email: `e2e-profile${suffix}@example.com`,
    password: "e2e-profile-password",
  };
}

// Ruby, run against the dev database the stack is already serving. Everything
// is idempotent (find_or_create_by / update) so re-running the suite does not
// pile up rows, and the user is left in a known state whatever the last run
// did to it.
//
// Three parties, not two: the profile spec changes the willing party from
// Labour to Green, and DistinctPartiesValidator rejects a save where the
// preferred and willing party are the same. Conservative is the fixture
// user's preferred party precisely so it is never the target of that switch,
// leaving Green and Labour free to be the pair the willing-party test swaps
// between.
//
// Labour's Woking poll is set far above anything else in the seat, so it is
// always the leading party there. Poll#signed_marginal_score compares a poll
// with every other poll in the same constituency, not just this fixture's,
// and every fixture shares Woking: swapPair seeds its own Labour-<suffix> at
// 4210, and a database that has been through `db:seed` has the real Woking
// polls as well. At 4210 this poll tied with swapPair's, so whether the
// review screen said "safe win" or "trailing" depended on which other spec
// files had already run (#1081). marginal_score is still set explicitly, so
// the percentage the screen shows does not move.
const leadingVotes = 50_000;

const sharedRowsScript = `
    woking = OnsConstituency.find_or_create_by!(ons_id: "${WOKING}") { |c| c.name = "Woking" }
    OnsConstituency.find_or_create_by!(ons_id: "${WAKEFIELD}") { |c| c.name = "Wakefield" }
    Party.find_or_create_by!(name: "Conservative") { |p| p.color = "#0087DC" }
    green = Party.find_or_create_by!(name: "Green") { |p| p.color = "#6AB023" }
    labour = Party.find_or_create_by!(name: "Labour") { |p| p.color = "#DC241f" }

    [[green, 1200], [labour, ${leadingVotes}]].each do |party, votes|
      poll = Poll.find_or_initialize_by(constituency_ons_id: woking.ons_id, party_id: party.id)
      poll.update!(votes: votes, marginal_score: 3010)
    end
  `;

/**
 * Creates the rows profileUser shares between spec files — the two
 * constituencies, the three parties and the two Woking polls — once, before
 * any worker starts. Run from playwright.config.ts's globalSetup.
 *
 * Spec files run in parallel, and each seeds its fixtures in its own worker.
 * On a fresh database (CI's is schema-only), two workers creating the same
 * shared row at once race. `parties.name` has no unique index, so that can
 * leave two "Green" parties and an ambiguous party dropdown. The
 * constituency and poll indexes are unique, so there it raises
 * RecordNotUnique instead. Creating them here first means every later
 * `find_or_create_by!` only finds.
 */
export function seedSharedRows(): void {
  runRails(sharedRowsScript);
}

function profileUserScript(credentials: TestCredentials): string {
  return `
    woking = OnsConstituency.find_by!(ons_id: "${WOKING}")
    conservative = Party.find_by!(name: "Conservative")
    labour = Party.find_by!(name: "Labour")

    user = User.find_or_initialize_by(email: "${credentials.email}")
    user.password = "${credentials.password}"
    user.name = "E2E Voter"
    user.constituency_ons_id = woking.ons_id
    user.preferred_party = conservative
    user.willing_party = labour
    user.save!
  `;
}

function userWithoutConstituencyCredentials(suffix: string): TestCredentials {
  return {
    email: `e2e-profile-no-constituency${suffix}@example.com`,
    password: "e2e-profile-password",
  };
}

function userWithoutConstituencyScript(credentials: TestCredentials): string {
  return `
    user = User.find_or_initialize_by(email: "${credentials.email}")
    user.password = "${credentials.password}"
    user.name = "E2E Voter (no constituency)"
    user.constituency_ons_id = nil
    user.save!
  `;
}

export interface SwapPair {
  chooser: TestCredentials;
  chosen: TestCredentials;
}

function swapPairCredentials(suffix: string): SwapPair {
  return {
    chooser: {
      email: `e2e-swap-chooser${suffix}@example.com`,
      password: "e2e-swap-chooser-password",
    },
    chosen: {
      email: `e2e-swap-chosen${suffix}@example.com`,
      password: "e2e-swap-chosen-password",
    },
  };
}

// The parties are named per-suffix (Green-e2e, Green-axe, …), not shared
// "Green"/"Labour" rows: complementary_voters matches purely on party id, and
// two files' pairs can be in the database at once. Sharing party rows would
// let one pair's chooser generate the other pair's chosen user as a
// candidate, and a suffix on the emails alone would not stop that.
//
// Any existing swap between them is cleared, so a re-run starts from the same
// place as a first run.
function swapPairScript(pair: SwapPair, suffix: string): string {
  const { chooser, chosen } = pair;
  return `
    woking = OnsConstituency.find_or_create_by!(ons_id: "${WOKING}") { |c| c.name = "Woking" }
    wakefield = OnsConstituency.find_or_create_by!(ons_id: "${WAKEFIELD}") { |c| c.name = "Wakefield" }
    green = Party.find_or_create_by!(name: "Green${suffix}") { |p| p.color = "#6AB023" }
    labour = Party.find_or_create_by!(name: "Labour${suffix}") { |p| p.color = "#DC241f" }

    [[woking, green, 1200], [woking, labour, 4210],
     [wakefield, green, 3100], [wakefield, labour, 3500]].each do |seat, party, votes|
      poll = Poll.find_or_initialize_by(constituency_ons_id: seat.ons_id, party_id: party.id)
      poll.update!(votes: votes, marginal_score: 400)
    end

    pairs = [
      ["${chooser.email}", "${chooser.password}", "E2E Chooser", woking, green, labour, "+447700900001${suffix}"],
      ["${chosen.email}", "${chosen.password}", "E2E Chosen", wakefield, labour, green, "+447700900002${suffix}"]
    ]

    pairs.each do |email, password, name, seat, preferred, willing, number|
      person = User.find_or_initialize_by(email: email)
      person.password = password
      person.name = name
      person.constituency_ons_id = seat.ons_id
      person.preferred_party = preferred
      person.willing_party = willing
      person.save!
      person.clear_swap
      phone = MobilePhone.find_or_initialize_by(user_id: person.id)
      phone.number = number
      phone.verified = true
      phone.save!
    end
  `;
}

// Creates the swap directly rather than driving offer-and-confirm through the
// UI, which swap.spec.ts already covers and which would double the runtime of
// every file that needs one. `has_voted` is reset too, so a re-run starts
// from the same place as a first run.
function confirmSwapScript(pair: SwapPair): string {
  return `
    chooser = User.find_by!(email: "${pair.chooser.email}")
    chosen = User.find_by!(email: "${pair.chosen.email}")

    chooser.create_outgoing_swap!(chosen_user: chosen, confirmed: true,
                                  consent_share_email_chooser: true,
                                  consent_share_email_chosen: true)
    chooser.update!(has_voted: false)
    chosen.update!(has_voted: false)
  `;
}

/**
 * Seeds the fixtures a spec file declares, in one `bin/rails runner` call, in
 * a file-level `beforeAll`.
 *
 * Call it once at the top of a spec file, then declare that file's fixtures
 * on what it returns. Each method hands back the fixture's credentials
 * straight away, so they can be used anywhere in the file, but writes nothing
 * until the `beforeAll` runs.
 *
 * Fixtures used to be seeded by calling a function at module scope, each
 * spawning its own `bin/rails runner`. That cost a full Rails boot (~2.5s)
 * per fixture, twice: Playwright imports every spec file once in its main
 * process just to list the tests, then again in the worker that runs them,
 * and module-scope code runs both times. That was 50 boots and over two
 * minutes of a ~3.5 minute suite (#1074). A `beforeAll` only runs in the
 * worker, and batching makes it one boot per file.
 *
 * A retry still starts from a fresh fixture: Playwright replaces the worker
 * after a failure, and the new worker runs this `beforeAll` again.
 */
export function seedBeforeAll() {
  const scripts: string[] = [];

  test.beforeAll(() => {
    // One cold Rails boot plus every fixture this file declares. The default
    // 30s test timeout also applies to hooks, and the first boot of a run has
    // been seen to take over 20s on its own.
    test.setTimeout(120_000);
    // Each fixture's script runs in its own lambda so their local variables
    // (woking, green, user, …) cannot leak into one another.
    runRails(
      scripts.map((script) => `(lambda do\n${script}\nend).call`).join("\n"),
    );
  });

  return {
    /**
     * A fixture user, plus the parties, constituency and polls it needs.
     *
     * `suffix` gives each spec file its own **user** row, so specs that
     * mutate the user (profile.spec.ts changes party and email) do not stomp
     * on one another. It isolates nothing else: the constituency, the three
     * parties and the two Woking polls are shared by every caller. That is
     * safe only because every caller writes them with the same values, and
     * no spec changes them.
     */
    profileUser(suffix = ""): TestCredentials {
      const credentials = profileUserCredentials(suffix);
      scripts.push(profileUserScript(credentials));
      return credentials;
    },

    /**
     * A fixture user deliberately left without a constituency, for the
     * constituency screen's "nothing chosen" test.
     *
     * That test originally cleared the primary fixture's pre-filled
     * constituency (select-all, delete, blur) before saving. That interaction
     * is genuinely racy in ConstituencyAutocomplete's Downshift wiring —
     * clearing the visible text and committing the cleared selection are two
     * separate state updates, and a fast automated blur can land between
     * them — so a real user typing at human speed is very unlikely to hit
     * it, but scripted input reliably did. Starting from no constituency at
     * all tests the same "must choose one" validation without depending on
     * that interaction.
     *
     * `suffix` gives each spec file its own row, like profileUser's.
     */
    userWithoutConstituency(suffix = ""): TestCredentials {
      const credentials = userWithoutConstituencyCredentials(suffix);
      scripts.push(userWithoutConstituencyScript(credentials));
      return credentials;
    },

    /**
     * Two complementary, swap-ready users in different constituencies, plus
     * polls for both — everything User#complementary_voters requires before
     * it will offer them to each other.
     *
     * Both get a verified mobile number: the swap endpoints refuse without
     * one, and verifying twice through the UI would double the runtime of
     * every test here for no extra coverage — mobile.spec.ts already covers
     * that journey.
     */
    swapPair(suffix = ""): SwapPair {
      const pair = swapPairCredentials(suffix);
      scripts.push(swapPairScript(pair, suffix));
      return pair;
    },

    /**
     * A swap pair that is already confirmed, for screens that only exist
     * past confirmation.
     */
    confirmedSwapPair(suffix = ""): SwapPair {
      const pair = swapPairCredentials(suffix);
      scripts.push(swapPairScript(pair, suffix), confirmSwapScript(pair));
      return pair;
    },
  };
}

/**
 * Re-seeds a swap pair immediately, clearing any swap between them. For a
 * test that needs a fresh offer after an earlier test in the same file used
 * the last one up — declare the pair with `seedBeforeAll().swapPair` first.
 */
export function reseedSwapPair(suffix = ""): SwapPair {
  const pair = swapPairCredentials(suffix);
  runRails(swapPairScript(pair, suffix));
  return pair;
}
