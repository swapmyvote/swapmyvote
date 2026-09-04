import { FaEnvelope, FaFacebook, FaTwitter } from "react-icons/fa";
import { useElection } from "@/lib/referenceData";
import type { Election } from "@/types/api";

// The site the share links point at. Not the current origin: a share from a
// preview or staging host should still send people to the live site.
const siteUrl = "https://swapmyvote.uk";

// Both sharers open a small window, matching app/assets/javascripts/sharing.coffee.
const popupFeatures = "toolbar=0,status=0,width=626,height=436";

/** Ports ApplicationHelper#app_taglines. The helper samples one of two; they
 *  differ only in person, so one is enough here. */
function tagline(election: Election): string {
  return `I am using Swap My Vote to make my vote count in the ${election.hashtags}\n\n#SwapMyVote`;
}

/** Ports the message array in user/share/_social. */
function emailBody(election: Election): string {
  return [
    "Hi,",
    "I thought you might be interested to hear about Swap My Vote. It's a website set up to help us make our votes count in elections.",
    `Can you vote in the ${election.eventChoice} on ${election.dateDm}?`,
    `You can swap votes with someone in ${election.constituencyOther} to help both votes count for more. You get to vote for who you really want, and to help someone else do the same - it's a win-win! `,
    siteUrl,
  ].join("\n\n");
}

/**
 * Ports app/views/user/share/_social.html.haml, including the exact sharer
 * URLs the legacy CoffeeScript builds. `shareOnFacebook`'s `app_id` argument
 * was never used by the sharer endpoint, so nothing here needs FACEBOOK_KEY.
 */
export function SocialShare() {
  const election = useElection();

  if (!election.data) {
    return null;
  }

  const message = tagline(election.data);

  function shareOnFacebook() {
    const url =
      "https://www.facebook.com/sharer/sharer.php?" +
      `u=${encodeURIComponent(siteUrl)}` +
      "&display=popup" +
      `&quote=${encodeURIComponent(message)}` +
      `&hashtag=${encodeURIComponent("#SwapMyVote")}`;
    window.open(url, "fb_sharer", popupFeatures);
  }

  function shareOnTwitter() {
    const url =
      "https://twitter.com/share" +
      `?url=${encodeURIComponent(siteUrl)}` +
      "&related=SwapMyVote" +
      `&text=${encodeURIComponent(`${message} @SwapMyVote`)}`;
    window.open(url, "twitter_sharer", popupFeatures);
  }

  return (
    <div className="d-flex flex-column gap-2">
      <button
        type="button"
        className="btn btn-facebook w-100"
        onClick={shareOnFacebook}
      >
        <FaFacebook aria-hidden="true" /> Share on Facebook
      </button>
      <button
        type="button"
        className="btn btn-twitter w-100"
        onClick={shareOnTwitter}
      >
        <FaTwitter aria-hidden="true" /> Share on Twitter
      </button>
      <a
        className="btn btn-email w-100"
        href={`mailto:?subject=SwapMyVote&body=${encodeURIComponent(emailBody(election.data))}`}
      >
        <FaEnvelope aria-hidden="true" /> Share on Email
      </a>
    </div>
  );
}
