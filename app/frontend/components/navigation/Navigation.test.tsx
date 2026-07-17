import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Navigation } from "@/components/navigation/Navigation";

describe("Navigation", () => {
  it("renders the brand as a full-page link to the (legacy) home route", () => {
    render(<Navigation />);
    const brand = screen.getByRole("link", { name: /swapmyvote/i });
    // A real anchor with href="/" (full page load), not a react-router
    // client-side link — "/" is still served by the legacy HAML home.
    expect(brand).toHaveAttribute("href", "/");
  });
});
