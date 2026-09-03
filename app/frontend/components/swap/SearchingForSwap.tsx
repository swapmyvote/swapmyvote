import { Link } from "react-router-dom";
import { SocialShare } from "@/components/share/SocialShare";
import { useSession } from "@/contexts/useSession";
import { spaPaths } from "@/lib/spaPaths";

/**
 * Ports app/views/user/swaps/_searching_for_swap.html.haml — what the
 * find-a-swap screen shows when nobody complementary is available yet.
 *
 * The HAML version embeds the whole phone form here because there was nowhere
 * else to put it. M6 gave us /app/mobile, so this links there instead.
 */
export function SearchingForSwap() {
  const { session } = useSession();
  const mobileVerified = session?.currentUser?.mobileVerified ?? false;

  return (
    <div className="d-flex flex-column gap-3">
      <h1 className="h4 mb-0">We’re looking for a voting partner for you</h1>

      <p className="mb-0">
        At the moment we have more voters who want to vote the same way as you,
        but fewer with complementary preferences. Please revisit this page soon
        and hopefully you'll see some matches appear!
      </p>

      <h2 className="h5 mb-0">While you're waiting …</h2>

      {!mobileVerified && (
        <>
          <p className="mb-0">
            Verifying your mobile phone number is required before confirming a
            swap, in order to prove your account is genuine.
          </p>
          <p className="mb-0">
            <Link to={spaPaths.mobile}>Verify your mobile number</Link>
          </p>
        </>
      )}

      <h2 className="h5 mb-0">Spread the word!</h2>

      <p className="mb-0">
        You can also help us find more potential voting partners by sharing Swap
        My Vote with your friends!
      </p>

      <SocialShare />
    </div>
  );
}
