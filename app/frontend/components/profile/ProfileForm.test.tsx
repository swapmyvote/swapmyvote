import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ApiError } from "@/lib/apiClient";
import { updateProfile } from "@/lib/profile";
import type { Constituency, CurrentUser, Party } from "@/types/api";

vi.mock("@/lib/profile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile")>();
  return { ...actual, updateProfile: vi.fn() };
});

const parties: Party[] = [
  { id: 1, name: "Green", color: "#6AB023", smvCode: "grn" },
  { id: 2, name: "Labour", color: "#DC241f", smvCode: "lab" },
];

const constituencies: Constituency[] = [
  { onsId: "E14001063", name: "Woking" },
  { onsId: "E14001009", name: "Wakefield" },
];

const user: CurrentUser = {
  id: 1,
  name: "John",
  email: "john@example.com",
  imageUrl: "/john.png",
  hasConstituency: true,
  constituencyName: "Woking",
  constituencyOnsId: "E14001063",
  mobileVerified: false,
  mobileSetButNotVerified: true,
  preferredParty: parties[0],
  willingParty: parties[1],
};

function renderForm(
  overrides: { user?: CurrentUser; locked?: boolean; hasSwap?: boolean } = {},
) {
  const onSaved = vi.fn();
  render(
    <ProfileForm
      parties={parties}
      constituencies={constituencies}
      user={overrides.user ?? user}
      locked={overrides.locked ?? false}
      hasSwap={overrides.hasSwap ?? true}
      onSaved={onSaved}
    />,
  );
  return { onSaved };
}

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.mocked(updateProfile).mockReset();
    vi.mocked(updateProfile).mockResolvedValue({
      user,
      reviewRequired: false,
    });
  });

  it("starts from what we already know about the user", () => {
    renderForm();

    expect(screen.getByLabelText(/preferred party/i)).toHaveValue("1");
    expect(screen.getByLabelText(/willing to vote for/i)).toHaveValue("2");
    expect(screen.getByLabelText(/email address/i)).toHaveValue(
      "john@example.com",
    );
  });

  it("falls back to blanks when the user has none of this yet", () => {
    const sparseUser: CurrentUser = {
      ...user,
      preferredParty: null,
      willingParty: null,
      constituencyOnsId: null,
      email: null,
    };
    renderForm({ user: sparseUser });

    expect(screen.getByLabelText(/preferred party/i)).toHaveValue("");
    expect(screen.getByLabelText(/willing to vote for/i)).toHaveValue("");
    expect(
      screen.getByRole("combobox", { name: /my constituency is/i }),
    ).toHaveValue("");
    expect(screen.getByLabelText(/email address/i)).toHaveValue("");
  });

  it("saves every field, and hands the result back", async () => {
    const { onSaved } = renderForm();

    await userEvent.selectOptions(
      screen.getByLabelText(/preferred party/i),
      "2",
    );
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        preferredPartyId: "2",
        willingPartyId: "2",
        constituencyOnsId: "E14001063",
        email: "john@example.com",
      }),
    );
    expect(onSaved).toHaveBeenCalledWith({ user, reviewRequired: false });
  });

  it("warns that changing the profile undoes an agreed swap", () => {
    renderForm({ hasSwap: true });

    expect(
      screen.getByText(/will undo any swap that you have agreed to/i),
    ).toBeInTheDocument();
  });

  it("stays quiet about undoing a swap the user does not have", () => {
    renderForm({ hasSwap: false });

    expect(
      screen.queryByText(/will undo any swap that you have agreed to/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/currently locked/i)).not.toBeInTheDocument();
  });

  it("locks the swap fields on election day once the swap is confirmed", () => {
    renderForm({ locked: true, hasSwap: true });

    expect(screen.getByLabelText(/preferred party/i)).toBeDisabled();
    expect(screen.getByLabelText(/willing to vote for/i)).toBeDisabled();
    expect(screen.getByText(/currently locked/i)).toBeInTheDocument();
  });

  it("links out to the legacy mobile page, reporting what we have", () => {
    renderForm();

    expect(screen.getByText(/not verified/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /verify your mobile/i }),
    ).toHaveAttribute("href", "/user/edit");
  });

  it("links out to account deletion", () => {
    renderForm();

    expect(
      screen.getByRole("link", { name: /delete your account/i }),
    ).toHaveAttribute("href", "/confirm_account_deletion");
  });

  it("shows what went wrong when saving fails", async () => {
    vi.mocked(updateProfile).mockRejectedValueOnce(
      new ApiError(422, {
        error: { code: "invalid", messages: ["Email is invalid"], fields: {} },
      }),
    );
    renderForm({ hasSwap: false });

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email is invalid",
    );
  });

  it("falls back to a generic message when saving fails without one", async () => {
    vi.mocked(updateProfile).mockRejectedValueOnce(new Error("network down"));
    renderForm({ hasSwap: false });

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
  });
});
