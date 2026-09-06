import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SwapConfirmed } from "@/components/swap/SwapConfirmed";
import { testUser } from "@/test/sessionFixtures";
import type { SwapDetail } from "@/types/api";

vi.mock("@/components/swap/SwapProfileCard", () => ({
  SwapProfileCard: () => <div data-testid="profile-card" />,
}));
vi.mock("@/components/swap/ReachOutToSwap", () => ({
  ReachOutToSwap: () => <div data-testid="reach-out" />,
}));
vi.mock("@/components/swap/ShareEmailConsentForm", () => ({
  ShareEmailConsentForm: ({ submitLabel }: { submitLabel: string }) => (
    <div data-testid="consent-form">{submitLabel}</div>
  ),
}));

function swap(overrides: Partial<SwapDetail> = {}): SwapDetail {
  return {
    id: 7,
    state: "incoming",
    confirmed: true,
    consentGiven: false,
    validityHours: 48,
    partner: {
      name: "Grace Hopper",
      imageUrl: "https://example.com/grace.png",
      constituencyName: "Wakefield",
      constituencyOnsId: "E14001009",
      badges: { mobileVerified: true, provider: null, hasEmail: true },
      preferredParty: {
        id: 2,
        name: "Labour",
        color: "#DC241f",
        smvCode: "lab",
      },
      willingParty: { id: 1, name: "Green", color: "#6AB023", smvCode: "grn" },
      polls: [],
      recommendations: [],
      contact: null,
    },
    ...overrides,
  };
}

describe("SwapConfirmed", () => {
  it("celebrates with the partner's real name", () => {
    render(<SwapConfirmed swap={swap()} user={testUser} />);

    expect(
      screen.getByText("You've swapped your vote with Grace Hopper!"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("profile-card")).toBeInTheDocument();
  });

  it("spells out who votes for what, where", () => {
    render(<SwapConfirmed swap={swap()} user={testUser} />);

    expect(screen.getByText(/will vote/)).toHaveTextContent(
      "Grace Hopper will vote Green in Wakefield for you, and you will vote Labour in Woking for Grace Hopper.",
    );
  });

  it("nags for email consent until it is given", () => {
    render(<SwapConfirmed swap={swap()} user={testUser} />);

    expect(screen.getByTestId("consent-form")).toHaveTextContent(
      "Share with Grace Hopper",
    );
  });

  it("acknowledges consent once given", () => {
    render(
      <SwapConfirmed swap={swap({ consentGiven: true })} user={testUser} />,
    );

    expect(screen.queryByTestId("consent-form")).not.toBeInTheDocument();
    expect(
      screen.getByText("You have shared your email address with Grace Hopper."),
    ).toBeInTheDocument();
  });

  it("shows how to get in touch", () => {
    render(<SwapConfirmed swap={swap()} user={testUser} />);

    expect(screen.getByTestId("reach-out")).toBeInTheDocument();
  });
});
