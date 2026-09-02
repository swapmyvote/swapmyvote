// The FE/BE contract. Every shape here mirrors a serializer under
// app/serializers/api/v1/ — change one, change the other, and keep the RSpec
// request specs (spec/requests/api/v1/) asserting the same keys.

/** The five operational phases (AppModeConcern::VALID_MODES). */
export type AppMode =
  | "closed-warm-up"
  | "open"
  | "closed-and-voting"
  | "open-and-voting"
  | "closed-wind-down";

/**
 * The phases collapsed to what the UI actually branches on. These are for
 * presentation only — the server re-checks every gate on every request, so a
 * client that ignores them gains nothing.
 */
export interface SessionFlags {
  loginsOpen: boolean;
  swappingOpen: boolean;
  votingOpen: boolean;
  /** Voting is open and this user's swap is confirmed: their voting info,
   *  constituency, parties and account are locked. */
  votingInfoLocked: boolean;
}

export interface Party {
  id: number;
  name: string | null;
  color: string | null;
  /** Short code the `.party-*` colour classes key off. */
  smvCode: string | null;
}

export interface CurrentUser {
  id: number;
  name: string | null;
  email: string | null;
  imageUrl: string;
  hasConstituency: boolean;
  constituencyName: string | null;
  constituencyOnsId: string | null;
  mobileNumber: string | null;
  mobileVerified: boolean;
  mobileSetButNotVerified: boolean;
  preferredParty: Party | null;
  willingParty: Party | null;
}

/** The other side of a swap: strictly less than CurrentUser — no id, no email. */
export interface SwapPartner {
  name: string | null;
  imageUrl: string;
  constituencyName: string | null;
}

export interface SwapSummary {
  id: number;
  /** "outgoing" = this user chose their partner; "incoming" = they were chosen. */
  state: "outgoing" | "incoming";
  confirmed: boolean;
  partner: SwapPartner | null;
}

/** `GET /api/v1/session` — the SPA's single source of truth. */
export interface SessionPayload {
  appMode: AppMode;
  flags: SessionFlags;
  currentUser: CurrentUser | null;
  swap: SwapSummary | null;
}

/** A constituency the site runs swaps in. `onsId` is the ONS GSS code. */
export interface Constituency {
  onsId: string;
  name: string;
}

/**
 * `GET /api/v1/election` — the election being run for, and the prose the
 * headings are built from. Derived server-side from env vars and the
 * constituency count (see Api::V1::ElectionPresenter), and immutable for the
 * life of a deploy.
 */
export interface Election {
  generalElection: boolean;
  /** True when there are so few constituencies that poll numbers give the
   *  answer away. */
  hidePolls: boolean;
  year: string;
  /** ISO 8601, e.g. "2024-07-04". */
  date: string;
  season: "winter" | "spring" | "summer" | "autumn";
  /** "July 4th" */
  dateMd: string;
  /** "4th July" */
  dateDm: string;
  /** "June 2022 by-elections" */
  dateAndTypeMy: string;
  /** "June 23rd 2022 by-elections" */
  dateAndTypeMdy: string;
  /** "2022 summer by-elections" */
  dateSeasonType: string;
  /** "General Election 2024" */
  eventTitleWithYear: string;
  /** "Wakefield or Tiverton & Honiton by-elections" */
  eventChoice: string;
  /** "#GeneralElection" */
  hashtags: string;
  /** "another constituency" / "the other constituency" */
  constituencyOther: string;
  /** "Wakefield and Tiverton & Honiton" */
  constituenciesAsSentence: string;
  donate: {
    link: string;
    show: boolean;
  };
}

/** What the entry form has stashed in the session so far. */
export interface PrePopulate {
  constituencyOnsId: string | null;
  preferredPartyName: string | null;
  willingPartyName: string | null;
}

/** Every non-2xx response body from /api/v1. */
export interface ApiErrorBody {
  error: {
    code: string;
    messages: string[];
    fields: Record<string, string[]>;
  };
}

/** One party's predicted result in a constituency. Numbers are as stored:
 *  `votes` and both marginal scores are hundredths of a percent, so a chart
 *  divides by 100 to show a percentage. */
export interface ConstituencyPoll {
  partyId: number;
  partyName: string | null;
  /** Abbreviation the chart labels bars with, e.g. "Lab". */
  partyShortName: string;
  color: string | null;
  votes: number;
  /** Absolute gap to the best of the other parties. Null until the marginal
   *  score rake task has run over this constituency. */
  marginalScore: number | null;
  /** Signed gap: positive when this party leads. */
  signedMarginalScore: number;
}

/** `GET /api/v1/constituencies/:ons_id` — a constituency and the polls the
 *  review screen charts. Parties with no predicted votes are already gone. */
export interface ConstituencyDetail extends Constituency {
  polls: ConstituencyPoll[];
}

/** `PATCH /api/v1/user`. Every field is optional: what is not sent is left
 *  alone, so the constituency screen can post a subset. */
export interface ProfileUpdate {
  preferredPartyId?: string;
  willingPartyId?: string;
  constituencyOnsId?: string;
  email?: string;
}

export interface ProfileUpdateResult {
  user: CurrentUser;
  /** The willing party or the constituency changed, so the user is sent to
   *  the review screen — mirrors User#swap_profile_changed?. */
  reviewRequired: boolean;
}

/** `POST /api/v1/mobile_phone/verifications`. Confirming a code answers with
 *  a `SessionPayload` instead. */
export interface MobileVerificationSent {
  number: string;
  sent: true;
}
