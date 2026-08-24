import { render, screen } from "@testing-library/react";
import type { ChartData, ChartOptions } from "chart.js";
import { describe, expect, it, vi } from "vitest";
import { PollChart } from "@/components/polls/PollChart";
import type { ConstituencyPoll } from "@/types/api";

// jsdom has no canvas, so the chart itself is stubbed: what matters here is
// that the right data reaches it and the figure is labelled. The config
// builder's own output is covered by pollChartConfig.test.ts — here we only
// need to prove PollChart actually passes that output through to <Chart>.
vi.mock("react-chartjs-2", () => ({
  Chart: ({
    "aria-label": ariaLabel,
    data,
    options,
  }: {
    "aria-label"?: string;
    data?: ChartData<"bar">;
    options?: ChartOptions<"bar">;
  }) => (
    <div
      data-testid="chart"
      role="img"
      aria-label={ariaLabel}
      data-labels={JSON.stringify(data?.labels)}
      data-values={JSON.stringify(data?.datasets?.[0]?.data)}
      data-legend-display={String(options?.plugins?.legend?.display)}
    />
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

  it("wires the poll data into the chart, not just the label", () => {
    render(<PollChart polls={polls} constituencyName="Woking" />);

    const chart = screen.getByTestId("chart");
    expect(chart).toHaveAttribute("data-labels", JSON.stringify(["Lab"]));
    expect(chart).toHaveAttribute("data-values", JSON.stringify([42.1]));
    expect(chart).toHaveAttribute("data-legend-display", "false");
  });

  it("lists the numbers in a table for anyone the canvas fails", () => {
    render(<PollChart polls={polls} constituencyName="Woking" />);

    expect(screen.getByRole("row", { name: /labour/i })).toHaveTextContent(
      "42%",
    );
  });

  it("falls back to the party's short name in the table when the full name is missing", () => {
    const pollsWithoutName: ConstituencyPoll[] = [
      { ...polls[0], partyName: null },
    ];
    render(<PollChart polls={pollsWithoutName} constituencyName="Woking" />);

    expect(screen.getByRole("row", { name: /lab/i })).toHaveTextContent("42%");
  });
});
