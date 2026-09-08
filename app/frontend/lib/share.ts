import type { Election } from "@/types/api";

/**
 * The site every share points at. Deliberately not the current origin: a
 * share from a preview or staging host must still send people to the live
 * site. Moved here from SocialShare.tsx.
 */
export const siteUrl = "https://swapmyvote.uk";

/** Ports ApplicationHelper#app_taglines. The helper samples one of two; they
 *  differ only in person, so one is enough here. */
export function shareText(election: Election): string {
  return `I am using Swap My Vote to make my vote count in the ${election.hashtags}\n\n#SwapMyVote`;
}

/** Ports the message array in app/views/user/share/_social.html.haml. */
export function emailBody(election: Election): string {
  return [
    "Hi,",
    "I thought you might be interested to hear about Swap My Vote. It's a website set up to help us make our votes count in elections.",
    `Can you vote in the ${election.eventChoice} on ${election.dateDm}?`,
    `You can swap votes with someone in ${election.constituencyOther} to help both votes count for more. You get to vote for who you really want, and to help someone else do the same - it's a win-win! `,
    siteUrl,
  ].join("\n\n");
}

/** Mirrors tacticalvote's utils/share.ts. */
export function buildBlueskyHref(election: Election): string {
  const text = `${shareText(election)}\n\n${siteUrl}`;
  return `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`;
}

export function buildWhatsAppHref(election: Election): string {
  const text = `${shareText(election)}\n\n${siteUrl}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
