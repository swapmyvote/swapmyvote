import type { ReactNode } from "react";

interface ActionRowProps {
  children: ReactNode;
}

/**
 * The row a screen's actions sit in: right-aligned, with the action that
 * carries on rightmost and the way back to its left — macOS ordering, which
 * the site follows throughout.
 *
 * A component rather than a repeated `d-flex justify-content-end gap-2`,
 * because the repetition is what drifted: the M7 swap screens each grew a
 * bare `<div>` around their submit button and left-aligned it, while the
 * profile, constituency, mobile and review screens right-aligned theirs.
 *
 * Put the buttons in DOM order = visual order, so keyboard and screen-reader
 * users meet them in the same sequence sighted users do. For a modal's
 * footer, use ConfirmDialog, which fills this in for you.
 */
export function ActionRow({ children }: ActionRowProps) {
  return <div className="d-flex justify-content-end gap-2">{children}</div>;
}
