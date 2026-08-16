import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAppMode } from "@/contexts/useAppMode";
import {
  sessionPayload,
  sessionValue,
  TestSessionProvider,
} from "@/test/sessionFixtures";

function Probe() {
  const mode = useAppMode();
  return (
    <ul>
      <li data-testid="appMode">{mode.appMode ?? "unknown"}</li>
      <li data-testid="loginsOpen">{String(mode.loginsOpen)}</li>
      <li data-testid="swappingOpen">{String(mode.swappingOpen)}</li>
      <li data-testid="votingOpen">{String(mode.votingOpen)}</li>
      <li data-testid="votingInfoLocked">{String(mode.votingInfoLocked)}</li>
      <li data-testid="isLoaded">{String(mode.isLoaded)}</li>
    </ul>
  );
}

function renderWithSession(session: ReturnType<typeof sessionPayload> | null) {
  return render(
    <TestSessionProvider value={sessionValue({ session })}>
      <Probe />
    </TestSessionProvider>,
  );
}

function flag(name: string) {
  return screen.getByTestId(name).textContent;
}

describe("AppModeProvider", () => {
  it("projects the session flags onto the phase booleans", () => {
    renderWithSession(
      sessionPayload({
        appMode: "open-and-voting",
        flags: {
          loginsOpen: true,
          swappingOpen: true,
          votingOpen: true,
          votingInfoLocked: true,
        },
      }),
    );

    expect(flag("appMode")).toBe("open-and-voting");
    expect(flag("loginsOpen")).toBe("true");
    expect(flag("swappingOpen")).toBe("true");
    expect(flag("votingOpen")).toBe("true");
    expect(flag("votingInfoLocked")).toBe("true");
    expect(flag("isLoaded")).toBe("true");
  });

  it("reports closed-warm-up as logins and swapping closed", () => {
    renderWithSession(
      sessionPayload({
        appMode: "closed-warm-up",
        flags: {
          loginsOpen: false,
          swappingOpen: false,
          votingOpen: false,
          votingInfoLocked: false,
        },
      }),
    );

    expect(flag("loginsOpen")).toBe("false");
    expect(flag("swappingOpen")).toBe("false");
  });

  it("defaults everything closed until the session has loaded", () => {
    renderWithSession(null);

    expect(flag("appMode")).toBe("unknown");
    expect(flag("loginsOpen")).toBe("false");
    expect(flag("swappingOpen")).toBe("false");
    expect(flag("isLoaded")).toBe("false");
  });
});
