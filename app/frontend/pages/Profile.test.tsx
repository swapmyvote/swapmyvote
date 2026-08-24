import type { UseQueryResult } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useConstituencies, useParties } from "@/lib/referenceData";
import { updateProfile } from "@/lib/profile";
import { Profile } from "@/pages/Profile";
import {
  sessionPayload,
  sessionValue,
  testUser,
  TestSessionProvider,
} from "@/test/sessionFixtures";
import type { Constituency, Party, ProfileUpdateResult } from "@/types/api";

vi.mock("@/lib/referenceData", () => ({
  useConstituencies: vi.fn(),
  useParties: vi.fn(),
}));

vi.mock("@/lib/profile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile")>();
  return { ...actual, updateProfile: vi.fn() };
});

// The hooks are mocked, so the test only needs the two fields Profile reads.
function loaded<T>(data: T) {
  return { data, isPending: false } as unknown as UseQueryResult<T>;
}

const parties: Party[] = [
  { id: 1, name: "Green", color: "#6AB023", smvCode: "grn" },
  { id: 2, name: "Labour", color: "#DC241f", smvCode: "lab" },
];

const constituencies: Constituency[] = [{ onsId: "E14001063", name: "Woking" }];

function renderProfile() {
  vi.mocked(useParties).mockReturnValue(loaded(parties));
  vi.mocked(useConstituencies).mockReturnValue(loaded(constituencies));

  render(
    <MemoryRouter>
      <TestSessionProvider
        value={sessionValue({
          session: sessionPayload({ currentUser: testUser }),
        })}
      >
        <Profile />
      </TestSessionProvider>
    </MemoryRouter>,
  );
}

const savedAlert = /your profile has been saved/i;

describe("Profile", () => {
  it("shows a saved alert once a save completes", async () => {
    vi.mocked(updateProfile).mockResolvedValue({
      user: testUser,
      reviewRequired: false,
    });
    renderProfile();

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(savedAlert)).toBeInTheDocument();
  });

  it("clears a stale saved alert as soon as another save starts", async () => {
    vi.mocked(updateProfile).mockResolvedValueOnce({
      user: testUser,
      reviewRequired: false,
    });
    let resolveSecondSave: (result: ProfileUpdateResult) => void = () => {};
    vi.mocked(updateProfile).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecondSave = resolve;
        }),
    );
    renderProfile();

    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(savedAlert)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.queryByText(savedAlert)).not.toBeInTheDocument();

    resolveSecondSave({ user: testUser, reviewRequired: false });
  });
});
