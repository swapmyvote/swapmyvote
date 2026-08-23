import type { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  /** Alternating bands, standing in for the legacy .background-pattern /
   *  .plain-pattern classes. */
  tone?: "light" | "white";
  /** Constrain to a reading column, as .container-narrow did. */
  narrow?: boolean;
  centered?: boolean;
}

/**
 * One band of the landing page.
 *
 * The HAML wrapped each band in `.background-pattern` / `.plain-pattern` +
 * `.container`, all defined in the Sprockets stylesheet that the SPA layout
 * does not load — so those class names carried no styling here at all, which
 * is why the bands ran into each other with no spacing.
 *
 * Rebuilt from Bootstrap's own utilities and grid: its spacing scale for the
 * vertical rhythm, and a centred column for the narrow variant, so there is no
 * bespoke spacing or max-width to keep in step with the rest of the site.
 */
export function Section({
  children,
  tone = "light",
  narrow = false,
  centered = false,
}: SectionProps) {
  const background = tone === "light" ? "bg-body-tertiary" : "bg-white";
  const inner = centered ? "text-center" : "";

  // py-4 (1.5rem) rather than py-5: each band has a rule under it, so adjacent
  // bands stack their padding and py-5 put 6rem between one band's content and
  // the next.
  return (
    <section className={`${background} border-bottom py-4`}>
      <div className="container">
        {narrow ? (
          <div className="row justify-content-center">
            <div className={`col-lg-8 col-xl-6 ${inner}`}>{children}</div>
          </div>
        ) : (
          <div className={inner}>{children}</div>
        )}
      </div>
    </section>
  );
}
