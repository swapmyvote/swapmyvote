import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { Link } from "react-router-dom";
import { StaticPage } from "@/components/static/StaticPage";
import { constituencyOnsIdDatasetUrl } from "@/lib/externalLinks";
import {
  useConstituencies,
  useElection,
  useParties,
} from "@/lib/referenceData";
import { spaPaths } from "@/lib/spaPaths";
import type { Constituency, Party } from "@/types/api";

// Builds the same outbound URL as Rails' `swap_url` helper: always the
// canonical, live `/swap` route (never the `/app/swap` preview path), since
// this is the deep link partner campaign sites are told to use.
function swapUrl(params: Record<string, string>): string {
  const query = new URLSearchParams(params);
  return `${window.location.origin}/swap?${query.toString()}`;
}

// Matches Party#parameterize.gsub('-', '_') from the HAML example URLs
// (`labour_party`), which is deliberately a different spelling from the
// documented list's `canonicalName` (`labour`) below. Both are accepted by
// Api::V1::RegistrationController#party_id_for, so this is not a bug.
function parameterizedPartyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-/g, "_");
}

function ByElectionConstituencies({
  constituencies,
}: {
  constituencies: Constituency[];
}) {
  return (
    <>
      <p>The constituencies for this by election are</p>
      {constituencies.map((constituency) => (
        <div key={constituency.onsId}>
          <p>
            <b>{constituency.name}</b>
          </p>
          <dl>
            <dt>
              <code>constituency_name</code>
            </dt>
            <dd>{encodeURIComponent(constituency.name)}</dd>
            <dt>
              <code>constituency_ons_id</code>
            </dt>
            <dd>{constituency.onsId}</dd>
          </dl>
        </div>
      ))}
    </>
  );
}

// Ported from app/views/static_pages/api.html.haml and
// _api_constituencies.html.haml, which stay live at /api until cutover.
//
// `random` defaults to Math.random and is only ever overridden by tests: it
// picks the example party shown in the two outbound-link examples below, on
// every page load, the same as `Party.all.sample` did in the HAML. That looks
// like an oversight but is load-bearing — the FAQ calls this site "devotedly
// non-partisan", and a fixed party in the integration docs would read as an
// endorsement.
export function ApiDocs({ random = Math.random }: { random?: () => number }) {
  const parties = useParties();
  const constituencies = useConstituencies();
  const election = useElection();

  if (parties.isPending || constituencies.isPending || election.isPending) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading</span>
        </Spinner>
      </Container>
    );
  }

  const partyList = parties.data ?? [];
  const pickParty = (): Party | null => {
    if (partyList.length === 0) {
      return null;
    }
    return partyList[Math.floor(random() * partyList.length)];
  };
  const party1 = pickParty();
  const party2 = pickParty();

  const url1 = swapUrl({
    willing_party_name: party1 ? parameterizedPartyName(party1.name ?? "") : "",
    constituency_name: "Aberdeen North",
  });
  const url2 = swapUrl({
    preferred_party_name: party2
      ? parameterizedPartyName(party2.name ?? "")
      : "",
    constituency_ons_id: "E14001605",
  });

  return (
    <StaticPage>
      <h1>Swap My Vote API</h1>

      <p>
        Swap My Vote does not have a conventional REST API, but we do have a
        single end point to pre-populate some of the fields that a user can
        choose.
      </p>

      <p>
        This should be ideal for tactical voting campaigns which want to
        encourage voters to follow their recommendations, and indeed we would be
        very happy to see tactical voting sites integrate with Swap My Vote. The
        below documentation is probably sufficient, but if you need assistance
        then please <Link to={spaPaths.contact}>get in touch</Link>.
      </p>

      <p>Available parameters are:</p>

      <dl>
        <dt>
          <code>willing_party_name</code>
        </dt>
        <dd>The party that the user is willing to vote for, say tactically.</dd>

        <dt>
          <code>preferred_party_name</code>
        </dt>
        <dd>
          The party that the user would ideally like to vote for, say if all
          votes counted equally nationally.
        </dd>

        <dt>
          <code>constituency_name</code>
        </dt>
        <dd>
          The name of the default constituency for the user post-login. This is
          useful if you want to refer a user for tactical voting and you know in
          which constituency they are registered to vote, as it will save them
          manually selecting that constituency. The name must match one of the
          constituencies in the <code>name</code> field of{" "}
          <a href={constituencyOnsIdDatasetUrl} target="_blank" rel="noopener">
            this data set
          </a>
          .
        </dd>

        <dt>
          <code>constituency_ons_id</code>
        </dt>
        <dd>
          The same as for <code>constituency_name</code> above, except that
          rather than the name, it's the ONS id of the constituency listed in
          the <code>gss_code</code> field of{" "}
          <a href={constituencyOnsIdDatasetUrl} target="_blank" rel="noopener">
            the data set
          </a>
          .
        </dd>
      </dl>

      <p>
        For example if a tactical voting site wishes to recommend a user to vote
        for (randomly chosen) {party1?.name} candidate in the Aberdeen North
        constituency, they could use this outbound link:
      </p>

      <p>
        <a href={url1}>{url1}</a>
      </p>

      <p>
        This one would also work, but rather than specify the tactical vote,
        instead specifies the user’s preferred party (randomly chosen){" "}
        {party2?.name}. This time their constituency is York Outer (specified by
        ONS code).
      </p>

      <p>
        <a href={url2}>{url2}</a>
      </p>

      <p>
        Preferred party and willing party can be used singly or in combination.
      </p>

      <p>
        The party names should be lowercased and use underscores instead of
        spaces; here are the available options:
      </p>

      <ul>
        {partyList.map((party) => (
          <li key={party.id}>
            <code>{party.canonicalName}</code>
          </li>
        ))}
      </ul>

      {election.data?.generalElection === false && (
        <ByElectionConstituencies constituencies={constituencies.data ?? []} />
      )}

      <p>
        Note that any parameters set are "sticky" and will apply even after the
        page is reloaded. They can be "unstuck" by adding <code>?clear</code> to
        the end of the URL.
      </p>
    </StaticPage>
  );
}
