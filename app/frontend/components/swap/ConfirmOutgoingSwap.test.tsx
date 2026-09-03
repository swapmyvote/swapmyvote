import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ConfirmOutgoingSwap } from "@/components/swap/ConfirmOutgoingSwap";
import type { SwapDetail } from "@/types/api";

vi.mock("@/components/swap/SwapProfileCard", () => ({
  SwapProfileCard: () => <div data-testid="profile-card" />,
}));
vi.mock("@/components/share/SocialShare", () => ({
  SocialShare: () => <div data-testid="social-share" />,
}));
vi.mock("@/components/swap/ShareEmailConsentForm", () => ({
  ShareEmailConsentForm: ({ submitLabel }: { submitLabel: string }) => (
    <div data-testid="consent-form">{submitLabel}</div>
  ),
}));

function swap(overrides: Partial<SwapDetail> = {}): SwapDetail {
  return {
    id: 7,
    state: "outgoing",
    confirmed: false,
    consentGiven: false,
    validityHours: 48,
    partner: {
      name: "Grace H",
      imageUrl: "https://example.com/grace.png",
      constituencyName: "Wakefield",
      constituencyOnsId: "E14001009",
      badges: { mobileVerified: true, provider: null, hasEmail: true },
      preferredParty: null,
      willingParty: null,
      polls: [],
      recommendations: [],
      contact: null,
    },
    ...overrides,
  };
}

function renderState(detail: SwapDetail) {
  return render(
    <MemoryRouter>
      <ConfirmOutgoingSwap swap={detail} />
    </MemoryRouter>,
  );
}

describe("ConfirmOutgoingSwap", () => {
  it("says who we are waiting on", () => {
    renderState(swap());

    expect(
      screen.getByText("You've asked to swap your vote with Grace H!"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("profile-card")).toBeInTheDocument();
    expect(
      screen.getByText(/waiting for Grace H to confirm the swap/),
    ).toBeInTheDocument();
  });

  it("says how long the offer lasts", () => {
    renderState(swap({ validityHours: 24 }));

    expect(
      screen.getByText(/don't hear back from them in 24 hours/),
    ).toBeInTheDocument();
  });

  it("nags for email consent until it is given", () => {
    renderState(swap());

    expect(screen.getByTestId("consent-form")).toHaveTextContent(
      "Share with Grace H",
    );
    expect(
      screen.getByText(/We encourage you to share your email address/),
    ).toBeInTheDocument();
  });

  it("acknowledges consent once given, and stops asking", () => {
    renderState(swap({ consentGiven: true }));

    expect(screen.queryByTestId("consent-form")).not.toBeInTheDocument();
    expect(
      screen.getByText(/You have opted to share your email address/),
    ).toBeInTheDocument();
  });

  it("suggests spreading the word while we wait", () => {
    renderState(swap());

    expect(screen.getByTestId("social-share")).toBeInTheDocument();
  });
});
