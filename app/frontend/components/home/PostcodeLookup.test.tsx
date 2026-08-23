import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostcodeLookup } from "@/components/home/PostcodeLookup";
import { lookupPostcode, PostcodeLookupError } from "@/lib/postcodes";
import type { Constituency } from "@/types/api";

vi.mock("@/lib/postcodes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/postcodes")>();
  return { ...actual, lookupPostcode: vi.fn() };
});

const CONSTITUENCIES: Constituency[] = [
  { onsId: "E14001009", name: "Wakefield" },
  { onsId: "E14000996", name: "Tiverton and Honiton" },
];

function renderLookup() {
  const onConstituencyFound = vi.fn();
  render(
    <PostcodeLookup
      constituencies={CONSTITUENCIES}
      onConstituencyFound={onConstituencyFound}
    />,
  );
  return {
    onConstituencyFound,
    input: screen.getByLabelText(/find my constituency using my postcode/i),
    search: screen.getByRole("button", { name: "Search" }),
  };
}

describe("PostcodeLookup", () => {
  beforeEach(() => {
    vi.mocked(lookupPostcode).mockResolvedValue({
      onsId: "E14001009",
      name: "Wakefield",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reports the constituency a postcode resolves to", async () => {
    const { input, search, onConstituencyFound } = renderLookup();

    await userEvent.type(input, "WF1 1AA");
    await userEvent.click(search);

    expect(lookupPostcode).toHaveBeenCalledWith("WF1 1AA");
    await waitFor(() => {
      expect(onConstituencyFound).toHaveBeenCalledWith("E14001009");
    });
  });

  it("searches on Enter without submitting the surrounding form", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const onConstituencyFound = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <PostcodeLookup
          constituencies={CONSTITUENCIES}
          onConstituencyFound={onConstituencyFound}
        />
      </form>,
    );

    await userEvent.type(
      screen.getByLabelText(/find my constituency/i),
      "WF1 1AA{Enter}",
    );

    await waitFor(() => {
      expect(onConstituencyFound).toHaveBeenCalledWith("E14001009");
    });
    // The user has not filled in the rest of the entry form yet.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  describe("when the postcode is outside the constituencies we cover", () => {
    beforeEach(() => {
      vi.mocked(lookupPostcode).mockResolvedValue({
        onsId: "E14000123",
        name: "Somewhere Else",
      });
    });

    it("says so", async () => {
      const { input, search } = renderLookup();

      await userEvent.type(input, "SW1A 1AA");
      await userEvent.click(search);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Postcode is not in one of the accepted constituencies",
      );
    });

    it("clears the selection rather than leaving a stale one", async () => {
      const { input, search, onConstituencyFound } = renderLookup();

      await userEvent.type(input, "SW1A 1AA");
      await userEvent.click(search);

      await waitFor(() => {
        expect(onConstituencyFound).toHaveBeenCalledWith("");
      });
    });
  });

  it("shows the service's own message when it rejects the postcode", async () => {
    vi.mocked(lookupPostcode).mockRejectedValue(
      new PostcodeLookupError("Postcode not found"),
    );
    const { input, search } = renderLookup();

    await userEvent.type(input, "ZZ1 1ZZ");
    await userEvent.click(search);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Postcode not found",
    );
  });

  it("does not leak an unexpected failure to the user", async () => {
    vi.mocked(lookupPostcode).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    const { input, search } = renderLookup();

    await userEvent.type(input, "WF1 1AA");
    await userEvent.click(search);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Postcode lookup failed - please try again.",
    );
    expect(alert).not.toHaveTextContent("Failed to fetch");
  });

  it("clears a previous error once a later search succeeds", async () => {
    vi.mocked(lookupPostcode).mockRejectedValueOnce(
      new PostcodeLookupError("Postcode not found"),
    );
    const { input, search } = renderLookup();

    await userEvent.type(input, "ZZ1 1ZZ");
    await userEvent.click(search);
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, "WF1 1AA");
    await userEvent.click(search);

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  it("tells the user their postcode is not retained", () => {
    renderLookup();

    expect(screen.getByText(/we do not retain this info/i)).toBeVisible();
  });
});
