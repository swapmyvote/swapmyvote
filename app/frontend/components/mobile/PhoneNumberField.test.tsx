import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PhoneNumberField } from "@/components/mobile/PhoneNumberField";

describe("PhoneNumberField", () => {
  it("labels the number input", () => {
    render(<PhoneNumberField value="" onChange={vi.fn()} problem={null} />);

    expect(screen.getByLabelText("My mobile number is")).toBeInTheDocument();
  });

  it("gives the country selector an accessible name", () => {
    render(<PhoneNumberField value="" onChange={vi.fn()} problem={null} />);

    expect(
      screen.getByRole("combobox", { name: "Country" }),
    ).toBeInTheDocument();
  });

  it("reports what the caller typed", async () => {
    const onChange = vi.fn();
    render(<PhoneNumberField value="" onChange={onChange} problem={null} />);

    await userEvent.type(
      screen.getByLabelText("My mobile number is"),
      "+447400123456",
    );

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)?.[0]).toContain("447400123456");
  });

  it("shows the problem and marks the field invalid", () => {
    render(
      <PhoneNumberField
        value="+442079460000"
        onChange={vi.fn()}
        problem="This doesn't look like a mobile phone number"
      />,
    );

    const input = screen.getByLabelText("My mobile number is");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText("This doesn't look like a mobile phone number"),
    ).toBeInTheDocument();
  });

  it("says nothing when there is no problem", () => {
    render(
      <PhoneNumberField
        value="+447400123456"
        onChange={vi.fn()}
        problem={null}
      />,
    );

    expect(screen.getByLabelText("My mobile number is")).not.toHaveAttribute(
      "aria-invalid",
    );
  });
});
