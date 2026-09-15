import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { spaPaths, swapNewPath } from "@/lib/spaPaths";

// vitest runs from the repository root (vitest.config.mts lives there).
const frontendRoot = resolve(process.cwd(), "app/frontend");

/**
 * A screen is not fully ported until nothing links to its *legacy* path.
 * Three separate times a screen was ported and the link to its HAML original
 * was left behind — /user/edit and `/` in the nav, and log out after those —
 * each dropping the user into the Bootstrap 4 site with no route back, and
 * each invisible to a test suite that only asserted the old href.
 *
 * So this is the grep, as a test: every absolute path the view layer links to
 * must be either an /app/* path or a screen that genuinely has no React
 * equivalent yet. Porting a screen and forgetting its old link now fails here.
 *
 * Only the view layer (components/, pages/) is scanned — lib/ and contexts/
 * hold the API paths, which go through apiClient's /api/v1 root and are not
 * navigation. `apiClient` lines are skipped for the handful of call sites that
 * sit in a component.
 */

/** HAML screens with no React equivalent. Remove an entry as it is ported —
 *  and delete the links along with it, which is the point of this test.
 *
 *  Empty as of M10: every user-facing screen is ported, so no link out of the
 *  view layer is legitimate any more. The last four entries went with their
 *  screens — /faq and /api at M9, /users/password/new and
 *  /confirm_account_deletion here. Adding an entry back now means a screen has
 *  genuinely not been ported, not that a link was left behind. */
const UNPORTED_HAML_PATHS = new Set<string>([]);

function viewLayerFiles(): string[] {
  return readdirSync(frontendRoot, {
    recursive: true,
    encoding: "utf8",
  }).filter(
    (file) =>
      /^(components|pages)\//.test(file) &&
      /\.tsx?$/.test(file) &&
      !/\.test\.tsx?$/.test(file),
  );
}

describe("links out of the SPA", () => {
  it("only point at screens that have not been ported yet", () => {
    const offenders: { file: string; path: string }[] = [];

    for (const file of viewLayerFiles()) {
      const source = readFileSync(resolve(frontendRoot, file), "utf8");
      for (const line of source.split("\n")) {
        // apiClient calls are API endpoints, not navigation.
        if (line.includes("apiClient")) {
          continue;
        }
        for (const match of line.matchAll(/"(\/[^"\s]*)"/g)) {
          const path = match[1];
          if (path.startsWith("/app/")) {
            continue;
          }
          // A deep link keeps the anchor; the screen is the part before it.
          const screen = path.split("#")[0];
          if (UNPORTED_HAML_PATHS.has(screen)) {
            continue;
          }
          offenders.push({ file, path });
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("swapNewPath", () => {
  it("fills in the parameter react-router matches as a pattern", () => {
    expect(spaPaths.swapNew).toContain(":userId");
    expect(swapNewPath(42)).toBe("/app/swap/new/42");
  });
});
