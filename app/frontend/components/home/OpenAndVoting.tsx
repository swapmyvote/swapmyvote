import { EntryForm } from "@/components/home/EntryForm";
import { GoVote } from "@/components/home/GoVote";
import { HowItWorks } from "@/components/home/OpenPreElections";
import { NewsSignUp } from "@/components/home/NewsSignUp";
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
      <div className="background-pattern border-bottom">
        <div className="container text-center">
          <h1>{title}</h1>
          <h2>
            You still have a bit of time to find a voting partner to swap with,
            if you haven't already!
          </h2>
          <h2 className="subdued">
            Swap My Vote can help if voting for your preferred party doesn't
            make sense in <strong>your</strong> constituency.
          </h2>
        </div>
      </div>

      <EntryForm
        constituencies={constituencies}
        parties={parties}
        constituencyOther={election.constituencyOther}
      />

      <HowItWorks hidePolls={election.hidePolls} />

      <div className="background-pattern border-bottom">
        <div className="container text-center">
          <h2>Ready to vote?</h2>
          <GoVote swapConfirmed={swapConfirmed} />
        </div>
      </div>

      <NewsSignUp />
    </>
  );
}

// Rails' String#titleize, for the one heading that uses it.
function titleCase(text: string) {
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
