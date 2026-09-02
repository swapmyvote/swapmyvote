import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VerificationCodeField } from "@/components/mobile/VerificationCodeField";

describe("VerificationCodeField", () => {
  it("labels the input and constrains it to six digits", () => {
    render(<VerificationCodeField value="" onChange={vi.fn()} />);

    const input = screen.getByLabelText("The 6 digit code");
    expect(input).toHaveAttribute("maxLength", "6");
    expect(input).toHaveAttribute("pattern", "[0-9]{6}");
    expect(input).toHaveAttribute("inputMode", "numeric");
  });

  it("reports what was typed", async () => {
    const onChange = vi.fn();
    render(<VerificationCodeField value="" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("The 6 digit code"), "1");

    expect(onChange).toHaveBeenCalledWith("1");
  });
});
