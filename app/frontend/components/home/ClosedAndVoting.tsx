import { GoVote } from "@/components/home/GoVote";
import { NewsSignUp } from "@/components/home/NewsSignUp";
import { Section } from "@/components/home/Section";
import { SocialLinks } from "@/components/home/SocialLinks";

interface ClosedAndVotingProps {
  loggedIn: boolean;
  swapConfirmed: boolean;
}

// Ports app/views/home/_closed_and_voting.html.haml.
export function ClosedAndVoting({
  loggedIn,
  swapConfirmed,
}: ClosedAndVotingProps) {
  return (
    <>
      <Section narrow>
        <div className="card">
          <div className="card-body">
            <h2>It's time to vote!</h2>
            <p>
              Now that the election polls are open, Swap My Vote is closed for
              new swaps
            </p>

            {loggedIn && swapConfirmed ? (
              <p>
                But that doesn't affect you since you managed to{" "}
                {/* Still HAML, so a full page load. */}
                <a href="/user">confirm a swap</a> - congratulations!
              </p>
            ) : (
              <p>
                If you've haven't had a confirmation via email or web that your
                vote has been swapped, we're sorry we weren't able to pair you
                with a voting partner yet. However, all is not lost - you can
                still vote tactically, or simply for the party you most wish to
                support.
              </p>
            )}

            <p>
              Thank you so much for taking part - together we are making
              democracy better and more representative!
            </p>

            <GoVote swapConfirmed={swapConfirmed} />

            <p>
              Till next time,
              <br />
              All the best from the Swap My Vote team
            </p>

            <hr />

            <SocialLinks />
          </div>
        </div>
      </Section>

      <NewsSignUp />
    </>
  );
}
