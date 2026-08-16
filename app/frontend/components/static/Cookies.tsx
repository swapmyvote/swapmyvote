import Table from "react-bootstrap/Table";
import { StaticPage } from "@/components/static/StaticPage";
import { FORWARD_DEMOCRACY_PRIVACY_POLICY_URL } from "@/lib/externalLinks";

// Ported from app/views/static_pages/cookies.html.haml.
export function Cookies() {
  return (
    <StaticPage>
      <h1>Cookie Policy</h1>

      <p>
        Cookies are files with small amount of data which may include an
        anonymous unique identifier. Cookies are sent to your browser from a
        website and stored on your device. Tracking technologies also used are
        beacons, tags, and scripts to collect and track information and to
        improve and analyze swapmyvote.
      </p>

      <p>
        You can instruct your browser to refuse all cookies or to indicate when
        a cookie is being sent. However, if you do not accept cookies, you may
        not be able to use some portions of our Service. You can learn more how
        to manage cookies in the{" "}
        <a
          href="https://privacypolicies.com/blog/how-to-delete-cookies/"
          target="_blank"
          rel="noopener"
        >
          Browser Cookies Guide
        </a>
        .
      </p>

      <h3>Types of cookie</h3>

      <p>We use the following types of cookie:</p>

      <dl>
        <dt>Essential cookies</dt>
        <dd>
          These are cookies that are required for the operation of our website.
          They include, for example, cookies that enable you to log in to secure
          areas of our website, and access features specific to you.
        </dd>

        <dt>Analytical cookies</dt>
        <dd>
          These allow us to recognise and count the number of visitors and to
          see how visitors move around our website when they are using it. This
          helps us to improve the way our website works, for example, by
          ensuring that users are finding what they are looking for easily.
        </dd>

        <dt>Functionality cookies</dt>
        <dd>
          These are used to recognise you when you return to our website. This
          enables us to personalise our content for you. Currently we only use a
          functionality cookie to record whether you have consented to the use
          of cookies, but in the future we may use more to do things such as
          greet you by name and remember your preferences (for example, your
          choice of language or region).
        </dd>
      </dl>

      <h3>Cookie list</h3>

      <Table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Session</td>
            <td>
              <code>_swapmyvote_session</code>
            </td>
            <td>
              This cookie is essential since it allows us to associate you with
              both your login information and your preferences.
            </td>
          </tr>
          <tr>
            <td>Cookie consent</td>
            <td>
              <code>_swapmyvote_cookie_consent</code>
            </td>
            <td>
              The cookie consent cookie means you have accepted cookies, so that
              we hide the annoying "accept cookies" message.
            </td>
          </tr>
          <tr>
            <td>Google Analytics</td>
            <td>
              <code>_ga</code>
            </td>
            <td>
              The Google Analytics cookie allows us to store anonymised data for
              our analytics of how the website is used.
            </td>
          </tr>
        </tbody>
      </Table>

      <h3>Privacy policy</h3>

      <p>
        See also{" "}
        <a
          href={FORWARD_DEMOCRACY_PRIVACY_POLICY_URL}
          target="_blank"
          rel="noopener"
        >
          our privacy policy
        </a>{" "}
        for full details of how we manage personal data.
      </p>
    </StaticPage>
  );
}
