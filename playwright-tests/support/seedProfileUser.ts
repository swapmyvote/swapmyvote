import { execFileSync } from "node:child_process";

// Spring keeps a preloader around between `bin/rails` calls, and a stale one
// leaves `runner` hanging with no output — which stalls the whole suite before
// a single test starts, since seeding happens at module load. Seeding is a
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

export interface TestCredentials {
  email: string;
  password: string;
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
function buildScript(credentials: TestCredentials): string {
  return `
    woking = OnsConstituency.find_or_create_by!(ons_id: "E14001063") { |c| c.name = "Woking" }
    OnsConstituency.find_or_create_by!(ons_id: "E14001009") { |c| c.name = "Wakefield" }
    conservative = Party.find_or_create_by!(name: "Conservative") { |p| p.color = "#0087DC" }
    green = Party.find_or_create_by!(name: "Green") { |p| p.color = "#6AB023" }
    labour = Party.find_or_create_by!(name: "Labour") { |p| p.color = "#DC241f" }

    [[green, 1200], [labour, 4210]].each do |party, votes|
      poll = Poll.find_or_initialize_by(constituency_ons_id: woking.ons_id, party_id: party.id)
      poll.update!(votes: votes, marginal_score: 3010)
    end

    user = User.find_or_initialize_by(email: "${credentials.email}")
    user.password = "${credentials.password}"
    user.name = "E2E Voter"
    user.constituency_ons_id = woking.ons_id
    user.preferred_party = conservative
    user.willing_party = labour
    user.save!
  `;
}

/**
 * Puts a fixture user, plus the shared parties/constituency/polls, in the dev
 * database the E2E stack is serving.
 *
 * `fullyParallel` (playwright.config.ts) can run several specs against this
 * fixture user at once, each in its own worker process. Sharing one email
 * across specs that mutate the user (profile.spec.ts changes party/
 * constituency fields) races: one spec's PATCH can load the row mid-edit by
 * another and stomp on it. `suffix` gives each spec file its own row instead
 * — profile.spec.ts's serial `describe` still protects it against its own
 * three tests racing each other, and a distinct suffix keeps other spec files
 * off that row entirely.
 */
export function seedProfileUser(suffix = ""): TestCredentials {
  const credentials: TestCredentials = {
    email: `e2e-profile${suffix}@example.com`,
    password: "e2e-profile-password",
  };
  execFileSync("bin/rails", ["runner", buildScript(credentials)], {
    stdio: "inherit",
    env: railsEnv,
  });
  return credentials;
}

/**
 * A second fixture, deliberately left without a constituency, for the
 * constituency screen's "nothing chosen" test.
 *
 * That test originally cleared the primary fixture's pre-filled constituency
 * (select-all, delete, blur) before saving. That interaction is genuinely
 * racy in ConstituencyAutocomplete's Downshift wiring — clearing the visible
 * text and committing the cleared selection are two separate state updates,
 * and a fast automated blur can land between them — so a real user typing at
 * human speed is very unlikely to hit it, but scripted input reliably did.
 * Starting from no constituency at all tests the same "must choose one"
 * validation without depending on that interaction.
 */
export function seedUserWithoutConstituency(): TestCredentials {
  const credentials: TestCredentials = {
    email: "e2e-profile-no-constituency@example.com",
    password: "e2e-profile-password",
  };
  const script = `
    user = User.find_or_initialize_by(email: "${credentials.email}")
    user.password = "${credentials.password}"
    user.name = "E2E Voter (no constituency)"
    user.constituency_ons_id = nil
    user.save!
  `;
  execFileSync("bin/rails", ["runner", script], {
    stdio: "inherit",
    env: railsEnv,
  });
  return credentials;
}

export interface SwapPair {
  chooser: TestCredentials;
  chosen: TestCredentials;
}

/**
 * Two complementary, swap-ready users in different constituencies, plus polls
 * for both — everything User#complementary_voters requires before it will
 * offer them to each other.
 *
 * Both get a verified mobile number: the swap endpoints refuse without one,
 * and verifying twice through the UI would double the runtime of every test
 * here for no extra coverage — mobile.spec.ts already covers that journey.
 *
 * The parties are named per-suffix (Green-e2e, Green-axe, …), not shared
 * "Green"/"Labour" rows: complementary_voters matches purely on party id, and
 * fullyParallel runs this file alongside accessibility.spec.ts's own
 * seedSwapPair("-axe") call, each in its own worker. Sharing party rows would
 * let one pair's chooser generate the other pair's chosen user as a
 * candidate, and a suffix on the emails alone would not stop that.
 *
 * Any existing swap between them is cleared, so a re-run starts from the same
 * place as a first run.
 */
export function seedSwapPair(suffix = ""): SwapPair {
  const chooser: TestCredentials = {
    email: `e2e-swap-chooser${suffix}@example.com`,
    password: "e2e-swap-chooser-password",
  };
  const chosen: TestCredentials = {
    email: `e2e-swap-chosen${suffix}@example.com`,
    password: "e2e-swap-chosen-password",
  };

  const script = `
    woking = OnsConstituency.find_or_create_by!(ons_id: "E14001063") { |c| c.name = "Woking" }
    wakefield = OnsConstituency.find_or_create_by!(ons_id: "E14001009") { |c| c.name = "Wakefield" }
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

  execFileSync("bin/rails", ["runner", script], {
    stdio: "inherit",
    env: railsEnv,
  });

  return { chooser, chosen };
}
