import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Contact } from "@/components/static/Contact";
import { spaPaths } from "@/lib/spaPaths";

function renderContact() {
  return render(
    <MemoryRouter>
      <Contact />
    </MemoryRouter>,
  );
}

describe("Contact", () => {
  it("renders the Contact details heading", () => {
    renderContact();
    expect(
      screen.getByRole("heading", { name: /contact details/i }),
    ).toBeInTheDocument();
  });

  it("links the FAQ as an in-SPA route", () => {
    renderContact();
    const faqLink = screen.getByRole("link", { name: /faq/i });
    expect(faqLink).toHaveAttribute("href", spaPaths.faq);
  });

  it("offers a mailto link to the team", () => {
    renderContact();
    const mailLink = screen.getByRole("link", {
      name: /hello@swapmyvote\.uk/i,
    });
    expect(mailLink).toHaveAttribute("href", "mailto:hello@swapmyvote.uk");
  });
});
