// The follow-us pair that closes most of the phase screens.
export function SocialLinks({ intro = true }: { intro?: boolean }) {
  return (
    <p className="text-center">
      {intro && (
        <>
          Stay up to date with our future projects and for future elections
          <br />
        </>
      )}
      <a
        href="https://twitter.com/swapmyvote"
        className="button button-twitter"
      >
        Follow us on Twitter
      </a>{" "}
      <a
        href="https://www.facebook.com/swapmyvote"
        className="button button-facebook"
      >
        Like us on Facebook
      </a>
    </p>
  );
}
