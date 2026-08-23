import type { Page } from "@playwright/test";

// Distinguishes a react-router client-side navigation from a real page load.
//
// A full page load builds a fresh document and a fresh `window`, so anything
// stamped on the previous one is gone; a client-side navigation keeps the same
// document, so the stamp survives. Comparing the stamp either side of a click
// is what tells the two apart — checking the URL alone cannot, and waiting on
// load events makes the assertion a race.
declare global {
  interface Window {
    __swapMyVoteDocumentStamp?: true;
  }
}

/** Marks the current document so a later reload can be detected. */
export async function stampDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__swapMyVoteDocumentStamp = true;
  });
}

/**
 * Whether the document has been replaced since {@link stampDocument} ran —
 * true after a full page load, false after a client-side navigation.
 */
export async function documentWasReplaced(page: Page): Promise<boolean> {
  return page.evaluate(() => window.__swapMyVoteDocumentStamp !== true);
}
