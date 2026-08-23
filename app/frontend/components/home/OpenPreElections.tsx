import { EntryForm } from "@/components/home/EntryForm";
import { NewsSignUp } from "@/components/home/NewsSignUp";
import type { Constituency, Election, Party } from "@/types/api";

interface PhaseProps {
  election: Election;
  constituencies: Constituency[];
  parties: Party[];
}

// Ports app/views/home/_open_pre_elections.html.haml.
export function OpenPreElections({
  election,
  constituencies,
  parties,
}: PhaseProps) {
  return (
    <>
      <div className="background-pattern border-bottom">
        <div className="container text-center">
          <h1>Make your vote count in the {election.dateSeasonType}!</h1>
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

      <NewsSignUp />
    </>
  );
}

// The explainer that sits under the form in _swap_form.html.haml.
export function HowItWorks({ hidePolls }: { hidePolls: boolean }) {
  return (
    <div className="background-pattern border-bottom">
      <div className="container">
        <h2>How does Swap My Vote work?</h2>
        <ol>
          <li>
            Choose the party you would prefer to vote for, and the party that
            you are willing to vote for tactically in your own constituency.
          </li>
          <li>
            We'll find you a list of people with the complementary preferences.
            Pick one partner to swap your vote with.
            {!hidePolls && (
              <>
                {" "}
                The recent polls by their name can help you see where your vote
                might make most difference.
              </>
            )}
          </li>
          <li>
            If your partner agrees to the swap, it is confirmed. We'll help you
            connect with each other, so if you like, you can introduce
            yourselves.
          </li>
        </ol>
      </div>
    </div>
  );
}
