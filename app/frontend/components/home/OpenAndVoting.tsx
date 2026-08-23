import { EntryForm } from "@/components/home/EntryForm";
import { GoVote } from "@/components/home/GoVote";
import { HowItWorks } from "@/components/home/OpenPreElections";
import { NewsSignUp } from "@/components/home/NewsSignUp";
import { Section } from "@/components/home/Section";
import type { Constituency, Election, Party } from "@/types/api";

interface OpenAndVotingProps {
  election: Election;
  constituencies: Constituency[];
  parties: Party[];
  swapConfirmed: boolean;
}

// Ports app/views/home/_open_and_voting.html.haml.
export function OpenAndVoting({
  election,
  constituencies,
  parties,
  swapConfirmed,
}: OpenAndVotingProps) {
  const title = election.generalElection
    ? `The ${titleCase(election.dateSeasonType)} is here!`
    : `The ${election.dateSeasonType} are here!`;

  return (
    <>
      <Section centered>
        <h1>{title}</h1>
        {/* Both of these were h2s, so all three lines shouted in uppercase.
            They are body copy under the title, not section headings. */}
        <p className="lead mb-2">
          You still have a bit of time to find a voting partner to swap with, if
          you haven't already!
        </p>
        <p className="lead text-body-secondary mb-0">
          Swap My Vote can help if voting for your preferred party doesn't make
          sense in <strong>your</strong> constituency
        </p>
      </Section>

      <EntryForm
        constituencies={constituencies}
        parties={parties}
        constituencyOther={election.constituencyOther}
      />

      <HowItWorks hidePolls={election.hidePolls} />

      <Section centered>
        <h2>Ready to vote?</h2>
        <GoVote swapConfirmed={swapConfirmed} />
      </Section>

      <NewsSignUp />
    </>
  );
}

// Rails' String#titleize, for the one heading that uses it.
function titleCase(text: string) {
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
