import type { ReactNode } from "react";
import type { SwapPartnerDetail } from "@/types/api";

// The FAQ is not ported, so these stay full-page anchors — see spaPaths.ts.
const facebookFaq = "/faq#facebook-profile";
const resetFaq = "/faq#reset";

/**
 * Ports app/views/shared/_reach_out_to_swap.html.haml and
 * UsersHelper#contact_methods.
 *
 * Everything here comes from `partner.contact`, which the server only
 * serializes on a confirmed swap; within it, `email` additionally requires
 * that partner's own consent, while the social profile fields are always
 * present. An absent `contact` is the "has not shared" case, not a rendering
 * decision made here.
 */
export function ReachOutToSwap({ partner }: { partner: SwapPartnerDetail }) {
  const contact = partner.contact;
  const methods: ReactNode[] = [];

  if (contact?.profileUrl && contact.provider === "twitter") {
    methods.push(
      <a
        key="twitter"
        href={contact.profileUrl}
        target="_blank"
        rel="noreferrer"
      >
        on Twitter
      </a>,
    );
  }

  if (contact?.profileUrl && contact.provider === "facebook") {
    methods.push(
      <span key="facebook">
        <a href={contact.profileUrl} target="_blank" rel="noreferrer">
          on Facebook
        </a>{" "}
        (although <a href={facebookFaq}>unfortunately this may not work</a>)
      </span>,
    );
  }

  if (contact?.email) {
    methods.push(
      <a key="email" href={`mailto:${encodeURIComponent(contact.email)}`}>
        by email at {contact.email}
      </a>,
    );
  }

  // The legacy helper offers the escape hatch when there is no way to make
  // contact, or when the only way is a Facebook profile link.
  const onlyFacebook =
    methods.length === 1 && (contact?.facebookLogin ?? false);

  if (methods.length === 0) {
    return (
      <p className="mb-0">
        Unfortunately {partner.name} has not shared their email address or
        social media profile. If this makes you uncomfortable you can{" "}
        <a href={resetFaq}>cancel your swap</a>.
      </p>
    );
  }

  return (
    <p className="mb-0">
      You can reach out to {partner.name}{" "}
      {methods.map((method, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the list is at most three fixed entries rendered in a fixed order.
        <span key={index}>
          {index > 0 && " or "}
          {method}
        </span>
      ))}{" "}
      to get to know your swap partner.
      {onlyFacebook && (
        <>
          {" "}
          If this makes you uncomfortable you can{" "}
          <a href={resetFaq}>cancel your swap</a>.
        </>
      )}
    </p>
  );
}
