import { ActionNetworkForm } from "@/components/home/ActionNetworkForm";
import { Section } from "@/components/home/Section";
import { SocialLinks } from "@/components/home/SocialLinks";
import type { Election } from "@/types/api";

// Ports app/views/home/_closed_warm_up.html.haml.
export function ClosedWarmUp({ election }: { election: Election }) {
  return (
    <Section narrow>
      <div className="card">
        <div className="card-body">
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
            open, and for further updates
          </p>

          <ActionNetworkForm />

          <hr />

          <SocialLinks />
        </div>
      </div>
    </Section>
  );
}

function titleCase(text: string) {
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
