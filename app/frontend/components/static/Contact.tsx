import { StaticPage } from "@/components/static/StaticPage";

// Ported from app/views/static_pages/contact.html.haml. Static content page;
// the FAQ is not yet migrated (M2) so it is a full-page <a> to the HAML route,
// matching the Footer, and the email is an external mailto <a>.
export function Contact() {
  return (
    <StaticPage>
      <h2>Contact details</h2>

      <p>
        Before contacting us, please first check our <a href="/faq">FAQ</a> to
        see if your question has already been answered.
      </p>

      <p>
        If it hasn't, please get in touch with us at{" "}
        <a href="mailto:hello@swapmyvote.uk">hello@swapmyvote.uk</a>.
      </p>

      <p>
        We're only a small team of volunteers, but we'll try to get back to you
        as soon as possible.
      </p>

      <p>
        If you're experiencing difficulty using Swap My Vote,{" "}
        <strong>
          please make sure to provide as much detail as possible about the steps
          you took leading up to the problem, and the exact nature of the
          problem.
        </strong>{" "}
        In particular error messages and screenshots / photos are really
        helpful. The more detail we receive, the better the chance we have to
        help you!
      </p>
    </StaticPage>
  );
}
