import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Ping } from "@/pages/Ping";

describe("Ping", () => {
  it("renders the toolchain-spike heading and a primary button", () => {
    render(<Ping />);
    expect(
      screen.getByRole("heading", { name: /vite \+ react is live/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /a primary button/i }),
    ).toBeInTheDocument();
  });
});
