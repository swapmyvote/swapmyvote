import { ActionNetworkForm } from "@/components/home/ActionNetworkForm";
import { SocialLinks } from "@/components/home/SocialLinks";
import type { Election } from "@/types/api";

// Ports app/views/home/_closed_wind_down.html.haml.
export function ClosedWindDown({ election }: { election: Election }) {
  return (
    <div className="background-pattern border-bottom">
      <div className="container container-narrow">
        <div className="card">
          <h2>
            {election.eventTitleWithYear}{" "}
            {election.generalElection ? "is" : "are"} a wrap!
          </h2>

          <p>
            Thank you for using Swap My Vote in the United Kingdom General
            Election, 2024.
          </p>
          <p>
            UPDATE: For the US Presidential Election, 2024, please visit our
            cousin site stateside.
          </p>
          <p>
            Swap Your Vote to defeat Trump in swing states and cast protest
            votes in safe states:
            <br />
            <a href="https://swapyourvote.org" className="button">
              Visit SwapYourVote.org
            </a>
          </p>

          <p>
            We will run Swap My Vote again for the next UK elections, whenever
            that turns out to be.
          </p>

          <p>
            <strong>Thank you so much</strong> for taking part! But the work
            doesn't stop here. The team behind Swap My Vote -{" "}
            <a
              href="https://forwarddemocracy.com"
              target="_blank"
              rel="noreferrer"
            >
              Forward Democracy
            </a>{" "}
            - will continue to develop ways to defend and develop our democracy,
            that most precious, powerful, and fragile of things.
          </p>

          <p>
            Please enter your email address for reminders when we open again for
            swaps; for updates, news, and campaigns to help to defend and
            develop democracy; electoral reform and digital democratic tools.
            You can unsubscribe at any time from the link in the footer of any
            of these emails.
          </p>

          <ActionNetworkForm />

          {election.donate.show && (
            <p>
              Please help support our continued work on Swap My Vote and related
              projects - donate to{" "}
              <a href={election.donate.link} target="_blank" rel="noreferrer">
                our crowdfunder.
              </a>
            </p>
          )}

          <hr />

          <SocialLinks intro={false} />
        </div>
      </div>
    </div>
  );
}
