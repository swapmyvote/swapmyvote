import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormErrors } from "@/components/forms/FormErrors";

describe("FormErrors", () => {
  it("renders nothing when there are no messages", () => {
    const { container } = render(<FormErrors messages={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("announces the messages as an alert", () => {
    render(<FormErrors messages={["Name can't be blank"]} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Name can't be blank");
  });

  it("renders every message, including repeated ones", () => {
    render(<FormErrors messages={["Try again", "Try again", "And again"]} />);

    expect(screen.getAllByText("Try again")).toHaveLength(2);
    expect(screen.getByText("And again")).toBeInTheDocument();
  });
});
