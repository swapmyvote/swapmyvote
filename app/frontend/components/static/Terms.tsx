import { Link } from "react-router-dom";
import { StaticPage } from "@/components/static/StaticPage";
import { forwardDemocracyPrivacyPolicyUrl } from "@/lib/externalLinks";
import { staticPaths } from "@/lib/staticPaths";

// Ported from app/views/static_pages/terms.html.haml. The Cookie Policy is
// itself a migrated SPA page (in-SPA <Link>); the privacy policy lives on the
// external Forward Democracy site (<a>).
export function Terms() {
  return (
    <StaticPage>
      <h1>Terms and Conditions of Use</h1>

      <h2>Who we are and how to contact us</h2>

      <p>
        Forward Democracy Limited ("us", "we", or "our") operates the website
        https://www.swapmyvote.uk/, also known here as swapmyvote.
      </p>

      <p>To contact us, please email hello@swapmyvote.uk.</p>

      <h2>Conditions of Use</h2>

      <p>
        By using our website, you confirm that you accept these terms of use and
        that you agree to comply with them.
      </p>

      <p>If you do not agree to these terms, you must not use our website.</p>

      <p>
        We recommend that you keep a copy of these terms for future reference.
      </p>

      <p>
        These terms of use refer to the following additional terms, which also
        apply to your use of our website:
      </p>

      <ul>
        <li>
          Our{" "}
          <a
            href={forwardDemocracyPrivacyPolicyUrl}
            target="_blank"
            rel="noopener"
          >
            Privacy Policy
          </a>
          , which sets out the terms on which we process any personal data we
          collect from you, or that you provide to us. By using our website, you
          consent to such processing and you warrant that all data provided by
          you is accurate.
        </li>
        <li>
          Our <Link to={staticPaths.cookies}>Cookie Policy</Link>, which sets
          out information about the cookies on our website.
        </li>
      </ul>

      <p>We may make changes to these terms.</p>

      <p>
        We amend these terms from time to time. Every time you wish to use our
        website, please check these terms to ensure you understand the terms
        that apply at that time.
      </p>

      <p>We may make changes to our website.</p>

      <p>We may suspend or withdraw our website.</p>

      <p>
        We do not guarantee that our website, or any content on it, will always
        be available or be uninterrupted. We may suspend or withdraw or restrict
        the availability of all or any part of our website for business and
        operational reasons. We will try to give you reasonable notice of any
        suspension or withdrawal.
      </p>

      <p>
        Our website is directed to people residing in the United Kingdom. We do
        not represent that content available on or through our website is
        appropriate for use or available in other locations.
      </p>

      <h2>The content we provide</h2>

      <p>
        The content on our website is provided for general information only. It
        is not intended to amount to advice on which you should rely. You must
        obtain professional or specialist advice before taking, or refraining
        from, any action on the basis of the content on our website.
      </p>

      <p>
        Although we make reasonable efforts to update the information on our
        website, we make no representations, warranties or guarantees, whether
        expressed or implied, that the content on our website is accurate,
        complete or up to date.
      </p>

      <p>We are not responsible for websites we link to.</p>

      <p>
        Where our website contains links to other websites and resources
        provided by third parties, these links are provided for your information
        only. Such links should not be interpreted as approval by us of those
        linked websites or information you may obtain from them.
      </p>

      <p>
        We have no control over the contents of those websites or resources.
      </p>

      <h2>Responsibilities</h2>

      <p>We are not responsible for viruses and you must not introduce them.</p>

      <p>
        We do not guarantee that our website will be secure or free from bugs or
        viruses.
      </p>

      <p>
        You are responsible for configuring your information technology,
        computer programmes and platform to access our website. You should use
        your own virus protection software.
      </p>

      <p>
        You must not misuse our website by knowingly introducing viruses,
        Trojans, worms, logic bombs or other material that is malicious or
        technologically harmful. You must not attempt to gain unauthorised
        access to our website, the server on which our website is stored or any
        server, computer or database connected to our website. You must not
        attack our website via a denial-of-service attack or a distributed
        denial-of- service attack. By breaching this provision, you would commit
        a criminal offence under the Computer Misuse Act 1990. We will report
        any such breach to the relevant law enforcement authorities and we will
        co-operate with those authorities by disclosing your identity to them.
        In the event of such a breach, your right to use our website will cease
        immediately.
      </p>

      <h2>Linking to our website</h2>

      <p>
        You may link to our home page, provided you do so in a way that is fair
        and legal and does not damage our reputation or take advantage of it.
      </p>

      <p>
        You must not establish a link in such a way as to suggest any form of
        association, approval or endorsement on our part where none exists.
      </p>

      <p>
        You must not establish a link to our website in any website that is not
        owned by you.
      </p>

      <p>Our website must not be framed on any other website.</p>

      <p>We reserve the right to withdraw linking permission without notice.</p>

      <h2>Jurisdiction</h2>

      <p>
        These terms of use, their subject matter and their formation, are
        governed by English law. You and we both agree that the courts of
        England and Wales will have exclusive jurisdiction, except that if you
        are a resident of Northern Ireland, you may also bring proceedings in
        Northern Ireland, and if you are resident of Scotland, you may also
        bring proceedings in Scotland.
      </p>

      <p>
        This website and its underlying code are © 2019 Forward Democracy
        Limited
      </p>
    </StaticPage>
  );
}
