import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { updateProfile } from "@/lib/profile";
import type { Constituency, CurrentUser, Party } from "@/types/api";

vi.mock("@/lib/profile", () => ({ updateProfile: vi.fn() }));

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

function renderForm(overrides: { user?: CurrentUser; locked?: boolean } = {}) {
  const onSaved = vi.fn();
  render(
    <ProfileForm
      parties={parties}
      constituencies={constituencies}
      user={overrides.user ?? user}
      locked={overrides.locked ?? false}
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
    renderForm();

    expect(
      screen.getByText(/will undo any swap that you have agreed to/i),
    ).toBeInTheDocument();
  });

  it("locks the swap fields on election day once the swap is confirmed", () => {
    renderForm({ locked: true });

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
});
