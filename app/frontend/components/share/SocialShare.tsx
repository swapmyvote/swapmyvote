import Button from "react-bootstrap/Button";
import { FaBluesky, FaWhatsapp } from "react-icons/fa6";
import { ShareButton } from "@/components/share/ShareButton";
import { buildBlueskyHref, buildWhatsAppHref } from "@/lib/share";
import { useElection } from "@/lib/referenceData";

/**
 * The share block, used wherever the SPA asks someone to spread the word.
 *
 * Takes tacticalvote's ShareBox shape — a dedicated WhatsApp button, a
 * dedicated Bluesky button, then the generic ShareButton — rather than the
 * Facebook/X/email popups of the legacy `user/share/_social` partial it
 * replaced. X is gone from the React site entirely; the HAML site keeps its
 * own buttons until M9.
 *
 * The dedicated WhatsApp button duplicates the one in ShareButton's fallback
 * row. That is deliberate: the row only appears when navigator.share is
 * absent, which is mostly desktop, where a WhatsApp Web link is still useful.
 */
export function SocialShare() {
  const election = useElection();

  if (!election.data) {
    return null;
  }

  return (
    <div className="d-flex flex-column gap-2">
      <Button
        variant="whatsapp"
        className="w-100"
        href={buildWhatsAppHref(election.data)}
        target="_blank"
        rel="noreferrer"
      >
        <FaWhatsapp aria-hidden="true" /> Share on WhatsApp
      </Button>
      <Button
        variant="bluesky"
        className="w-100"
        href={buildBlueskyHref(election.data)}
        target="_blank"
        rel="noreferrer"
      >
        <FaBluesky aria-hidden="true" /> Share on Bluesky
      </Button>
      <ShareButton election={election.data} />
    </div>
  );
}
