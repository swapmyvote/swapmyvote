import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConstituencyForm } from "@/components/profile/ConstituencyForm";
import { ApiError } from "@/lib/apiClient";
import { updateProfile } from "@/lib/profile";
import type { Constituency, Party } from "@/types/api";

vi.mock("@/lib/profile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile")>();
  return { ...actual, updateProfile: vi.fn() };
});

const constituencies: Constituency[] = [
  { onsId: "E14001063", name: "Woking" },
  { onsId: "E14001009", name: "Wakefield" },
];

const parties: Party[] = [
  { id: 1, name: "Green", color: "#6AB023", smvCode: "grn" },
  { id: 2, name: "Labour", color: "#DC241f", smvCode: "lab" },
];

function renderForm(
  props: Partial<Parameters<typeof ConstituencyForm>[0]> = {},
) {
  const onSaved = vi.fn();
  render(
    <ConstituencyForm
      constituencies={constituencies}
      initialOnsId=""
      needsEmail={false}
      initialEmail=""
      parties={parties}
      needsParties={false}
      initialPreferredPartyId=""
      initialWillingPartyId=""
      onSaved={onSaved}
      {...props}
    />,
  );
  return { onSaved };
}

describe("ConstituencyForm", () => {
  beforeEach(() => {
    vi.mocked(updateProfile).mockReset();
    vi.mocked(updateProfile).mockResolvedValue({
      user: null as never,
      reviewRequired: false,
    });
  });

  it("saves the chosen constituency", async () => {
    const { onSaved } = renderForm({ initialOnsId: "E14001063" });

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        constituencyOnsId: "E14001063",
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("refuses to save without a constituency, in the legacy wording", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText(/you must tell us your constituency/i),
    ).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("asks for an email only when we do not have one", async () => {
    renderForm({ needsEmail: true, initialOnsId: "E14001063" });

    const email = screen.getByLabelText(/email address/i);
    await userEvent.type(email, "voter@example.com");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        constituencyOnsId: "E14001063",
        email: "voter@example.com",
      }),
    );
  });

  it("does not ask for an email when we already have one", () => {
    renderForm({ needsEmail: false });

    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });

  it("does not ask for parties when the account already has them", () => {
    renderForm({ needsParties: false });

    expect(screen.queryByLabelText(/preferred party/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/willing to vote for/i),
    ).not.toBeInTheDocument();
  });

  it("asks for parties when the account has none, and saves them", async () => {
    const { onSaved } = renderForm({
      needsParties: true,
      initialOnsId: "E14001063",
    });

    await userEvent.selectOptions(
      screen.getByLabelText(/preferred party/i),
      "1",
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/willing to vote for/i),
      "2",
    );
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        constituencyOnsId: "E14001063",
        preferredPartyId: "1",
        willingPartyId: "2",
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("refuses to save without picking parties, in the server's wording", async () => {
    renderForm({ needsParties: true, initialOnsId: "E14001063" });

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText(
        "You must state which party you would prefer to vote for.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "You must state which party you are willing to vote for.",
      ),
    ).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("reports what the server refused", async () => {
    vi.mocked(updateProfile).mockRejectedValue(
      new ApiError(422, {
        error: {
          code: "validation_failed",
          messages: ["Email is invalid"],
          fields: {},
        },
      }),
    );
    renderForm({ initialOnsId: "E14001063" });

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Email is invalid")).toBeInTheDocument();
  });
});
