import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReachOutToSwap } from "@/components/swap/ReachOutToSwap";
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

describe("ReachOutToSwap", () => {
  it("offers an email address when one has been shared", () => {
    render(
      <ReachOutToSwap
        partner={partner({
          email: "grace@example.com",
          profileUrl: null,
          provider: null,
          facebookLogin: false,
        })}
      />,
    );

    expect(
      screen.getByRole("link", { name: "by email at grace@example.com" }),
    ).toHaveAttribute("href", "mailto:grace%40example.com");
  });

  it("offers a Twitter profile when there is one", () => {
    render(
      <ReachOutToSwap
        partner={partner({
          email: null,
          profileUrl: "https://twitter.com/gracehopper",
          provider: "twitter",
          facebookLogin: false,
        })}
      />,
    );

    expect(screen.getByRole("link", { name: "on Twitter" })).toHaveAttribute(
      "href",
      "https://twitter.com/gracehopper",
    );
  });

  it("warns that Facebook links may not work", () => {
    render(
      <ReachOutToSwap
        partner={partner({
          email: null,
          profileUrl: "https://facebook.com/gracehopper",
          provider: "facebook",
          facebookLogin: true,
        })}
      />,
    );

    expect(
      screen.getByRole("link", { name: "on Facebook" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "unfortunately this may not work" }),
    ).toHaveAttribute("href", "/faq#facebook-profile");
  });

  it("says so when nothing has been shared, and offers a way out", () => {
    render(<ReachOutToSwap partner={partner(null)} />);

    expect(
      screen.getByText(
        /Grace Hopper has not shared their email address or social media profile/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "cancel your swap" }),
    ).toHaveAttribute("href", "/faq#reset");
  });
});
