import type { SwapRecommendation } from "@/types/api";

interface RecommendationsKeyProps {
  /** Every recommendation the screen shows — one candidate's, or all of them
   *  on the find-a-swap list. */
  recommendations: SwapRecommendation[];
}

/**
 * What the ✅ in a recommendations list means.
 *
 * RecommendationsHelper#fullest_recommendations_for marks a site `good` when
 * it recommends exactly the party the swap offers, and nothing on screen said
 * so — `bad` (the site recommends a different party) and `unknown` (it has no
 * view on that seat) are both simply unticked, so the tick's absence carries
 * two different meanings and its presence carried none.
 *
 * Once per screen, not once per card: the find-a-swap list stacks five
 * candidates, and a key repeated against each of them is noise sitting in the
 * most prominent spot on the card — directly above "Offer to swap".
 * SwapProfileCard renders this itself so a single-card screen cannot forget
 * it; PotentialSwapList opts out and renders one for the whole list.
 *
 * Nothing to explain when nothing is ticked, so it stays away entirely.
 */
export function RecommendationsKey({
  recommendations,
}: RecommendationsKeyProps) {
  if (!recommendations.some((rec) => rec.match === "good")) {
    return null;
  }

  return (
    <p className="small subdued mb-0">
      <span aria-hidden="true">✅</span> marks a site that recommends the same
      party as this swap.
    </p>
  );
}
