import type { UseQueryResult } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useConstituencies, useParties } from "@/lib/referenceData";
import { updateProfile } from "@/lib/profile";
import { spaPaths } from "@/lib/spaPaths";
import { Constituency } from "@/pages/Constituency";
import {
  sessionPayload,
  sessionValue,
  testUser,
  TestSessionProvider,
} from "@/test/sessionFixtures";
import type { Constituency as ConstituencyType, Party } from "@/types/api";

vi.mock("@/lib/referenceData", () => ({
  useConstituencies: vi.fn(),
  useParties: vi.fn(),
}));

vi.mock("@/lib/profile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile")>();
  return { ...actual, updateProfile: vi.fn() };
});

// The hooks are mocked, so the test only needs the two fields Constituency reads.
function loaded<T>(data: T) {
  return { data, isPending: false } as unknown as UseQueryResult<T>;
}

const parties: Party[] = [
  { id: 1, name: "Green", color: "#6AB023", smvCode: "grn" },
  { id: 2, name: "Labour", color: "#DC241f", smvCode: "lab" },
];

const constituencies: ConstituencyType[] = [
  { onsId: "E14001063", name: "Woking" },
];

function renderPage() {
  vi.mocked(useParties).mockReturnValue(loaded(parties));
  vi.mocked(useConstituencies).mockReturnValue(loaded(constituencies));

  const refetchSession = vi.fn().mockResolvedValue(null);

  render(
    <TestSessionProvider
      value={sessionValue({
        refetchSession,
        session: sessionPayload({ currentUser: testUser }),
      })}
    >
      <MemoryRouter initialEntries={[spaPaths.constituency]}>
        <Routes>
          <Route path={spaPaths.constituency} element={<Constituency />} />
          <Route path={spaPaths.swap} element={<p>Swap</p>} />
        </Routes>
      </MemoryRouter>
    </TestSessionProvider>,
  );

  return { refetchSession };
}

describe("Constituency", () => {
  it("refetches the session and stays in the SPA on its way to the swap screen", async () => {
    vi.mocked(updateProfile).mockResolvedValue({
      user: testUser,
      reviewRequired: false,
    });
    const { refetchSession } = renderPage();

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Swap")).toBeInTheDocument();
    expect(refetchSession).toHaveBeenCalled();
  });
});
