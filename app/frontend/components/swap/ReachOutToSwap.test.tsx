import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ReachOutToSwap } from "@/components/swap/ReachOutToSwap";
import { spaPaths } from "@/lib/spaPaths";
import type { SwapPartnerDetail } from "@/types/api";

function partner(contact: SwapPartnerDetail["contact"]): SwapPartnerDetail {
  return {
    name: "Grace Hopper",
    imageUrl: "https://example.com/grace.png",
    constituencyName: "Wakefield",
    constituencyOnsId: "E14001009",
    badges: { mobileVerified: true, provider: null, hasEmail: true },
    preferredParty: null,
    willingParty: null,
    polls: [],
    recommendations: [],
    contact,
  };
}

function renderPartner(contact: SwapPartnerDetail["contact"]) {
  return render(
    <MemoryRouter>
      <ReachOutToSwap partner={partner(contact)} />
    </MemoryRouter>,
  );
}

describe("ReachOutToSwap", () => {
  it("offers an email address when one has been shared", () => {
    renderPartner({
      email: "grace@example.com",
      profileUrl: null,
      provider: null,
      facebookLogin: false,
    });

    expect(
      screen.getByRole("link", { name: "by email at grace@example.com" }),
    ).toHaveAttribute("href", "mailto:grace%40example.com");
  });

  it("offers a Twitter profile when there is one", () => {
    renderPartner({
      email: null,
      profileUrl: "https://twitter.com/gracehopper",
      provider: "twitter",
      facebookLogin: false,
    });

    expect(screen.getByRole("link", { name: "on Twitter" })).toHaveAttribute(
      "href",
      "https://twitter.com/gracehopper",
    );
  });

  it("warns that Facebook links may not work", () => {
    renderPartner({
      email: null,
      profileUrl: "https://facebook.com/gracehopper",
      provider: "facebook",
      facebookLogin: true,
    });

    expect(
      screen.getByRole("link", { name: "on Facebook" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "unfortunately this may not work" }),
    ).toHaveAttribute("href", `${spaPaths.faq}#facebook-profile`);
    expect(
      screen.getByRole("link", { name: "cancel your swap" }),
    ).toHaveAttribute("href", `${spaPaths.faq}#reset`);
  });

  it("offers no escape hatch when there is more than one way to make contact", () => {
    renderPartner({
      email: "grace@example.com",
      profileUrl: "https://twitter.com/gracehopper",
      provider: "twitter",
      facebookLogin: false,
    });

    expect(
      screen.getByRole("link", { name: "on Twitter" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "by email at grace@example.com" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "cancel your swap" }),
    ).not.toBeInTheDocument();
  });

  it("says so when nothing has been shared, and offers a way out", () => {
    renderPartner(null);

    expect(
      screen.getByText(
        /Grace Hopper has not shared their email address or social media profile/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "cancel your swap" }),
    ).toHaveAttribute("href", `${spaPaths.faq}#reset`);
  });
});
