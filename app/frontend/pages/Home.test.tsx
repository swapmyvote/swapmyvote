import type { UseQueryResult } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Home } from "@/pages/Home";
import {
  useConstituencies,
  useElection,
  useParties,
} from "@/lib/referenceData";
import {
  sessionPayload,
  sessionValue,
  testSwap,
  testUser,
  TestSessionProvider,
} from "@/test/sessionFixtures";
import type { AppMode, Election, SessionFlags } from "@/types/api";

vi.mock("@/lib/referenceData", () => ({
  useElection: vi.fn(),
  useConstituencies: vi.fn(),
  useParties: vi.fn(),
}));

vi.mock("@/components/home/ActionNetworkForm", () => ({
  ActionNetworkForm: () => <div>newsletter form</div>,
}));

const election: Election = {
  generalElection: false,
  hidePolls: false,
  year: "2022",
  date: "2022-06-23",
  season: "summer",
  dateMd: "June 23rd",
  dateDm: "23rd June",
  dateAndTypeMy: "June 2022 by-elections",
  dateAndTypeMdy: "June 23rd 2022 by-elections",
  dateSeasonType: "2022 summer by-elections",
  eventTitleWithYear: "Wakefield and Tiverton & Honiton 2022 by-elections",
  eventChoice: "Wakefield or Tiverton & Honiton by-elections",
  hashtags: "#Wakefield or #TivertonandHoniton #byelection",
  constituencyOther: "the other constituency",
  constituenciesAsSentence: "Wakefield and Tiverton & Honiton",
  donate: { link: "https://crowdfunder.co.uk/swapmyvote", show: false },
};

// The hooks are mocked, so tests only need the two fields Home reads.
function loaded<T>(data: T) {
  return { data, isPending: false } as unknown as UseQueryResult<T>;
}

function renderHome({
  appMode,
  flags,
  session = {},
  electionOverrides = {},
}: {
  appMode: AppMode;
  flags: Partial<SessionFlags>;
  session?: Parameters<typeof sessionPayload>[0];
  electionOverrides?: Partial<Election>;
}) {
  vi.mocked(useElection).mockReturnValue(
    loaded({ ...election, ...electionOverrides }),
  );
  vi.mocked(useConstituencies).mockReturnValue(
    loaded([{ onsId: "E14001009", name: "Wakefield" }]),
  );
  vi.mocked(useParties).mockReturnValue(
    loaded([
      { id: 1, name: "Green", color: null, smvCode: "grn" },
    ]) as ReturnType<typeof useParties>,
  );

  render(
    <TestSessionProvider
      value={sessionValue({
        session: sessionPayload({ appMode, flags, ...session }),
      })}
    >
      <Home />
    </TestSessionProvider>,
  );
}

const closed = {
  loginsOpen: true,
  swappingOpen: false,
  votingOpen: false,
  votingInfoLocked: false,
};

describe("Home", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("the five phases", () => {
    it("invites swaps before the election when swapping is open", () => {
      renderHome({ appMode: "open", flags: { swappingOpen: true } });

      expect(
        screen.getByRole("heading", {
          name: /make your vote count in the 2022 summer by-elections/i,
        }),
      ).toBeVisible();
      expect(screen.getByRole("combobox")).toBeVisible();
    });

    it("still takes swaps once voting is open, and points at the polls", () => {
      renderHome({
        appMode: "open-and-voting",
        flags: { swappingOpen: true, votingOpen: true },
      });

      expect(
        screen.getByRole("heading", {
          name: /the 2022 summer by-elections are here/i,
        }),
      ).toBeVisible();
      expect(screen.getByRole("combobox")).toBeVisible();
      expect(
        screen.getByText(/find your local polling station/i),
      ).toBeVisible();
    });

    it("closes for new swaps once voting is open and swapping is not", () => {
      renderHome({
        appMode: "closed-and-voting",
        flags: { ...closed, votingOpen: true },
      });

      expect(
        screen.getByRole("heading", { name: /it's time to vote/i }),
      ).toBeVisible();
      // No entry form: swapping is closed.
      expect(screen.queryByRole("combobox")).toBeNull();
    });

    it("warms up before launch", () => {
      renderHome({
        appMode: "closed-warm-up",
        flags: { ...closed, loginsOpen: false },
      });

      expect(
        screen.getByRole("heading", { name: /june 2022 by-elections update/i }),
      ).toBeVisible();
      expect(screen.queryByRole("combobox")).toBeNull();
    });

    it("winds down afterwards", () => {
      renderHome({ appMode: "closed-wind-down", flags: closed });

      expect(screen.getByRole("heading", { name: /a wrap!/i })).toBeVisible();
      expect(screen.queryByRole("combobox")).toBeNull();
    });
  });

  describe("during closed-and-voting", () => {
    const votingFlags = { ...closed, votingOpen: true };

    it("congratulates a user whose swap was confirmed", () => {
      renderHome({
        appMode: "closed-and-voting",
        flags: votingFlags,
        session: {
          currentUser: testUser,
          swap: { ...testSwap, confirmed: true },
        },
      });

      expect(screen.getByText(/congratulations/i)).toBeVisible();
      expect(
        screen.getByText(/let your swap partner know you've voted/i),
      ).toBeVisible();
    });

    it("commiserates with someone who never got a swap", () => {
      renderHome({ appMode: "closed-and-voting", flags: votingFlags });

      expect(
        screen.getByText(/we're sorry we weren't able to pair you/i),
      ).toBeVisible();
      expect(screen.queryByText(/congratulations/i)).toBeNull();
    });
  });

  describe("poll commentary in the explainer", () => {
    it("is shown when polls are meaningful", () => {
      renderHome({
        appMode: "open",
        flags: { swappingOpen: true },
        electionOverrides: { hidePolls: false },
      });

      expect(screen.getByText(/the recent polls by their name/i)).toBeVisible();
    });

    it("is hidden when there are too few constituencies for it to mean anything", () => {
      renderHome({
        appMode: "open",
        flags: { swappingOpen: true },
        electionOverrides: { hidePolls: true },
      });

      expect(screen.queryByText(/the recent polls by their name/i)).toBeNull();
    });
  });

  it("waits rather than guessing a phase before the session arrives", () => {
    vi.mocked(useElection).mockReturnValue(loaded(election));
    vi.mocked(useConstituencies).mockReturnValue(
      loaded([]) as ReturnType<typeof useConstituencies>,
    );
    vi.mocked(useParties).mockReturnValue(
      loaded([]) as ReturnType<typeof useParties>,
    );

    render(
      <TestSessionProvider
        value={sessionValue({ session: null, isLoading: true })}
      >
        <Home />
      </TestSessionProvider>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
