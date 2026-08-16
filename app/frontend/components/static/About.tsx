import { StaticPage } from "@/components/static/StaticPage";
import { GITHUB_URL } from "@/lib/externalLinks";

// Ported from app/views/static_pages/about.html.haml. Every link here crosses
// out of the SPA (external sites, or the not-yet-migrated /api HAML page), so
// they are all plain <a> anchors — no react-router <Link>.
export function About() {
  return (
    <StaticPage>
      <h1>About Swap My Vote</h1>

      <p>
        Wasted votes are a massive problem in UK general elections —{" "}
        <a
          href="https://www.electoral-reform.org.uk/latest-news-and-research/publications/the-2017-general-election-report/"
          target="_blank"
          rel="noopener"
        >
          68% were wasted in 2017 (that's 22 million votes)
        </a>
        , and eleven seats were decided by fewer than 100 votes. Our broken
        electoral system polarises the national debate, and leads to divisions
        in the very society it is supposed to represent.
      </p>

      <p>
        In 2015, only a quarter of votes cast were necessary for the candidates
        to win; 50% of votes were for losing candidates and received no direct
        representation in Parliament. Parties throw resources at marginal
        constituencies while neglecting safe seats and all kinds of consequences
        follow, including voter apathy, low turnout, electoral deserts, and the
        need for tactical voting, amongst other problems.
      </p>

      <p>
        Electoral reform is long overdue; 2011's AV referendum did nothing to
        correct any of these issues.
      </p>

      <p>
        Referendums in 2014 and 2016 on Scottish Independence and EU membership
        strongly indicated how popular voting can be when voters know that it
        will count. As did the{" "}
        <a
          href="https://news.sky.com/story/general-election-2017-6-5-million-voted-tactically-on-8-june-10998890"
          target="_blank"
          rel="noopener"
        >
          6.5 million people who voted tactically in 2017
        </a>
        .
      </p>

      <p>
        The Internet has opened up previously undreamed-of ways for people to
        collaborate and share resources. Swap My Vote aims to bring some of the
        best aspects of the 'Sharing Economy' to the very workings of democracy.
        A radical and practical experiment, Swap My Vote uses social media to
        help pair voters who want to swap, each casting each other's preferred
        vote where it could count for more.
      </p>

      <h2>More information</h2>

      <ul>
        <li>
          A helpful <a href="http://j.mp/swapmyvote-inews2017">introduction</a>{" "}
          in the i Paper.
        </li>
        <li>
          A <a href="http://j.mp/swapmyvote-beginners">guide for beginners</a>{" "}
          on how best to make Swap My Vote work for you.
        </li>
        <li>
          There is more information, press coverage etc, collected at this page
          on <a href="https://forwarddemocracy.com/swapmyvote">Swap My Vote</a>{" "}
          at the Forward Democracy website.
        </li>
        <li>
          For developers &amp; campaigns: our <a href="/api">API</a> allows your
          site to integrate Swap My Vote and help voters find a swap.
        </li>
        <li>
          In the interests of transparency,{" "}
          <a href={GITHUB_URL}>our entire codebase</a> is available for peer
          review.
        </li>
        <li>
          Developers are welcome to join the project. The{" "}
          <a href="https://github.com/swapmyvote/swapmyvote/blob/master/README.md">
            README document
          </a>{" "}
          is the best starting point.
        </li>
      </ul>
    </StaticPage>
  );
}
