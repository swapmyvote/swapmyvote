import type { SwapRecommendation } from "@/types/api";

interface PartyRecommendationsProps {
  constituencyName: string;
  recommendations: SwapRecommendation[];
}

/**
 * Ports app/views/recommendations/_party_recommendation.html.haml and the
 * card that wraps it in _swap_profile.
 *
 * Every site gets a row, including the ones with nothing to say — that is what
 * the server sends and what the legacy card draws. A site that recommends this
 * exact party is ticked.
 *
 * No card of its own: this sits inside SwapProfileCard's card, and a bordered
 * panel inside a bordered panel inside the profile card was three nested
 * boxes deep. The heading is what separates it from the poll interpretation
 * above.
 */
export function PartyRecommendations({
  constituencyName,
  recommendations,
}: PartyRecommendationsProps) {
  if (recommendations.length === 0) {
    return null;
  }

  // RecommendationsHelper#fullest_recommendations_for marks a site `good` when
  // it recommends exactly the party this swap offers. Without a legend the
  // tick is unexplained — a "bad" row (site recommends a different party) and
  // an "unknown" one (site has no view on this seat) both simply lack it.
  const anyMatch = recommendations.some((rec) => rec.match === "good");

  return (
    <div className="d-flex flex-column gap-2">
      <p className="small text-muted mb-0">
        Tactical voting recommendations for {constituencyName}:
      </p>
      <ul className="list-unstyled mb-0">
        {recommendations.map((rec) => (
          <li key={rec.siteId} className={`party-recommendation ${rec.siteId}`}>
            {rec.match === "good" && <span aria-hidden="true">✅</span>}{" "}
            <a
              href={rec.siteLink}
              title={`${rec.siteName}: "${rec.siteMetaDesc}"`}
            >
              {rec.siteName}
            </a>{" "}
            {rec.match === "unknown"
              ? "has no recommendation"
              : `recommend ${rec.text}`}
            {rec.match === "good" && (
              // The tick above is aria-hidden and, for a "bad" match, the
              // sentence reads identically ("recommend {text}") — this is
              // the only way a screen reader hears that the two differ.
              <span className="visually-hidden">, matching this swap</span>
            )}
          </li>
        ))}
      </ul>
      {anyMatch && (
        <p className="small subdued mb-0">
          <span aria-hidden="true">✅</span> marks a site that recommends the
          same party as this swap.
        </p>
      )}
    </div>
  );
}
