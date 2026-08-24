import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { buildPollChartConfig } from "@/components/polls/pollChartConfig";
import type { ConstituencyPoll } from "@/types/api";
import styles from "./PollChart.module.scss";

// Registered here rather than globally: a chart pays only for the pieces it
// draws with, so a later chart can pull in an annotation plugin or a time
// scale without this one loading them.
ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
);

interface PollChartProps {
  polls: ConstituencyPoll[];
  constituencyName: string;
}

/**
 * Predicted vote share by party, replacing the Google Charts column chart in
 * app/assets/javascripts/polls.coffee — and with it the third-party script the
 * legacy page loads.
 *
 * A <canvas> is invisible to a screen reader, so the same numbers follow it as
 * a visually hidden table. That is the accessible copy; the chart is labelled
 * and otherwise left out of the accessibility tree.
 */
export function PollChart({ polls, constituencyName }: PollChartProps) {
  const { data, options } = buildPollChartConfig(polls);

  return (
    <figure className="mb-0">
      <div className={styles.chart}>
        <Chart
          type="bar"
          data={data}
          options={options}
          aria-label={`Predicted vote share by party in ${constituencyName}`}
          role="img"
        />
      </div>

      <table className="visually-hidden">
        <caption>Predicted vote share in {constituencyName}</caption>
        <thead>
          <tr>
            <th scope="col">Party</th>
            <th scope="col">Predicted vote share</th>
          </tr>
        </thead>
        <tbody>
          {polls.map((poll) => (
            <tr key={poll.partyId}>
              <th scope="row">{poll.partyName ?? poll.partyShortName}</th>
              <td>{Math.round(poll.votes / 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
