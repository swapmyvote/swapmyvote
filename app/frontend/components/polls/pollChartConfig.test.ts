import { describe, expect, it } from "vitest";
import { buildPollChartConfig } from "@/components/polls/pollChartConfig";
import type { ConstituencyPoll } from "@/types/api";

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
  {
    partyId: 2,
    partyName: "Green",
    partyShortName: "Grn",
    color: null,
    votes: 1200,
    marginalScore: 3010,
    signedMarginalScore: -3010,
  },
];

describe("buildPollChartConfig", () => {
  it("labels bars with the party short name", () => {
    const { data } = buildPollChartConfig(polls);

    expect(data.labels).toEqual(["Lab", "Grn"]);
  });

  it("plots percentages, not the stored hundredths", () => {
    const { data } = buildPollChartConfig(polls);

    expect(data.datasets[0].data).toEqual([42.1, 12]);
  });

  it("colours each bar with its party colour", () => {
    const { data } = buildPollChartConfig(polls);

    expect(data.datasets[0].backgroundColor).toEqual(["#DC241f", "#6c757d"]);
  });

  it("hides the legend and the y axis, as the legacy chart did", () => {
    const { options } = buildPollChartConfig(polls);

    expect(options.plugins?.legend?.display).toBe(false);
    expect(options.scales?.y?.display).toBe(false);
  });

  it("survives a constituency with no polls", () => {
    const { data } = buildPollChartConfig([]);

    expect(data.labels).toEqual([]);
    expect(data.datasets[0].data).toEqual([]);
  });
});
