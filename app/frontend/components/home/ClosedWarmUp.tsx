import { ActionNetworkForm } from "@/components/home/ActionNetworkForm";
import { SocialLinks } from "@/components/home/SocialLinks";
import type { Election } from "@/types/api";

// Ports app/views/home/_closed_warm_up.html.haml.
export function ClosedWarmUp({ election }: { election: Election }) {
  return (
    <div className="background-pattern border-bottom">
      <div className="container container-narrow">
        <div className="card">
          <h2>{titleCase(election.dateAndTypeMy)} Update</h2>

          <p>
            We have updated the Swap My Vote platform for the{" "}
            {election.generalElection ? (
              <>{titleCase(election.dateSeasonType)}!</>
            ) : (
              <>
                two by-elections to be held this {election.season} on{" "}
                {election.dateMd}: {election.constituenciesAsSentence}.
              </>
            )}{" "}
            We aim to open for vote swapping soon!
          </p>

          <p>
            Please enter your email address for a reminder when vote swapping is
            open, and for further updates.
          </p>

          <ActionNetworkForm />

          <hr />

          <SocialLinks />
        </div>
      </div>
    </div>
  );
}

function titleCase(text: string) {
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
