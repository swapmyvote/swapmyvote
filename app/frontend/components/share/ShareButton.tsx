import { useState } from "react";
import Button from "react-bootstrap/Button";
import { FaShareNodes } from "react-icons/fa6";
import {
  BlueskyIcon,
  BlueskyShareButton,
  EmailIcon,
  EmailShareButton,
  FacebookIcon,
  FacebookShareButton,
  LinkedinIcon,
  LinkedinShareButton,
  RedditIcon,
  RedditShareButton,
  TelegramIcon,
  TelegramShareButton,
  WhatsappIcon,
  WhatsappShareButton,
} from "react-share";
import { emailBody, shareText, siteUrl } from "@/lib/share";
import type { Election } from "@/types/api";

const iconSize = 40;

/**
 * Whether the OS share sheet is available. Read at render time, not once at
 * module scope: this SPA is entirely client-rendered, so there is no server
 * pass to reconcile against and no hydration flicker to worry about (unlike
 * tacticalvote's Next.js port of this pattern, which does have to guard
 * against exactly that — see forwarddemocracy/tacticalvote#971). Reading it
 * per-render costs nothing here and lets tests control `navigator.share`
 * per-case via `Object.defineProperty`, which a module-scope constant
 * captured at import time would not see.
 */
function canNativeShare(): boolean {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
}

/**
 * The generic share affordance: the OS share sheet where it exists, otherwise
 * a row of per-platform buttons.
 *
 * X is deliberately absent from both branches. The legacy HAML site keeps its
 * X button until M9 removes it wholesale.
 */
export function ShareButton({ election }: { election: Election }) {
  const [copied, setCopied] = useState(false);
  const text = shareText(election);

  async function share() {
    try {
      await navigator.share({ title: "Swap My Vote", text, url: siteUrl });
    } catch (error) {
      // A dismissed sheet is not a failure — say nothing. Anything else means
      // the sheet never opened, so fall back to the clipboard.
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
    }
  }

  if (canNativeShare()) {
    return (
      <>
        <Button variant="primary" className="w-100" onClick={share}>
          <FaShareNodes aria-hidden="true" /> Share with friends &amp; family
        </Button>
        {copied && (
          <p className="small mb-0 mt-2 text-center" role="status">
            Link copied
          </p>
        )}
      </>
    );
  }

  return (
    <div className="d-flex flex-wrap gap-2 justify-content-center">
      <WhatsappShareButton
        url={siteUrl}
        title={text}
        aria-label="Share on WhatsApp"
      >
        <WhatsappIcon size={iconSize} round />
      </WhatsappShareButton>
      <BlueskyShareButton
        url={siteUrl}
        title={text}
        aria-label="Share on Bluesky"
      >
        <BlueskyIcon size={iconSize} round />
      </BlueskyShareButton>
      <FacebookShareButton url={siteUrl} aria-label="Share on Facebook">
        <FacebookIcon size={iconSize} round />
      </FacebookShareButton>
      <LinkedinShareButton
        url={siteUrl}
        title="Swap My Vote"
        summary={text}
        source="Swap My Vote"
        aria-label="Share on LinkedIn"
      >
        <LinkedinIcon size={iconSize} round />
      </LinkedinShareButton>
      <RedditShareButton
        url={siteUrl}
        title={text}
        aria-label="Share on Reddit"
      >
        <RedditIcon size={iconSize} round />
      </RedditShareButton>
      <TelegramShareButton
        url={siteUrl}
        title={text}
        aria-label="Share on Telegram"
      >
        <TelegramIcon size={iconSize} round />
      </TelegramShareButton>
      {/* The long recruitment message only fits a channel with a body, so it
          rides here rather than on the sheet. */}
      <EmailShareButton
        url={siteUrl}
        subject="SwapMyVote"
        body={emailBody(election)}
        aria-label="Share on Email"
      >
        <EmailIcon size={iconSize} round />
      </EmailShareButton>
    </div>
  );
}
