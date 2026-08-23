#!/usr/bin/env node
//
// Deploy the current checkout to a Heroku app via "Deploy using Heroku Git".
//
//   node scripts/heroku-deploy.mjs staging      -> swapmyvotedev
//   node scripts/heroku-deploy.mjs production   -> swapmyvote
//
// Usually invoked through yarn: `corepack yarn deploy:staging` / `deploy:production`.
//
// Heroku builds whatever lands on its `master` branch, so we push the current
// HEAD there. Staging is force-pushed, because a feature branch is normally not
// a descendant of whatever was deployed last. Production refuses anything but a
// clean local `master` that matches origin/master, and asks for confirmation.

import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const targets = {
  staging: { app: "swapmyvotedev", force: true },
  production: { app: "swapmyvote", force: false },
};

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", ...options });
}

function capture(command, args) {
  const result = run(command, args);
  if (result.status !== 0) {
    fail(`\`${command} ${args.join(" ")}\` failed:\n${result.stderr?.trim()}`);
  }
  return result.stdout.trim();
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

async function confirm(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

const target = process.argv[2];
const config = targets[target];

if (!config) {
  fail("usage: node scripts/heroku-deploy.mjs {staging|production}", 64);
}

if (run("heroku", ["--version"]).status !== 0) {
  fail(
    "The Heroku CLI is not installed (brew install heroku/brew/heroku).",
    69,
  );
}

if (run("heroku", ["auth:whoami"]).status !== 0) {
  fail("Not logged in to Heroku. Run: heroku login", 77);
}

if (capture("git", ["status", "--porcelain"]) !== "") {
  fail(
    "Working tree is dirty. Heroku deploys the committed HEAD, not your " +
      "uncommitted changes. Commit or stash them first.",
  );
}

const branch = capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
const sha = capture("git", ["rev-parse", "--short", "HEAD"]);

if (target === "production") {
  if (branch !== "master") {
    fail(
      `Refusing to deploy '${branch}' to production; check out master first.`,
    );
  }

  capture("git", ["fetch", "origin", "master", "--quiet"]);
  if (
    capture("git", ["rev-parse", "HEAD"]) !==
    capture("git", ["rev-parse", "origin/master"])
  ) {
    fail("Local master is not identical to origin/master. Pull/push first.");
  }

  console.log(`About to deploy master (${sha}) to PRODUCTION (${config.app}).`);
  if ((await confirm("Type the app name to confirm: ")) !== config.app) {
    fail("Aborted.");
  }
}

console.log(`Deploying ${branch} (${sha}) to ${config.app} ...`);

const push = run(
  "git",
  [
    "push",
    ...(config.force ? ["--force"] : []),
    `https://git.heroku.com/${config.app}.git`,
    "HEAD:refs/heads/master",
  ],
  { stdio: "inherit", encoding: undefined },
);

if (push.status !== 0) {
  fail(`\nDeploy to ${config.app} failed.`, push.status ?? 1);
}

run("heroku", ["releases", "-a", config.app, "-n", "1"], {
  stdio: "inherit",
  encoding: undefined,
});
console.log(`\nLogs:  heroku logs -a ${config.app} --tail`);
console.log(`Open:  heroku open -a ${config.app}`);
