import Spinner from "react-bootstrap/Spinner";
import { Link } from "react-router-dom";
import { StaticPage } from "@/components/static/StaticPage";
import {
  forwardDemocracyPrivacyPolicyUrl,
  githubUrl,
} from "@/lib/externalLinks";
import { useElection } from "@/lib/referenceData";
import { spaPaths } from "@/lib/spaPaths";

// Ported from app/views/static_pages/faq.html.haml, which stays live at /faq
// until cutover.
//
// The legacy view marks each section with `%a(name="legal")` — the HTML 4
// named anchor, dropped from HTML 5 but still honoured by browsers, which is
// why /faq#trust works today. Here the anchor is an `id` on the heading
// itself, so the scroll target is the heading rather than an empty element
// above it.
//
// Four deliberate divergences from the HAML; see the M9 design doc:
//   - the `#login` section ("why Facebook / Twitter / email, and not X?") is
//     dropped — social login was removed in 8a4b078 and the `#trust` section
//     two headings up already says so;
//   - `#facebook-profile` is kept and ungated, because existing social
//     accounts still authenticate and ReachOutToSwap deep-links to it;
//   - `name="reset"` appears twice in the HAML, so only the first was
//     reachable; the id is on the second ("How can I reset or cancel my
//     swap?"), which is what every #reset link means. The section between
//     "change" and "better" that held the first, unreachable, anchor keeps
//     its position but loses the id;
//   - HAML line 270's "cancel your swap immediately" linked to its own
//     section (the old, unreachable #reset); it now points at the cancel
//     instructions further down the page.
export function Faq() {
  const election = useElection();

  // Gated rather than defaulted, as ApiDocs and Home already are: the swap
  // expiry and the election's name are both mid-sentence here, so rendering
  // before the payload lands shows "not currently available during the ." and
  // then a 48 that flips to the real figure. `useElection` is not prefetched,
  // so a cold visit really does hit that window.
  if (election.isPending) {
    return (
      <StaticPage>
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading</span>
          </Spinner>
        </div>
      </StaticPage>
    );
  }

  const expiryHours = election.data?.swapValidityHours ?? 48;
  const dateSeasonType = election.data?.dateSeasonType ?? "";

  return (
    <StaticPage>
      <h1>FAQ</h1>

      <h2 id="legal">Is this legal?</h2>
      <p>Yes.</p>
      <p>
        Vote swapping has taken place informally since voting began, not least
        within parliaments. We know of no law against it (unlike selling your
        vote, or compelling someone to vote against their will, which are very
        much illegal!), and indeed in the USA, swapping votes has{" "}
        <a href="https://cdn.ca9.uscourts.gov/datastore/opinions/2007/08/06/0655517.pdf">
          been found
        </a>{" "}
        by the Appeals Court to be{" "}
        <a href="https://www.wired.com/2007/08/internet-vote-s/">
          protected speech
        </a>{" "}
        under the First Amendment. Swap My Vote merely introduces two
        individuals to each other who have complementary voting preferences;
        nothing changes hands, and the secret ballot still stands: you are
        responsible for trusting your partner - and voting according to your
        conscience! Please do not take pictures of your ballot.
      </p>

      <h2 id="trust">How do I know my partner will vote (for who I want)?</h2>
      <p>
        We require that anyone logging in via email can be reached by the swap
        partner they have agreed to.
      </p>
      <p>
        To help ensure account belong to real people, we have also made
        verification of a mobile phone number mandatory.
      </p>
      <p>
        If you do make contact with your vote partner, perhaps let each other
        know what the most important policies to you, what you would like your
        vote to achieve, why you have decided to swap your vote.
      </p>
      <p>
        Some people even let each other know when they're heading down to the
        polling station and, on the day, we'll send you a link you can click to
        automatically let each other know you've voted.
      </p>
      <p>
        We’re hoping that this site may contribute to a greater sense of
        community amongst voters, all hoping to make the country run as well as
        possible for a better future for everyone.
      </p>
      <p>
        In the past we integrated the Swap My Vote platform with two of the
        biggest public social networks used in the UK (Twitter and Facebook) as
        another way to check that there is a real person at the other end of the
        swap. However, due to technical challenges these are not currently
        available during the {dateSeasonType}.
      </p>

      <h2 id="privacy">Do my voting intentions stay private?</h2>
      <p>
        Yes. Your voting intentions are sacred! We do not publish anything on
        your behalf outside the Swap My Vote platform and emails. Your name,
        profile picture, constituency and voting preferences will be presented
        to voting partners in different constituencies who have the
        complementary preferences. Sharing the site is voluntary and the 'share'
        buttons create a draft post with generic text which you can change
        before posting. No data is shared with Facebook or Twitter about your
        voting preferences. We only collect the minimum of data to allow us to
        find you a swap - see our{" "}
        <a href={forwardDemocracyPrivacyPolicyUrl}>privacy policy</a> for more
        about how we use cookies to monitor visits to the site.
      </p>

      <h2 id="independence">Are you aligned with a political party?</h2>
      <p>No.</p>
      <p>
        The Swap My Vote team is committed to creating a tool that can help make
        votes fairer and more equal. We believe in a healthy democracy with
        multiple parties, and a better voting system to gauge the public's
        support for them. The platform is independent of any party and will
        remain so.
      </p>

      <h2 id="parties">
        How have you chosen which political parties to offer through Swap My
        Vote?
      </h2>
      <p>
        Working out which parties to include in the swapmyvote.uk platform has
        not been straightforward: initially we prioritised parties that were
        fielding candidates in all constituencies across the UK. Then,
        particularly in the wake of 2015's Leaders Debates, which uncovered
        hidden demand for Scottish and Welsh parties, we added SNP and Plaid
        Cymru.
      </p>
      <p>
        Inclusion in the platform is currently a trade-off between simplicity
        and the time it takes to include parties; updating poll information is
        time-consuming and we are at present a small team.
      </p>
      <p>
        Lastly, with the phenomenal demand for the platform, we have been
        working hard to make sure that other aspects of the site work as well as
        possible.
      </p>
      <p>
        Ultimately, Swap My Vote is devotedly non-partisan and aspires to as
        fully inclusive as practically possible - thank you for bearing with us
        while we work towards this.
      </p>

      <h2 id="facebook-profile">
        Why can't I reach my swap partner's Facebook profile?
      </h2>
      <p>This could be for one of a few reasons:</p>
      <ul>
        <li>
          You're not in your swap partner's network of friends on Facebook.
          Unfortunately we recently discovered that Facebook have locked down
          the links to user profiles which they provide to apps, so that{" "}
          <a
            href="https://developers.facebook.com/docs/facebook-login/permissions/#reference-user_link"
            target="_blank"
            rel="noopener"
          >
            they only work for users who are already friends.
          </a>
        </li>
        <li>
          Your swap partner chose not to allow the Swap My Vote app access to a
          link to their Facebook profile when they logged in to the app via
          Facebook.
        </li>
        <li>
          Your swap partner logged into the app through some other mechanism,
          e.g. Twitter or email.
        </li>
      </ul>
      <p>
        To help fix this problem, we are also asking everyone for consent to
        share their email address with their swap partner.
      </p>
      <p>
        However as a last resort, you can always consider{" "}
        <a href="#reset">cancelling your swap</a> and looking for another swap
        partner. The little icons next to someone's name can help you find
        someone who is easier to reach out to.
      </p>

      <h2 id="trouble">The site isn't working properly - help!</h2>
      <p>
        If you are having issues logging in or using the site, first please
        check you are not using any browser extensions that may block cookies,
        or are using the Brave browser with Shields enabled, as these may
        interfere with correct functioning of the site.
      </p>
      <p>
        Also if you aren't receiving emails from us, please search your spam
        folder for <code>{"<hello@swapmyvote.uk>"}</code>.
      </p>
      <p>
        If this doesn't help, sorry for the inconvenience! You can{" "}
        <Link to={spaPaths.contact}>contact us</Link> for help, but please make
        sure to provide as much detail as possible about the steps you took
        leading up to the problem, and the exact nature of the problem. In
        particular error messages and screenshots / photos are really helpful.
        The more detail we receive, the better the chance we have to help you!
      </p>

      <h2 id="constituencies">
        I want to swap with someone in a particular constituency. Please can you
        find me a swap there?
      </h2>
      <p>
        At a general election, we show you potential voting partners in a range
        of constituencies in order to maximise the number of swaps available to
        everyone who has signed up. You can see polls by their names and, if you
        can't find a swap you are happy with, you can reset your voting
        preferences and be matched again (see below). In by-elections, there are
        only two constituencies in play so you can only swap with the opposite
        constituency.
      </p>

      <h2 id="change">
        Can I change my mind about my voting preferences, or my other
        information?
      </h2>
      <p>
        Yes, you can change at any time. Just update your info using{" "}
        <Link to={spaPaths.profile}>
          the link that says "Not right? Update your info"
        </Link>
        . If you have already chosen or confirmed a swap, it will reset the
        swap, letting your partner know it has been cancelled. You are then free
        to choose another swap.
      </p>

      <h2>My swap hasn't been confirmed; what should I do?</h2>
      <p>
        If your partner hasn't confirmed the swap, it will now automatically
        expire after {expiryHours} hours and we will email both parties to let
        them know to log in to find a new partner.
      </p>
      <p>
        However if you don't want to wait, you can{" "}
        <a href="#reset">cancel your swap immediately</a> as described below.
      </p>

      <h2 id="better">
        The swap I’ve been offered isn’t a good one - how can I find a better
        voting partner?
      </h2>
      <p>
        See how to <a href="#reset">cancel your swap</a> as described below.
      </p>

      <h2 id="reset">How can I reset or cancel my swap?</h2>
      <p>
        Just temporarily change your voting preferences using{" "}
        <Link to={spaPaths.profile}>
          the link that says "Not right? Update your info"
        </Link>{" "}
        and it will reset the swap, letting your partner know it has been
        cancelled. Then change them back, and you will be ready to choose
        another voting partner from the list.
      </p>

      <h2 id="noone">No-one is confirming a swap with me. What’s going on?</h2>
      <p>
        People finding it hard to find a swap are often in quite safe seats or
        specify a party for whom there is not as much support or demand. You may
        find it useful to think about experimenting with your 'willing' party -
        you can update your info using the link that says "Not right? Update
        your info" and we will try to find you new voting partners based on the
        new details.
      </p>

      <h2 id="deactivate">
        I have changed my mind and no longer wish to find someone to swap with.
        What should I do?
      </h2>
      <p>
        You can{" "}
        {/* Not yet an SPA screen — M10 ports /confirm_account_deletion and
            repoints this. Deliberately a full-page <a> until then. */}
        <a href="/confirm_account_deletion">permanently remove your account</a>.
        Please note that you may no longer get emails from us with news on
        electoral reform or reminders for future elections.
      </p>
      <p>
        However, we{" "}
        <a href="https://github.com/swapmyvote/swapmyvote/issues/466">
          plan to add a feature to allow pausing of swaps
        </a>{" "}
        later on, so that this can be done temporarily without the need to
        delete your account.
      </p>

      <h2 id="who">Who made this site?</h2>
      <p>
        We are a loose knit group of people who care passionately about making
        democracy work better, and believe that new technologies (the Internet,
        social media, etc) can very much play their part in this.
      </p>
      <ul>
        <li>
          <a href="https://tdg.me/about">Tom de Grunwald</a> is a social
          entrepreneur and producer with a background in broadcast, digital
          storytelling, and civic technology projects. Tom is passionate about
          using technology to help defend and promote democracy, and to create
          positive social change. He has founded Forward Democracy to help
          further defend and promote democracy, and his consultancy focuses on
          digital social impact, working with Tech for UK, Democracy Club,
          Graduate Fog, Open Rights Group, Shared Assets, Good Law Project, and
          others.
        </li>
        <li>
          <a href="http://adamspiers.org/" target="_blank" rel="noopener">
            Adam Spiers
          </a>{" "}
          is our project CTO; an expert in Free and Open Source Software he
          builds tech products that help democratic engagement in his spare
          time.
        </li>
        <li>
          <a href="http://jpallen.net/" target="_blank" rel="noopener">
            James Allen
          </a>{" "}
          is the a co-founder and led development of the project. He also
          co-founded{" "}
          <a href="https://www.sharelatex.com/" target="_blank" rel="noopener">
            ShareLaTeX
          </a>
          , a collaborative platform for scientists (now part of Overleaf). He
          is interested in how technology can make people more efficient and
          enable new ways of communication and collaboration, like Swap My Vote.
        </li>
        <li>
          <a
            href="https://www.linkedin.com/in/sarah-eggleston-34bb924/"
            target="_blank"
            rel="noopener"
          >
            Sarah Eggleston
          </a>{" "}
          is an enthusiastic convert to Ruby on Rails after a long career in
          Java. She is passionate about building software that is intuitive to
          use and easy to configure, and is taking time out from her startup{" "}
          <a href="https://fflow.io" target="_blank" rel="noopener">
            fflow
          </a>{" "}
          to support Swap My Vote.
        </li>
        <li>
          <a href="http://kuamka.com/" target="_blank" rel="noopener">
            Steve Baxter
          </a>{" "}
          is a software engineer who has been involved in a wide range of
          products and technologies, from life sciences to events management. He
          is interested in the intersection between politics and technology and
          wanted to do something positive instead of just shouting at the
          television.
        </li>
        <li>
          <a
            href="https://www.linkedin.com/in/andyrobertscoder/"
            target="_blank"
            rel="noopener"
          >
            Andy Roberts
          </a>{" "}
          is a developer with a strong ruby bias, and a dabbler in other
          programming languages. A keen amateur music maker, but sadly hobbies
          have now taken a back seat to an obsession with{" "}
          <a
            href="https://notesforukreform.herokuapp.com/"
            title="Notes For An Essay on UK Reform"
            target="_blank"
            rel="noopener"
          >
            improving democracy in the UK.
          </a>
        </li>
      </ul>
      <p>
        Tom and James had the same idea for the platform at different times and{" "}
        <a href="http://blog.swapmyvote.uk/post/116080891268/how-a-blog-post-became-a-platform-for-change">
          met online
        </a>
        . The team still works together almost entirely remotely.
      </p>

      <h2 id="open">How can I trust this app?</h2>
      <p>
        In the interests of transparency,{" "}
        <a href={githubUrl}>our entire codebase</a> is available for peer
        review. You can also scrutinise our{" "}
        <a href={forwardDemocracyPrivacyPolicyUrl}>privacy policy</a>, or if
        those are not sufficient, you are welcome to{" "}
        <Link to={spaPaths.contact}>contact us</Link>.
      </p>
    </StaticPage>
  );
}
