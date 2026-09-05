import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActionRow } from "@/components/forms/ActionRow";

describe("ActionRow", () => {
  it("right-aligns its actions", () => {
    const { container } = render(
      <ActionRow>
        <button type="button">Only</button>
      </ActionRow>,
    );

    expect(container.firstElementChild).toHaveClass(
      "d-flex",
      "justify-content-end",
    );
  });

  // Keyboard and screen-reader users meet the buttons in DOM order, so the
  // row must not reverse them visually — no flex-row-reverse, no order-*.
  it("leaves DOM order as the visual order", () => {
    render(
      <ActionRow>
        <button type="button">Change</button>
        <button type="button">Proceed</button>
      </ActionRow>,
    );

    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels).toEqual(["Change", "Proceed"]);
  });
});
