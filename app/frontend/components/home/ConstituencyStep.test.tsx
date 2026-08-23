import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConstituencyStep } from "@/components/home/ConstituencyStep";
import { lookupPostcode } from "@/lib/postcodes";
import type { Constituency } from "@/types/api";

vi.mock("@/lib/postcodes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/postcodes")>();
  return { ...actual, lookupPostcode: vi.fn() };
});

const constituencyFixtures: Constituency[] = [
  { onsId: "E14001009", name: "Wakefield" },
  { onsId: "E14000996", name: "Tiverton and Honiton" },
];

function renderStep(initialOnsId?: string) {
  const onComplete = vi.fn();
  render(
    <ConstituencyStep
      constituencies={constituencyFixtures}
      initialOnsId={initialOnsId}
      onComplete={onComplete}
    />,
  );
  return {
    onComplete,
    constituency: screen.getByRole("combobox"),
    postcode: screen.getByLabelText(/find my constituency using my postcode/i),
    next: screen.getByRole("button", { name: /next: choose parties/i }),
  };
}

describe("ConstituencyStep", () => {
  beforeEach(() => {
    vi.mocked(lookupPostcode).mockResolvedValue({
      onsId: "E14001009",
      name: "Wakefield",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes on the chosen constituency", async () => {
    const { constituency, next, onComplete } = renderStep();

    await userEvent.type(constituency, "Wakefield");
    await userEvent.click(next);

    expect(onComplete).toHaveBeenCalledWith("E14001009");
  });

  it("refuses to move on without one", async () => {
    const { next, onComplete } = renderStep();

    await userEvent.click(next);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please choose your constituency",
    );
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("starts from an answer given earlier", () => {
    const { constituency } = renderStep("E14000996");

    expect(constituency).toHaveValue("Tiverton and Honiton");
  });

  describe("the two ways of answering are mutually exclusive", () => {
    it("empties the postcode when a constituency is picked by name", async () => {
      const { constituency, postcode } = renderStep();

      await userEvent.type(postcode, "WF1 1AA");
      expect(postcode).toHaveValue("WF1 1AA");

      await userEvent.type(constituency, "Tiverton");
      await userEvent.click(
        screen.getByRole("option", { name: "Tiverton and Honiton" }),
      );

      // The legacy widget did `$("#txt-postcode").val("")` on select, so a
      // stale postcode can't imply the constituency came from it.
      expect(postcode).toHaveValue("");
    });

    it("empties the postcode when a name is typed exactly and the field left", async () => {
      const { constituency, postcode } = renderStep();

      await userEvent.type(postcode, "WF1 1AA");
      await userEvent.type(constituency, "Tiverton and Honiton");
      await userEvent.tab();

      expect(postcode).toHaveValue("");
    });

    it("fills in the constituency when a postcode resolves", async () => {
      const { constituency, postcode } = renderStep();

      await userEvent.type(postcode, "WF1 1AA");
      await userEvent.click(screen.getByRole("button", { name: "Search" }));

      await waitFor(() => {
        expect(constituency).toHaveValue("Wakefield");
      });
    });

    it("can move on with a constituency found from a postcode", async () => {
      const { postcode, next, onComplete } = renderStep();

      await userEvent.type(postcode, "WF1 1AA");
      await userEvent.click(screen.getByRole("button", { name: "Search" }));
      await waitFor(() => {
        expect(screen.getByRole("combobox")).toHaveValue("Wakefield");
      });
      await userEvent.click(next);

      expect(onComplete).toHaveBeenCalledWith("E14001009");
    });
  });
});
