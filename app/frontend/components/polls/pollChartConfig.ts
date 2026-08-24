import type { ChartData, ChartOptions } from "chart.js";
import type { ConstituencyPoll } from "@/types/api";

// Parties whose colour we do not hold get Bootstrap's secondary grey rather
// than Chart.js's default blue, which reads as a party colour.
const unknownPartyColor = "#6c757d";

/**
 * Turns polls into the bar chart the review screen draws.
 *
 * Kept pure and separate from the canvas component for two reasons: it is the
 * part worth unit testing, and the next chart we add (tacticalvote has richer
 * ones) is a second builder rather than a fork of a component.
 *
 * Ports the options from app/assets/javascripts/polls.coffee: no legend, no
 * y-axis, percentages annotated on the bars, and party colours per bar.
 */
export function buildPollChartConfig(polls: ConstituencyPoll[]): {
  data: ChartData<"bar">;
  options: ChartOptions<"bar">;
} {
  const data: ChartData<"bar"> = {
    labels: polls.map((poll) => poll.partyShortName),
    datasets: [
      {
        // Votes are stored as hundredths of a percent (PollsHelper divides by
        // 100 for the same chart).
        data: polls.map((poll) => poll.votes / 100),
        backgroundColor: polls.map((poll) => poll.color ?? unknownPartyColor),
        borderWidth: 0,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (item) => `${Math.round(Number(item.parsed.y))}%`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      // The bars are annotated with their own values by the tooltip, and the
      // legacy chart showed no vertical scale either.
      y: { display: false, beginAtZero: true },
    },
  };

  return { data, options };
}
