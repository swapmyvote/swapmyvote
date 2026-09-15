import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * globals.scss imports a curated subset of Bootstrap's partials rather than
 * all of Bootstrap, to keep the bundle down. The hazard is that the list is
 * maintained by hand: `Alert` shipped without `bootstrap/scss/alert`, so every
 * <Alert> in the SPA — error summaries included — rendered as plain body text
 * with no background, border or colour, and nothing failed.
 *
 * This locks the two together: import a react-bootstrap component and you must
 * import the partial that styles it.
 */

// vitest runs from the repository root (vitest.config.mts lives there).
const frontendRoot = resolve(process.cwd(), "app/frontend");

/** react-bootstrap component -> the Bootstrap partial that styles it. */
const REQUIRED_PARTIAL: Record<string, string> = {
  Alert: "alert",
  Badge: "badge",
  Button: "buttons",
  Card: "card",
  CloseButton: "close",
  Dropdown: "dropdown",
  Form: "forms",
  InputGroup: "forms",
  ListGroup: "list-group",
  Modal: "modal",
  Nav: "nav",
  Navbar: "navbar",
  Offcanvas: "offcanvas",
  Pagination: "pagination",
  Placeholder: "placeholders",
  ProgressBar: "progress",
  Spinner: "spinners",
  Table: "tables",
  Toast: "toasts",
  Tooltip: "tooltip",
};

// Purely structural (Col/Container/Row are grid/containers, covered below and
// exercised on every page), so they need no per-component entry.
const LAYOUT_COMPONENTS = new Set(["Col", "Container", "Row", "Stack"]);

function importedComponents(): string[] {
  const files = readdirSync(frontendRoot, {
    recursive: true,
    encoding: "utf8",
  }).filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));

  const found = new Set<string>();
  for (const file of files) {
    const source = readFileSync(resolve(frontendRoot, file), "utf8");
    for (const match of source.matchAll(/from "react-bootstrap\/(\w+)"/g)) {
      found.add(match[1]);
    }
  }
  return [...found].sort();
}

function importedPartials(): string[] {
  const scss = readFileSync(
    resolve(frontendRoot, "styles/globals.scss"),
    "utf8",
  );
  return [...scss.matchAll(/@import "bootstrap\/scss\/([\w/-]+)"/g)].map(
    (match) => match[1],
  );
}

describe("globals.scss Bootstrap partials", () => {
  it("imports the partial for every react-bootstrap component in use", () => {
    const partials = importedPartials();

    const missing = importedComponents()
      .filter((component) => !LAYOUT_COMPONENTS.has(component))
      .map((component) => ({
        component,
        partial: REQUIRED_PARTIAL[component],
      }))
      .filter(
        ({ partial }) => partial === undefined || !partials.includes(partial),
      );

    expect(missing).toEqual([]);
  });

  it("imports the partials the layout itself depends on", () => {
    const partials = importedPartials();

    for (const partial of ["reboot", "grid", "containers", "helpers"]) {
      expect(partials).toContain(partial);
    }
  });

  // `$theme-colors` has colours removed from it to trim the generated CSS.
  // "warning" was removed while seven components still asked for
  // `variant="warning"`, so those alerts and buttons came out with no colour
  // at all — the same silent failure as the missing partial above.
  it("keeps every theme colour a component still asks for", () => {
    const scss = readFileSync(
      resolve(frontendRoot, "styles/globals.scss"),
      "utf8",
    );
    const removed = /map-remove\(\s*\$theme-colors\s*,([^)]*)\)/.exec(scss);
    const removedNames = (removed?.[1] ?? "")
      .split(",")
      .map((name) => name.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);

    const files = readdirSync(frontendRoot, {
      recursive: true,
      encoding: "utf8",
    }).filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));

    const used = new Set<string>();
    for (const file of files) {
      const source = readFileSync(resolve(frontendRoot, file), "utf8");
      for (const match of source.matchAll(/variant="(?:outline-)?([a-z]+)"/g)) {
        used.add(match[1]);
      }
    }

    expect([...used].filter((name) => removedNames.includes(name))).toEqual([]);
  });
});
