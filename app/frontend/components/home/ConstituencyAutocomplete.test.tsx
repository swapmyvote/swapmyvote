import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConstituencyAutocomplete } from "@/components/home/ConstituencyAutocomplete";
import type { Constituency } from "@/types/api";

const CONSTITUENCIES: Constituency[] = [
  { onsId: "E14001009", name: "Wakefield" },
  { onsId: "E14000996", name: "Tiverton and Honiton" },
];

function renderAutocomplete(value = "") {
  const onChange = vi.fn();
  render(
    <ConstituencyAutocomplete
      constituencies={CONSTITUENCIES}
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
            constituencies={CONSTITUENCIES}
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

  it("can be disabled", () => {
    render(
      <ConstituencyAutocomplete
        constituencies={CONSTITUENCIES}
        value=""
        onChange={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByLabelText(/my constituency is/i)).toBeDisabled();
  });
});
