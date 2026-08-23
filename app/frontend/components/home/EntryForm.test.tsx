import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EntryForm } from "@/components/home/EntryForm";
import { apiClient } from "@/lib/apiClient";
import type { Constituency, Party } from "@/types/api";

vi.mock("@/lib/apiClient", () => ({ apiClient: { post: vi.fn() } }));

const constituencyFixtures: Constituency[] = [
  { onsId: "E14001009", name: "Wakefield" },
];
const partyFixtures: Party[] = [
  { id: 1, name: "Green", color: null, smvCode: "grn" },
  { id: 2, name: "Labour", color: null, smvCode: "lab" },
];

function renderForm() {
  render(
    <EntryForm
      constituencies={constituencyFixtures}
      parties={partyFixtures}
      constituencyOther="another constituency"
    />,
  );
}

async function completeConstituencyStep() {
  await userEvent.type(screen.getByRole("combobox"), "Wakefield");
  await userEvent.click(
    screen.getByRole("button", { name: /next: choose parties/i }),
  );
}

async function completePartiesStep() {
  await userEvent.selectOptions(
    await screen.findByLabelText(/most like to vote for/i),
    "1",
  );
  await userEvent.selectOptions(
    screen.getByLabelText(/could you vote for in exchange/i),
    "2",
  );
  await userEvent.click(screen.getByRole("button", { name: /next: sign up/i }));
}

describe("EntryForm", () => {
  let assign: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(apiClient.post).mockResolvedValue({});
    assign = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      assign,
    } as unknown as Location);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("starts on the constituency step", () => {
    renderForm();

    expect(screen.getByRole("combobox")).toBeVisible();
    expect(screen.queryByLabelText(/most like to vote for/i)).toBeNull();
  });

  it("moves to the parties step once a constituency is chosen", async () => {
    renderForm();

    await completeConstituencyStep();

    expect(
      await screen.findByLabelText(/most like to vote for/i),
    ).toBeVisible();
  });

  it("stashes the constituency server-side before moving on", async () => {
    renderForm();

    await completeConstituencyStep();

    // The answers have to outlive the SPA: sign-up is Devise-rendered HAML.
    expect(apiClient.post).toHaveBeenCalledWith("/pre_populate", {
      constituency_ons_id: "E14001009",
      preferred_party_id: undefined,
      willing_party_id: undefined,
    });
  });

  it("stashes everything, then leaves for sign up", async () => {
    renderForm();

    await completeConstituencyStep();
    await completePartiesStep();

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenLastCalledWith("/pre_populate", {
        constituency_ons_id: "E14001009",
        preferred_party_id: "1",
        willing_party_id: "2",
      });
    });
    expect(assign).toHaveBeenCalledWith("/users/sign_in");
  });

  it("moves on even if stashing the constituency fails", async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error("offline"));
    renderForm();

    await completeConstituencyStep();

    // The answer is still held in the form, and the next step stashes it all
    // again — not worth blocking the user over.
    expect(
      await screen.findByLabelText(/most like to vote for/i),
    ).toBeVisible();
  });

  it("does not send the user to sign up if the final stash fails", async () => {
    renderForm();
    await completeConstituencyStep();
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error("offline"));

    await completePartiesStep();

    // Signing up with the answers lost would land them in an account that has
    // forgotten everything they just chose.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong saving your choices/i,
    );
    expect(assign).not.toHaveBeenCalled();
  });
});
