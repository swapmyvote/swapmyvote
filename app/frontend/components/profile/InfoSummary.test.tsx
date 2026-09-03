import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { InfoSummary } from "@/components/profile/InfoSummary";
import {
  sessionPayload,
  sessionValue,
  TestSessionProvider,
  testUser,
} from "@/test/sessionFixtures";

function renderSummary(value = sessionValue()) {
  return render(
    <MemoryRouter>
      <TestSessionProvider value={value}>
        <InfoSummary />
      </TestSessionProvider>
    </MemoryRouter>,
  );
}

describe("InfoSummary", () => {
  it("summarises the offered vote", () => {
    renderSummary(
      sessionValue({ session: sessionPayload({ currentUser: testUser }) }),
    );

    expect(screen.getByText(/Your preferred party is/)).toHaveTextContent(
      "Your preferred party is Green but you are willing to vote for Labour. You are in Woking.",
    );
  });

  it("offers a way to fix it", () => {
    renderSummary(
      sessionValue({ session: sessionPayload({ currentUser: testUser }) }),
    );

    expect(
      screen.getByRole("link", { name: "Not right? Update your info" }),
    ).toHaveAttribute("href", "/app/profile");
  });

  it("hides the edit link once voting information is locked", () => {
    renderSummary(
      sessionValue({
        session: sessionPayload({
          currentUser: testUser,
          flags: { votingInfoLocked: true },
        }),
      }),
    );

    expect(
      screen.queryByRole("link", { name: "Not right? Update your info" }),
    ).not.toBeInTheDocument();
  });

  it("falls back to a question mark for anything not set", () => {
    renderSummary(
      sessionValue({
        session: sessionPayload({
          currentUser: {
            ...testUser,
            willingParty: null,
            constituencyName: null,
          },
        }),
      }),
    );

    expect(screen.getByText(/Your preferred party is/)).toHaveTextContent(
      "Your preferred party is Green but you are willing to vote for ?. You are in ?.",
    );
  });

  it("renders nothing when logged out", () => {
    const { container } = renderSummary();

    expect(container).toBeEmptyDOMElement();
  });
});
