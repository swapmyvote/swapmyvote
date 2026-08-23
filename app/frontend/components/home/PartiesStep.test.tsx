import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PartiesStep } from "@/components/home/PartiesStep";
import type { Party } from "@/types/api";

const partyFixtures: Party[] = [
  { id: 1, name: "Green", color: "#6AB023", smvCode: "grn" },
  { id: 2, name: "Labour", color: "#DC241f", smvCode: "lab" },
];

function renderStep() {
  const onComplete = vi.fn();
  render(
    <PartiesStep
      parties={partyFixtures}
      constituencyOther="another constituency"
      onComplete={onComplete}
    />,
  );
  return {
    onComplete,
    preferred: screen.getByLabelText(/most like to vote for/i),
    willing: screen.getByLabelText(/could you vote for in exchange/i),
    next: screen.getByRole("button", { name: /next: sign up/i }),
  };
}

describe("PartiesStep", () => {
  it("passes on both choices", async () => {
    const { preferred, willing, next, onComplete } = renderStep();

    await userEvent.selectOptions(preferred, "1");
    await userEvent.selectOptions(willing, "2");
    await userEvent.click(next);

    expect(onComplete).toHaveBeenCalledWith({
      preferredPartyId: "1",
      willingPartyId: "2",
    });
  });

  it("names the other constituency the way the election does", () => {
    renderStep();

    expect(
      screen.getByText(/vote for your party in another constituency/i),
    ).toBeVisible();
  });

  describe("the validations that were jQuery modals", () => {
    it("requires both parties", async () => {
      const { preferred, next, onComplete } = renderStep();

      await userEvent.selectOptions(preferred, "1");
      await userEvent.click(next);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Please choose both your preferred party and your willing party.",
      );
      expect(onComplete).not.toHaveBeenCalled();
    });

    it("refuses the same party twice", async () => {
      const { preferred, willing, next, onComplete } = renderStep();

      await userEvent.selectOptions(preferred, "1");
      await userEvent.selectOptions(willing, "1");
      await userEvent.click(next);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Your preferred party and your willing party cannot be the same.",
      );
      expect(onComplete).not.toHaveBeenCalled();
    });

    it("ties the message to the fields for screen readers", async () => {
      const { preferred, willing, next } = renderStep();

      await userEvent.click(next);
      const alert = await screen.findByRole("alert");

      // The legacy version raised a modal the user had to dismiss; an inline
      // message has to announce itself instead.
      expect(preferred).toHaveAttribute("aria-describedby", alert.id);
      expect(willing).toHaveAttribute("aria-describedby", alert.id);
    });

    it("clears the message once the answers are fixed", async () => {
      const { preferred, willing, next } = renderStep();

      await userEvent.selectOptions(preferred, "1");
      await userEvent.selectOptions(willing, "1");
      await userEvent.click(next);
      expect(await screen.findByRole("alert")).toBeInTheDocument();

      await userEvent.selectOptions(willing, "2");
      await userEvent.click(next);

      expect(screen.queryByRole("alert")).toBeNull();
    });
  });
});
