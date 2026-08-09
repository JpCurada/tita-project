/**
 * Screenshots the running app for design review.
 *
 *   node scripts/shoot.mjs <outDir> [baseUrl]
 */
import { chromium } from "playwright";
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const outDir = process.argv[2] ?? ".";
const base = process.argv[3] ?? "http://localhost:3117";
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = /NEXT_PUBLIC_CONVEX_URL=(.+)/.exec(env)[1].trim();

const cli = fileURLToPath(
  new URL("../node_modules/convex/bin/main.js", import.meta.url),
);
const run = (name, args = {}) => {
  const out = execFileSync(
    process.execPath,
    [cli, "run", name, JSON.stringify(args)],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
};

const stamp = Date.now();
const pw = "TestPassword123!";
const clients = [];

async function account(email) {
  const client = new ConvexClient(url);
  const res = await client.action(api.auth.signIn, {
    provider: "password",
    params: { email, password: pw, flow: "signUp" },
  });
  client.setAuth(async () => res.tokens.token);
  clients.push(client);
  await client.mutation(api.members.claimProfile, {});
  return client;
}

console.log("Seeding…");
run("testing:reset");

const people = [
  ["borrower", "Juan", "Dela Cruz", "member", true],
  ["comaker", "Maria", "Santos", "member", true],
  ["c1", "Geryl", "Cataraja", "committee1", true],
  ["c2", "Albert", "Sanico", "committee2", true],
  ["chair", "Sansino Rian", "Guanzon", "chair", true],
  ["treasurer", "Rosa", "Lim", "treasurer", true],
];
const session = {};
const emails = {};
for (const [key, first, last, role, permanent] of people) {
  const email = `${key}.${stamp}@pit.test`;
  emails[key] = email;
  run("testing:seedMember", {
    firstName: first,
    lastName: last,
    email,
    role,
    isPermanent: permanent,
  });
  session[key] = await account(email);
}

const coMakers = await session.borrower.query(api.applications.eligibleCoMakers, {});
const maria = coMakers.find((m) => m.name === "Maria Santos");

// In-progress loan for the borrower: one committee approval in, one to go.
const live = await session.borrower.mutation(api.applications.submit, {
  coMakerMemberId: maria._id,
  loanType: "regular",
  loanAmount: 12000,
  deductionPerPayday: 1200,
});
await session.c1.mutation(api.applications.castDecision, {
  applicationId: live,
  decision: "approved",
  remarks: "Complete requirements. No outstanding balance on record.",
});

// A few more so the queue and archive have body.
for (const [i, amount] of [6000, 18000, 6000].entries()) {
  const email = `extra${i}.${stamp}@pit.test`;
  run("testing:seedMember", {
    firstName: ["Elena", "Ramon", "Teresita"][i],
    lastName: ["Bautista", "Villanueva", "Ocampo"][i],
    email,
    role: "member",
    isPermanent: true,
  });
  const client = await account(email);
  const id = await client.mutation(api.applications.submit, {
    coMakerMemberId: maria._id,
    loanType: i === 1 ? "emergency" : "regular",
    loanAmount: amount,
    deductionPerPayday: amount / 10,
  });
  if (i === 0) {
    // Fully approved and released → archive, approved.
    await session.c1.mutation(api.applications.castDecision, { applicationId: id, decision: "approved" });
    await session.c2.mutation(api.applications.castDecision, { applicationId: id, decision: "approved" });
    await session.chair.mutation(api.applications.castDecision, { applicationId: id, decision: "approved" });
    await session.treasurer.mutation(api.applications.recordRelease, {
      applicationId: id,
      releasedAmount: amount,
      releasedAt: Date.now(),
    });
  }
  if (i === 1) {
    // Disapproved → archive, rejected.
    await session.c1.mutation(api.applications.castDecision, {
      applicationId: id,
      decision: "rejected",
      remarks: "Co-maker already stands on two active loans.",
    });
  }
  if (i === 2) {
    // Waiting on the chair.
    await session.c1.mutation(api.applications.castDecision, { applicationId: id, decision: "approved" });
    await session.c2.mutation(api.applications.castDecision, { applicationId: id, decision: "approved" });
  }
}

console.log("Shooting…");
const browser = await chromium.launch();

async function shoot(name, path, email, viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  if (email) {
    await page.goto(`${base}/signin`);
    await page.fill("#email", email);
    await page.fill("#password", pw);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 30000 }).catch(() => {});
  }
  await page.goto(`${base}${path}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  console.log(`  ${name}.png`);
  await ctx.close();
}

await shoot("01-signin", "/signin", null);
await shoot("02-dashboard", "/dashboard", emails.borrower);
await shoot("03-detail", `/dashboard/${live}`, emails.borrower);
await shoot("04-apply", "/apply", emails.comaker);
await shoot("05-queue", "/queue", emails.c2);
await shoot("06-review", `/queue/${live}`, emails.c2);
await shoot("07-archive", "/archive", emails.chair);
await shoot("08-members", "/members", emails.chair);
await shoot("09-release", "/release", emails.treasurer);
await shoot("10-mobile-dashboard", "/dashboard", emails.borrower, {
  width: 390,
  height: 844,
});

await browser.close();
for (const c of clients) await c.close();
console.log("Done.");
