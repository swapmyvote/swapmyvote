import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PollChart } from "@/components/polls/PollChart";
import type { ConstituencyPoll } from "@/types/api";

// jsdom has no canvas, so the chart itself is stubbed: what matters here is
// that the right data reaches it and the figure is labelled. The config is
// covered by pollChartConfig.test.ts.
vi.mock("react-chartjs-2", () => ({
  Chart: ({ "aria-label": ariaLabel }: { "aria-label"?: string }) => (
    <div data-testid="chart" role="img" aria-label={ariaLabel} />
  ),
}));

const polls: ConstituencyPoll[] = [
  {
    partyId: 1,
    partyName: "Labour",
    partyShortName: "Lab",
    color: "#DC241f",
    votes: 4210,
    marginalScore: 3010,
    signedMarginalScore: 3010,
  },
];

describe("PollChart", () => {
  it("names the constituency it is charting", () => {
    render(<PollChart polls={polls} constituencyName="Woking" />);

    expect(screen.getByTestId("chart")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Woking"),
    );
  });

  it("lists the numbers in a table for anyone the canvas fails", () => {
    render(<PollChart polls={polls} constituencyName="Woking" />);

    expect(screen.getByRole("row", { name: /labour/i })).toHaveTextContent(
      "42%",
    );
  });
});
