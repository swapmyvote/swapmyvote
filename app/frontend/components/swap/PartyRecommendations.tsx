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
 */
export function PartyRecommendations({
  constituencyName,
  recommendations,
}: PartyRecommendationsProps) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-body">
        <p className="mb-2">
          Tactical voting recommendations for {constituencyName}
        </p>
        <ul className="list-unstyled mb-0">
          {recommendations.map((rec) => (
            <li
              key={rec.siteId}
              className={`party-recommendation ${rec.siteId}`}
            >
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
      </div>
    </div>
  );
}
