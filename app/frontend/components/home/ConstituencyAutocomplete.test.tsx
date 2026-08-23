import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConstituencyAutocomplete } from "@/components/home/ConstituencyAutocomplete";
import type { Constituency } from "@/types/api";

const constituencyFixtures: Constituency[] = [
  { onsId: "E14001009", name: "Wakefield" },
  { onsId: "E14000996", name: "Tiverton and Honiton" },
];

function renderAutocomplete(value = "") {
  const onChange = vi.fn();
  render(
    <ConstituencyAutocomplete
      constituencies={constituencyFixtures}
      value={value}
      onChange={onChange}
    />,
  );
  return { onChange, input: screen.getByLabelText(/my constituency is/i) };
}

describe("ConstituencyAutocomplete", () => {
  it("offers every constituency as a suggestion", () => {
    renderAutocomplete();

    const options = Array.from(document.querySelectorAll("datalist option"));
    expect(options.map((option) => option.getAttribute("value"))).toEqual([
      "Wakefield",
      "Tiverton and Honiton",
    ]);
  });

  it("reports the ONS code once a full name is typed", async () => {
    const { input, onChange } = renderAutocomplete();

    await userEvent.type(input, "Wakefield");

    expect(onChange).toHaveBeenLastCalledWith("E14001009");
  });

  it("matches a name regardless of case or surrounding space", async () => {
    const { input, onChange } = renderAutocomplete();

    await userEvent.type(input, "  wakefield  ");

    expect(onChange).toHaveBeenLastCalledWith("E14001009");
  });

  it("reports no selection while the name is still partial", async () => {
    const { input, onChange } = renderAutocomplete();

    await userEvent.type(input, "Wakef");

    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("shows the name of an already-selected constituency", () => {
    const { input } = renderAutocomplete("E14000996");

    expect(input).toHaveValue("Tiverton and Honiton");
  });

  it("picks up a selection made elsewhere, such as by the postcode lookup", async () => {
    function Harness() {
      const [onsId, setOnsId] = useState("");
      return (
        <>
          <ConstituencyAutocomplete
            constituencies={constituencyFixtures}
            value={onsId}
            onChange={setOnsId}
          />
          <button type="button" onClick={() => setOnsId("E14001009")}>
            Found by postcode
          </button>
        </>
      );
    }
    render(<Harness />);
    const input = screen.getByLabelText(/my constituency is/i);
    expect(input).toHaveValue("");

    await userEvent.click(
      screen.getByRole("button", { name: "Found by postcode" }),
    );

    expect(input).toHaveValue("Wakefield");
  });

  describe("text that matches no constituency", () => {
    it("is wiped when the field is left, as the legacy combobox did", async () => {
      const { input, onChange } = renderAutocomplete();

      await userEvent.type(input, "Wakef");
      expect(input).toHaveValue("Wakef");

      await userEvent.tab();

      // A half-typed name must never sit in the box looking like a choice.
      expect(input).toHaveValue("");
      expect(onChange).toHaveBeenLastCalledWith("");
    });

    it("leaves a complete name alone", async () => {
      const { input, onChange } = renderAutocomplete();

      await userEvent.type(input, "Wakefield");
      await userEvent.tab();

      expect(input).toHaveValue("Wakefield");
      expect(onChange).toHaveBeenLastCalledWith("E14001009");
    });

    it("leaves an empty field alone", async () => {
      const { input, onChange } = renderAutocomplete();

      await userEvent.click(input);
      await userEvent.tab();

      expect(input).toHaveValue("");
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it("can be disabled", () => {
    render(
      <ConstituencyAutocomplete
        constituencies={constituencyFixtures}
        value=""
        onChange={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByLabelText(/my constituency is/i)).toBeDisabled();
  });
});
