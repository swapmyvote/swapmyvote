import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConstituencyAutocomplete } from "@/components/home/ConstituencyAutocomplete";
import type { Constituency } from "@/types/api";

const constituencyFixtures: Constituency[] = [
  { onsId: "E14001009", name: "Wakefield" },
  { onsId: "E14001560", name: "Wakefield and Rothwell" },
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
  return { onChange, input: screen.getByRole("combobox") };
}

// Downshift always renders the listbox element (it requires getMenuProps to
// stay mounted), so "closed" means it holds no options, not that it is absent.
function menuOptions() {
  return within(screen.getByRole("listbox"))
    .queryAllByRole("option")
    .map((option) => option.textContent);
}

describe("ConstituencyAutocomplete", () => {
  describe("filtering", () => {
    it("matches a substring anywhere in the name, not just the start", async () => {
      const { input } = renderAutocomplete();

      // The legacy widget's `_source` built a regex from the term and tested
      // it against the whole name, so "field" reaches "Wakefield".
      await userEvent.type(input, "field");

      expect(menuOptions()).toEqual(["Wakefield", "Wakefield and Rothwell"]);
    });

    it("ignores case", async () => {
      const { input } = renderAutocomplete();

      await userEvent.type(input, "tIvErToN");

      expect(menuOptions()).toEqual(["Tiverton and Honiton"]);
    });
  });

  describe("selecting", () => {
    it("reports the ONS code when an option is picked from the menu", async () => {
      const { input, onChange } = renderAutocomplete();

      await userEvent.type(input, "Tiverton");
      await userEvent.click(
        screen.getByRole("option", { name: "Tiverton and Honiton" }),
      );

      expect(onChange).toHaveBeenLastCalledWith("E14000996");
    });

    it("accepts an exactly-typed name without opening the menu", async () => {
      const { input, onChange } = renderAutocomplete();

      // `_removeIfInvalid` treated an exact match as a valid choice even when
      // the user never touched the dropdown.
      await userEvent.type(input, "Wakefield");
      await userEvent.tab();

      expect(onChange).toHaveBeenLastCalledWith("E14001009");
    });

    it("accepts an exact name regardless of case or surrounding space", async () => {
      const { input, onChange } = renderAutocomplete();

      await userEvent.type(input, "  wakefield  ");
      await userEvent.tab();

      expect(onChange).toHaveBeenLastCalledWith("E14001009");
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
            <button type="button" onClick={() => setOnsId("E14001560")}>
              Found by postcode
            </button>
          </>
        );
      }
      render(<Harness />);
      const input = screen.getByRole("combobox");
      expect(input).toHaveValue("");

      await userEvent.click(
        screen.getByRole("button", { name: "Found by postcode" }),
      );

      expect(input).toHaveValue("Wakefield and Rothwell");
    });
  });

  describe("text that matches no constituency", () => {
    it("is wiped when the field is left, as the legacy combobox did", async () => {
      const { input, onChange } = renderAutocomplete();

      await userEvent.type(input, "Wakef");
      expect(input).toHaveValue("Wakef");

      await userEvent.tab();

      // A half-typed name must never sit in the box looking like a choice.
      expect(input).toHaveValue("");
      // Nothing was selected before, so nothing changes for the caller.
      expect(onChange).not.toHaveBeenCalled();
    });

    it("clears a selection the user has typed over", async () => {
      // Stateful, because the component is controlled: what the box shows
      // follows the value its parent holds.
      function Harness() {
        const [onsId, setOnsId] = useState("E14001009");
        return (
          <>
            <ConstituencyAutocomplete
              constituencies={constituencyFixtures}
              value={onsId}
              onChange={setOnsId}
            />
            <output>{onsId || "none"}</output>
          </>
        );
      }
      render(<Harness />);
      const input = screen.getByRole("combobox");
      expect(input).toHaveValue("Wakefield");

      await userEvent.clear(input);
      await userEvent.type(input, "not a constituency");
      await userEvent.tab();

      // This one matters: the caller must not keep acting on a constituency
      // the box no longer shows.
      expect(screen.getByRole("status")).toHaveTextContent("none");
      expect(input).toHaveValue("");
    });

    it("clears a selection the user deletes down to nothing", async () => {
      // Same harness as above, but the field is left empty rather than
      // retyped over: no text ever gets a chance to differ from the
      // constituency's name, which is what exposed a real bug — the sync
      // effect that copies an externally-made selection into the box read a
      // stale, not-yet-updated `value` prop and put the just-cleared name
      // straight back in, even though `onChange("")` had already fired.
      function Harness() {
        const [onsId, setOnsId] = useState("E14001009");
        return (
          <>
            <ConstituencyAutocomplete
              constituencies={constituencyFixtures}
              value={onsId}
              onChange={setOnsId}
            />
            <output>{onsId || "none"}</output>
          </>
        );
      }
      render(<Harness />);
      const input = screen.getByRole("combobox");
      expect(input).toHaveValue("Wakefield");

      await userEvent.clear(input);
      await userEvent.tab();

      expect(screen.getByRole("status")).toHaveTextContent("none");
      expect(input).toHaveValue("");
    });

    it("leaves an empty field alone", async () => {
      const { input, onChange } = renderAutocomplete();

      await userEvent.click(input);
      await userEvent.tab();

      expect(input).toHaveValue("");
      // Nothing was chosen and nothing was there to wipe, so no selection is
      // reported either way.
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("the show-all button", () => {
    it("opens the whole list, as the legacy widget's toggle did", async () => {
      renderAutocomplete();
      expect(menuOptions()).toEqual([]);

      await userEvent.click(
        screen.getByRole("button", { name: /show all constituencies/i }),
      );

      // minLength 0: everything, with nothing typed.
      expect(menuOptions()).toEqual([
        "Wakefield",
        "Wakefield and Rothwell",
        "Tiverton and Honiton",
      ]);
    });

    it("closes the list again", async () => {
      renderAutocomplete();
      const toggle = screen.getByRole("button", {
        name: /show all constituencies/i,
      });

      await userEvent.click(toggle);
      expect(menuOptions()).not.toEqual([]);

      await userEvent.click(toggle);

      expect(menuOptions()).toEqual([]);
    });
  });

  it("lets the keyboard leave the field mid-word", async () => {
    render(
      <>
        <ConstituencyAutocomplete
          constituencies={constituencyFixtures}
          value=""
          onChange={vi.fn()}
        />
        <button type="button">after</button>
      </>,
    );
    const input = screen.getByRole("combobox");

    await userEvent.type(input, "Wakef");
    await userEvent.tab();

    // react-bootstrap-typeahead calls preventDefault on Tab whenever a hint is
    // active, which pins focus in the field (WCAG 2.1.2). Downshift does not,
    // and this test is here so a future swap back cannot reintroduce it.
    expect(document.activeElement).not.toBe(input);
  });

  it("labels the field", () => {
    renderAutocomplete();

    // The listbox is labelled by the same label (standard combobox ARIA), so
    // assert the association on the input specifically.
    expect(screen.getByRole("combobox")).toHaveAccessibleName(
      "My constituency is",
    );
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

    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
